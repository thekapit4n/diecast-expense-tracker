import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/error_view.dart';
import '../../core/format.dart';
import '../../core/po_status.dart';
import '../../data/models/po_item.dart';
import 'po_status_sheet.dart';
import 'preorder_providers.dart';

class PreorderTrackerScreen extends ConsumerStatefulWidget {
  const PreorderTrackerScreen({super.key});

  @override
  ConsumerState<PreorderTrackerScreen> createState() => _PreorderTrackerScreenState();
}

class _PreorderTrackerScreenState extends ConsumerState<PreorderTrackerScreen> {
  final _searchCtrl = TextEditingController();
  String _search = '';
  OrderTab _tab = OrderTab.pending;
  bool _showCancelled = false;
  final Set<String> _selected = {};

  /// Bulk-collect selection is only offered on the Ready tab.
  bool get _selectionMode => _tab == OrderTab.ready && !_showCancelled;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(poItemsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Pre-order Tracker')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AppErrorView(
          error: e,
          onRetry: () => ref.invalidate(poItemsProvider),
        ),
        data: (items) => _build(items),
      ),
    );
  }

  Widget _build(List<PoItem> allItems) {
    final active = allItems.where((i) => i.preOrderStatus != 'cancelled').toList();
    final cancelled = allItems.where((i) => i.preOrderStatus == 'cancelled').toList();

    // Summary (from active items).
    final awaiting =
        active.where((i) => i.readyDate == null && i.collectedDate == null).length;
    final ready =
        active.where((i) => i.readyDate != null && i.collectedDate == null).length;
    final balanceDue = active.fold<double>(
        0,
        (s, i) => s +
            balanceForItem(
              collectedDate: i.collectedDate,
              totalPrice: i.totalPrice,
              amountPaid: i.amountPaid,
            ));
    // Total pre-order items still in the pipeline (not yet collected).
    final totalPreorders =
        active.where((i) => i.collectedDate == null).length;

    final groups = _groupsForTab(_showCancelled ? cancelled : active);

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(poItemsProvider.future),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                  child: _summary('Total pre-orders', '$totalPreorders', Colors.blue)),
              const SizedBox(width: 8),
              Expanded(
                  child: _summary('Balance due', formatMoney(balanceDue), Colors.red,
                      small: true)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _summary('Awaiting', '$awaiting', Colors.orange)),
              const SizedBox(width: 8),
              Expanded(child: _summary('Ready', '$ready', Colors.green)),
            ],
          ),
          const SizedBox(height: 16),

          // Tabs.
          SegmentedButton<OrderTab>(
            segments: const [
              ButtonSegment(value: OrderTab.pending, label: Text('Pending')),
              ButtonSegment(value: OrderTab.ready, label: Text('Ready')),
              ButtonSegment(value: OrderTab.collected, label: Text('Collected')),
            ],
            selected: {_tab},
            onSelectionChanged: _showCancelled
                ? null
                : (s) => setState(() {
                      _tab = s.first;
                      _selected.clear();
                    }),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchCtrl,
                  onChanged: (v) => setState(() => _search = v),
                  decoration: InputDecoration(
                    hintText: 'Search name or item no…',
                    prefixIcon: const Icon(Icons.search),
                    isDense: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilterChip(
                label: Text('Cancelled (${_countGroups(cancelled)})'),
                selected: _showCancelled,
                onSelected: (v) => setState(() {
                  _showCancelled = v;
                  _selected.clear();
                }),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (_selectionMode && groups.isNotEmpty)
            _bulkBar(groups.expand((g) => g).toList()),

          if (groups.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 48),
              child: Center(
                child: Text(
                  _showCancelled
                      ? 'No cancelled orders.'
                      : 'Nothing here in this tab.',
                  style: TextStyle(color: Theme.of(context).colorScheme.outline),
                ),
              ),
            )
          else
            ...groups.map(_orderCard),
        ],
      ),
    );
  }

  /// Select-all + "mark selected as collected" controls, shown on the Ready tab.
  Widget _bulkBar(List<PoItem> shownItems) {
    final ids = shownItems.map((i) => i.id).toList();
    final allSelected = ids.isNotEmpty && ids.every(_selected.contains);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        border: Border.all(
            color: Theme.of(context).colorScheme.outlineVariant, width: 1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Checkbox(
            value: allSelected,
            onChanged: (_) => setState(() {
              if (allSelected) {
                _selected.clear();
              } else {
                _selected.addAll(ids);
              }
            }),
          ),
          Expanded(
            child: Text(
              _selected.isEmpty
                  ? 'Select all ${ids.length}'
                  : '${_selected.length} selected',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          if (_selected.isNotEmpty)
            FilledButton.icon(
              onPressed: () => _bulkCollect(shownItems),
              icon: const Icon(Icons.inventory_2_outlined, size: 18),
              label: const Text('Collect'),
            ),
        ],
      ),
    );
  }

  Future<void> _bulkCollect(List<PoItem> shownItems) async {
    final targets = shownItems.where((i) => _selected.contains(i.id)).toList();
    if (targets.isEmpty) return;

    final method = await _showBulkCollectSheet(targets);
    if (method == null) return; // cancelled

    try {
      final repo = ref.read(purchaseRepositoryProvider);
      await Future.wait(
          targets.map((t) => repo.markCollected(t, paymentMethod: method)));
      _selected.clear();
      ref.invalidate(poItemsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Marked ${targets.length} item(s) as collected')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    }
  }

  /// Itemised confirm sheet (mirrors the web BulkCollectDialog). Returns the
  /// chosen payment method ('none' = not specified), or null if cancelled.
  Future<String?> _showBulkCollectSheet(List<PoItem> targets) {
    final total = targets.fold<double>(0, (s, i) => s + i.totalPrice);
    final shops = targets.map((i) => i.shopName).whereType<String>().toSet();
    final subtitle = shops.length == 1
        ? '${targets.length} items at ${shops.first}'
        : '${targets.length} items';
    var method = 'none';

    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (sheetCtx, setSheet) {
          final theme = Theme.of(sheetCtx);
          return DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.75,
            maxChildSize: 0.92,
            minChildSize: 0.4,
            builder: (ctx, controller) => ListView(
              controller: controller,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              children: [
                Text('Mark as collected', style: theme.textTheme.titleLarge),
                Text(subtitle,
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(color: theme.colorScheme.outline)),
                const SizedBox(height: 12),
                ...targets.map((t) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              t.itemNo != null
                                  ? '${t.itemNo} — ${t.collectionName}'
                                  : t.collectionName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              softWrap: false,
                              style: const TextStyle(fontSize: 13),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(formatMoney(t.totalPrice),
                              style: theme.textTheme.bodySmall
                                  ?.copyWith(color: theme.colorScheme.outline)),
                        ],
                      ),
                    )),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text(formatMoney(total),
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 20),
                Text('How did you pay for this visit?',
                    style: theme.textTheme.titleSmall),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: method,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: 'none', child: Text('Not specified')),
                    DropdownMenuItem(value: 'cash', child: Text('Cash')),
                    DropdownMenuItem(value: 'qr_payment', child: Text('QR Payment')),
                    DropdownMenuItem(value: 'credit_card', child: Text('Credit Card')),
                    DropdownMenuItem(value: 'fpx', child: Text('FPX')),
                  ],
                  onChanged: (v) => setSheet(() => method = v ?? 'none'),
                ),
                const SizedBox(height: 8),
                Text(
                  'Applies to all ${targets.length} items — each will be marked paid in full and collected today.',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.outline),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(sheetCtx),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        onPressed: () => Navigator.pop(sheetCtx, method),
                        child: Text('Mark ${targets.length} as collected'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  int _countGroups(List<PoItem> items) =>
      items.map((i) => i.poOrderId).toSet().length;

  /// Groups items by PO order, filtered by the current tab + search.
  List<List<PoItem>> _groupsForTab(List<PoItem> source) {
    final q = _search.trim().toLowerCase();
    final filtered = q.isEmpty
        ? source
        : source
            .where((i) =>
                i.collectionName.toLowerCase().contains(q) ||
                (i.itemNo ?? '').toLowerCase().contains(q))
            .toList();

    final map = <String, List<PoItem>>{};
    for (final i in filtered) {
      (map[i.poOrderId] ??= []).add(i);
    }

    final groups = map.values.where((g) {
      if (_showCancelled) return true;
      return orderTabForGroup(
              g.map((i) => (readyDate: i.readyDate, collectedDate: i.collectedDate)).toList()) ==
          _tab;
    }).toList();

    // Newest order date first; undated sink to the bottom.
    groups.sort((a, b) {
      final da = a.first.poOrderDate, db = b.first.poOrderDate;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return db.compareTo(da);
    });
    return groups;
  }

  Widget _summary(String label, String value, Color color, {bool small = false}) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value,
                maxLines: 1,
                style: (small ? theme.textTheme.titleMedium : theme.textTheme.headlineSmall)
                    ?.copyWith(color: color, fontWeight: FontWeight.bold)),
          ),
          Text(label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              softWrap: false,
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.outline)),
        ],
      ),
    );
  }

  Widget _orderCard(List<PoItem> items) {
    final theme = Theme.of(context);
    final header = items.first;
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      color: theme.colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(header.shopName ?? 'Unknown seller',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      softWrap: false,
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
                if (header.poReference != null) ...[
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(header.poReference!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        softWrap: false,
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: theme.colorScheme.outline)),
                  ),
                ],
                if (header.poSourceLink != null)
                  IconButton(
                    icon: const Icon(Icons.open_in_new, size: 18),
                    tooltip: 'Open order link',
                    visualDensity: VisualDensity.compact,
                    onPressed: () => _openLink(header.poSourceLink!),
                  ),
              ],
            ),
            if (header.poEta != null || header.poCloseDate != null)
              Text(
                [
                  if (header.poEta != null) 'ETA ${header.poEta}',
                  if (header.poCloseDate != null) 'closes ${header.poCloseDate}',
                ].join(' · '),
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: theme.colorScheme.outline),
              ),
            const SizedBox(height: 4),
            ...items.map((it) => _itemRow(it)),
            const Divider(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${items.length} item${items.length > 1 ? 's' : ''}',
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: theme.colorScheme.outline)),
                Text(
                  formatMoney(items.fold<double>(0, (s, i) => s + i.totalPrice)),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _itemRow(PoItem it) {
    final theme = Theme.of(context);
    final stage = poStage(
      paymentStatus: it.paymentStatus,
      readyDate: it.readyDate,
      collectedDate: it.collectedDate,
    );
    final (label, color) = _stageStyle(stage, theme);

    return InkWell(
      onTap: () async {
        final changed = await showPoStatusSheet(context, ref, it);
        if (changed == true) ref.invalidate(poItemsProvider);
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            if (_selectionMode)
              Checkbox(
                value: _selected.contains(it.id),
                onChanged: (v) => setState(() {
                  if (v == true) {
                    _selected.add(it.id);
                  } else {
                    _selected.remove(it.id);
                  }
                }),
              ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    it.itemNo != null ? '${it.itemNo} — ${it.collectionName}' : it.collectionName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    softWrap: false,
                    style: const TextStyle(fontSize: 13),
                  ),
                  Text(
                    [
                      formatMoney(it.totalPrice),
                      if (it.quantity > 1) '×${it.quantity}',
                    ].join(' · '),
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: theme.colorScheme.outline),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(label,
                  style: TextStyle(
                      fontSize: 11, color: color, fontWeight: FontWeight.w600)),
            ),
            const Icon(Icons.chevron_right, size: 18),
          ],
        ),
      ),
    );
  }

  (String, Color) _stageStyle(PoStage s, ThemeData theme) => switch (s) {
        PoStage.collected => ('Collected', Colors.green),
        PoStage.ready => ('Ready', Colors.teal),
        PoStage.paid => ('Paid', Colors.blue),
        PoStage.partial => ('Partial', Colors.orange),
        PoStage.preorder => ('Pre-order', theme.colorScheme.outline),
      };

  Future<void> _openLink(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Could not open link')));
    }
  }
}
