import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/error_view.dart';
import '../../core/format.dart';
import '../catalog/widgets/catalog_image.dart';
import 'collection_changes_data.dart';

/// Cars that have left the collection.
///
/// The web app gives each reason its own menu page; on a phone that would be
/// five taps deep in a bottom nav that is already full, so this is one screen
/// with a filter chip per reason instead.
class CollectionChangesScreen extends ConsumerStatefulWidget {
  const CollectionChangesScreen({super.key});

  @override
  ConsumerState<CollectionChangesScreen> createState() =>
      _CollectionChangesScreenState();
}

class _CollectionChangesScreenState
    extends ConsumerState<CollectionChangesScreen> {
  /// null = All
  String? _reason;
  String _search = '';
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(collectionChangesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Collection changes')),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(collectionChangesProvider.future),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => AppErrorView(
            error: e,
            onRetry: () => ref.invalidate(collectionChangesProvider),
          ),
          data: _buildList,
        ),
      ),
    );
  }

  Widget _buildList(List<CollectionChange> all) {
    final theme = Theme.of(context);

    final filtered = all.where((c) {
      if (_reason != null && c.reason != _reason) return false;
      if (_search.isEmpty) return true;
      return c.searchText.contains(_search.toLowerCase());
    }).toList();

    // Summary reflects the current filter, so switching to Gifted answers
    // "how many have I given away" rather than restating the overall total.
    final scope = all.where((c) => _reason == null || c.reason == _reason);
    final unitsGone = scope
        .where((c) => c.isActive)
        .fold<int>(0, (s, c) => s + c.quantity);
    final profit = scope
        .where((c) => c.isRealisedSale)
        .fold<double>(0, (s, c) => s + c.netProfit);
    final showProfit = _reason == null || _reason == 'sold' || _reason == 'trade';

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _chip('All', null),
              for (final r in collectionChangeReasons)
                _chip(r.label, r.value),
            ],
          ),
        ),
        const SizedBox(height: 12),

        TextField(
          controller: _searchController,
          onChanged: (v) => setState(() => _search = v),
          decoration: InputDecoration(
            hintText: 'Search car, brand, or who got it',
            prefixIcon: const Icon(Icons.search, size: 20),
            isDense: true,
            border: const OutlineInputBorder(),
            suffixIcon: _search.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.clear, size: 18),
                    onPressed: () {
                      _searchController.clear();
                      setState(() => _search = '');
                    },
                  ),
          ),
        ),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: _stat(
                'Cars gone',
                '$unitsGone',
                theme.colorScheme.primary,
              ),
            ),
            if (showProfit) ...[
              const SizedBox(width: 12),
              Expanded(
                child: _stat(
                  'Profit from sales',
                  formatMoney(profit),
                  profit < 0 ? theme.colorScheme.error : theme.colorScheme.primary,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 16),

        if (filtered.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 48),
            child: Center(
              child: Text(
                _search.isNotEmpty
                    ? 'Nothing matches "$_search"'
                    : 'Nothing here yet',
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.outline),
              ),
            ),
          )
        else
          for (final c in filtered) _ChangeCard(change: c),
      ],
    );
  }

  Widget _chip(String label, String? value) {
    final selected = _reason == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => setState(() => _reason = value),
      ),
    );
  }

  Widget _stat(String label, String value, Color color) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: theme.textTheme.bodySmall),
          const SizedBox(height: 2),
          Text(
            value,
            style: theme.textTheme.titleLarge
                ?.copyWith(color: color, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

class _ChangeCard extends StatelessWidget {
  const _ChangeCard({required this.change});
  final CollectionChange change;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final c = change;
    final returned = !c.isActive;

    final where = [
      c.reasonWord,
      c.counterparty,
      if (c.reason == 'sold' && c.grossAmount > 0) formatMoney(c.grossAmount),
      formatIsoDate(c.disposalDate),
      if (c.quantity > 1) '×${c.quantity}',
    ].whereType<String>().join(' · ');

    final bought = [
      'Paid ${formatMoney(c.costPerUnit)} each',
      if (c.shopName != null) 'from ${c.shopName}',
      if (c.purchaseDate != null) 'on ${formatIsoDate(c.purchaseDate)}',
    ].join(' · ');

    return Opacity(
      opacity: returned ? 0.55 : 1,
      child: Card(
        elevation: 0,
        margin: const EdgeInsets.only(bottom: 10),
        color: theme.colorScheme.surfaceContainerHighest,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: SizedBox(
                      width: 72,
                      height: 72,
                      child: CatalogImage(sources: c.imageSources),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c.collectionName,
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 2),
                        Text(
                          [c.brandName, c.itemNo].whereType<String>().join(' · '),
                          style: theme.textTheme.bodySmall
                              ?.copyWith(color: theme.colorScheme.outline),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            _tag(context, c.badge,
                                theme.colorScheme.onSurfaceVariant),
                            if (c.isChase)
                              _tag(context, 'CHASE', theme.colorScheme.error),
                            if (returned)
                              _tag(context, 'RETURNED',
                                  theme.colorScheme.tertiary),
                            if (c.reason == 'sold' &&
                                c.isActive &&
                                c.paymentStatus == 'pending')
                              _tag(context, 'WAITING FOR MONEY',
                                  theme.colorScheme.tertiary),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (c.isMoneyReason)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          formatMoney(c.netProfit),
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: c.netProfit < 0
                                ? theme.colorScheme.error
                                : theme.colorScheme.primary,
                          ),
                        ),
                        Text(
                          c.isRealisedSale ? 'profit' : 'not counted',
                          style: theme.textTheme.bodySmall
                              ?.copyWith(color: theme.colorScheme.outline),
                        ),
                      ],
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Text(where,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.outline)),
              if (c.remark != null && c.remark!.isNotEmpty)
                Text(c.remark!,
                    style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.outline,
                        fontStyle: FontStyle.italic)),
              const SizedBox(height: 4),
              Text(bought,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.outline)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tag(BuildContext context, String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(text,
            style: TextStyle(
                fontSize: 10, color: color, fontWeight: FontWeight.w600)),
      );
}
