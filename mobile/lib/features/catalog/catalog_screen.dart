import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/error_view.dart';
import '../../data/models/catalog_item.dart';
import '../shell/nav_intent.dart';
import 'catalog_data.dart';
import 'item_detail_sheet.dart';
import 'widgets/diecast_card.dart';
import 'widgets/filter_sheet.dart';

enum _OwnFilter { all, owned, preorder }

const _ownOptions = [
  ('all', 'All'),
  ('owned', 'Owned'),
  ('preorder', 'Pre-order'),
];

const _typeOptions = [
  ('chase', 'Chase'),
  ('event_car', 'Event Car'),
  ('black_edition', 'Black Edition'),
  ('limited_edition', 'Limited Edition'),
];

class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({super.key});

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  final _searchCtrl = TextEditingController();
  String _search = '';
  Set<String> _brands = {}; // empty = All
  bool _brandInitialised = false;
  _OwnFilter _own = _OwnFilter.all;
  Set<String> _types = {};

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  bool get _anyFilterActive =>
      _brands.isNotEmpty || _own != _OwnFilter.all || _types.isNotEmpty;

  void _clearAllFilters() => setState(() {
        _brands = {};
        _own = _OwnFilter.all;
        _types = {};
      });

  List<CatalogItem> _apply(List<CatalogItem> items) {
    final q = _search.trim().toLowerCase();
    final terms = q.split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toList();

    return items.where((it) {
      if (_brands.isNotEmpty && !_brands.contains(it.brandName)) return false;
      switch (_own) {
        case _OwnFilter.owned:
          if (!it.isOwnedTile) return false;
        case _OwnFilter.preorder:
          if (!it.isPreOrderTile) return false;
        case _OwnFilter.all:
          break;
      }
      if (_types.isNotEmpty) {
        final itemTypes = {if (it.isChase) 'chase', ...it.editionTypes};
        if (_types.intersection(itemTypes).isEmpty) return false;
      }
      if (terms.isNotEmpty && q.length >= 2) {
        final hay = '${it.name} ${it.itemNo ?? ''}'.toLowerCase();
        if (!terms.every(hay.contains)) return false;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(catalogProvider);

    // A "Models owned" dashboard-card tap lands here with Owned pre-applied.
    ref.listen<HomeNavTarget?>(homeNavIntentProvider, (previous, next) {
      if (next != HomeNavTarget.catalogOwned) return;
      setState(() => _own = _OwnFilter.owned);
      ref.read(homeNavIntentProvider.notifier).clear();
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Catalog')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AppErrorView(
          error: e,
          onRetry: () => ref.invalidate(catalogProvider),
        ),
        data: (data) {
          // Default to Mini GT the first time, like the web.
          if (!_brandInitialised) {
            if (data.defaultBrand != null) _brands = {data.defaultBrand!};
            _brandInitialised = true;
          }
          final filtered = _apply(data.items);
          final availableTypes = _typeOptions
              .where((t) => t.$1 == 'chase'
                  ? data.items.any((i) => i.isChase)
                  : data.items.any((i) => i.editionTypes.contains(t.$1)))
              .toList();

          return Column(
            children: [
              _searchBar(),
              _filterBar(data.brands, availableTypes),
              const Divider(height: 1),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async => ref.refresh(catalogProvider.future),
                  child: filtered.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 120),
                            Center(child: Text('No items match your filters')),
                          ],
                        )
                      : GridView.builder(
                          padding: const EdgeInsets.all(12),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 0.62,
                          ),
                          itemCount: filtered.length,
                          itemBuilder: (_, i) => DiecastCard(
                            item: filtered[i],
                            onTap: () => showItemDetailSheet(context, filtered[i]),
                          ),
                        ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _searchBar() => Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
        child: TextField(
          controller: _searchCtrl,
          onChanged: (v) => setState(() => _search = v),
          decoration: InputDecoration(
            hintText: 'Search name or item no…',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: _search.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _searchCtrl.clear();
                      setState(() => _search = '');
                    },
                  ),
            isDense: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      );

  Widget _filterBar(List<String> brands, List<(String, String)> availableTypes) => Padding(
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
        child: Row(
          children: [
            Expanded(
              child: _filterButton(
                label: _brands.isEmpty
                    ? 'Brand'
                    : _brands.length == 1
                        ? _brands.first
                        : 'Brand (${_brands.length})',
                active: _brands.isNotEmpty,
                onTap: () => _openBrandSheet(brands),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _filterButton(
                label: _own == _OwnFilter.all
                    ? 'Status'
                    : _ownOptions.firstWhere((o) => o.$1 == _ownValue(_own)).$2,
                active: _own != _OwnFilter.all,
                onTap: _openStatusSheet,
              ),
            ),
            if (availableTypes.isNotEmpty) ...[
              const SizedBox(width: 8),
              Expanded(
                child: _filterButton(
                  label: _types.isEmpty ? 'Type' : 'Type (${_types.length})',
                  active: _types.isNotEmpty,
                  onTap: () => _openTypeSheet(availableTypes),
                ),
              ),
            ],
            if (_anyFilterActive)
              IconButton(
                tooltip: 'Clear all filters',
                icon: const Icon(Icons.filter_alt_off_outlined),
                onPressed: _clearAllFilters,
              ),
          ],
        ),
      );

  Widget _filterButton({
    required String label,
    required bool active,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    return OutlinedButton.icon(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        foregroundColor: active ? theme.colorScheme.primary : theme.colorScheme.onSurface,
        side: BorderSide(
          color: active ? theme.colorScheme.primary : theme.colorScheme.outlineVariant,
        ),
        backgroundColor: active ? theme.colorScheme.primary.withValues(alpha: 0.08) : null,
        padding: const EdgeInsets.symmetric(horizontal: 10),
      ),
      icon: const Icon(Icons.keyboard_arrow_down, size: 18),
      label: Text(label, overflow: TextOverflow.ellipsis),
    );
  }

  String _ownValue(_OwnFilter f) => switch (f) {
        _OwnFilter.all => 'all',
        _OwnFilter.owned => 'owned',
        _OwnFilter.preorder => 'preorder',
      };

  _OwnFilter _ownFromValue(String v) => switch (v) {
        'owned' => _OwnFilter.owned,
        'preorder' => _OwnFilter.preorder,
        _ => _OwnFilter.all,
      };

  Future<void> _openBrandSheet(List<String> brands) async {
    final result = await showFilterSheet(
      context,
      title: 'Brand',
      options: [for (final b in brands) (b, b)],
      initial: _brands,
      multi: true,
    );
    if (result != null) setState(() => _brands = result);
  }

  Future<void> _openStatusSheet() async {
    final result = await showFilterSheet(
      context,
      title: 'Status',
      options: _ownOptions,
      initial: {_ownValue(_own)},
      multi: false,
    );
    if (result != null) {
      setState(() => _own = _ownFromValue(result.isEmpty ? 'all' : result.first));
    }
  }

  Future<void> _openTypeSheet(List<(String, String)> availableTypes) async {
    final result = await showFilterSheet(
      context,
      title: 'Type',
      options: availableTypes,
      initial: _types,
      multi: true,
    );
    if (result != null) setState(() => _types = result);
  }
}
