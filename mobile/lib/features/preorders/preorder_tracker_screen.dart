import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

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
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 40),
                const SizedBox(height: 12),
                Text('Could not load pre-orders.\n$e', textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton.tonal(
                  onPressed: () => ref.invalidate(poItemsProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
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

    final groups = _groupsForTab(_showCancelled ? cancelled : active);

    return RefreshIndicator(
      onRefresh: () async => ref.refresh(poItemsProvider.future),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(child: _summary('Awaiting', '$awaiting', Colors.orange)),
              const SizedBox(width: 8),
              Expanded(child: _summary('Ready', '$ready', Colors.green)),
              const SizedBox(width: 8),
              Expanded(
                  child: _summary('Balance due', formatMoney(balanceDue), Colors.red,
                      small: true)),
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
                : (s) => setState(() => _tab = s.first),
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
                onSelected: (v) => setState(() => _showCancelled = v),
              ),
            ],
          ),
          const SizedBox(height: 12),

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value,
              style: (small ? theme.textTheme.titleMedium : theme.textTheme.headlineSmall)
                  ?.copyWith(color: color, fontWeight: FontWeight.bold)),
          Text(label,
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
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
                if (header.poReference != null)
                  Text(header.poReference!,
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: theme.colorScheme.outline)),
                if (header.poSourceLink != null)
                  IconButton(
                    icon: const Icon(Icons.open_in_new, size: 18),
                    tooltip: 'Open order link',
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
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    it.itemNo != null ? '${it.itemNo} — ${it.collectionName}' : it.collectionName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
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
