import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/error_view.dart';
import '../../data/models/catalog_item.dart';
import 'catalog_data.dart';
import 'item_detail_sheet.dart';
import 'widgets/diecast_card.dart';

enum _OwnFilter { all, owned, preorder, notOwned }

class CatalogScreen extends ConsumerStatefulWidget {
  const CatalogScreen({super.key});

  @override
  ConsumerState<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends ConsumerState<CatalogScreen> {
  final _searchCtrl = TextEditingController();
  String _search = '';
  String? _brand; // null = All
  bool _brandInitialised = false;
  _OwnFilter _own = _OwnFilter.all;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<CatalogItem> _apply(List<CatalogItem> items) {
    final q = _search.trim().toLowerCase();
    final terms = q.split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toList();

    return items.where((it) {
      if (_brand != null && it.brandName != _brand) return false;
      switch (_own) {
        case _OwnFilter.owned:
          if (!it.isOwnedTile) return false;
        case _OwnFilter.preorder:
          if (!it.isPreOrderTile) return false;
        case _OwnFilter.notOwned:
          if (it.isOwnedTile || it.isPreOrderTile) return false;
        case _OwnFilter.all:
          break;
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

    return Scaffold(
      appBar: AppBar(title: const Text('Catalog')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AppErrorView(
          error: e,
          onRetry: () => ref.invalidate(catalogProvider),
        ),
        data: (data) {
          // Default to Mini GT tab the first time, like the web.
          if (!_brandInitialised) {
            _brand = data.defaultBrand;
            _brandInitialised = true;
          }
          final filtered = _apply(data.items);

          return Column(
            children: [
              _searchBar(),
              _brandChips(data.brands),
              _ownChips(),
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

  Widget _brandChips(List<String> brands) => SizedBox(
        height: 44,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          children: [
            _filterChip('All', _brand == null, () => setState(() => _brand = null)),
            for (final b in brands)
              _filterChip(b, _brand == b, () => setState(() => _brand = b)),
          ],
        ),
      );

  Widget _ownChips() => SizedBox(
        height: 44,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          children: [
            _filterChip('All', _own == _OwnFilter.all,
                () => setState(() => _own = _OwnFilter.all)),
            _filterChip('Owned', _own == _OwnFilter.owned,
                () => setState(() => _own = _OwnFilter.owned)),
            _filterChip('Pre-order', _own == _OwnFilter.preorder,
                () => setState(() => _own = _OwnFilter.preorder)),
            _filterChip('Not owned', _own == _OwnFilter.notOwned,
                () => setState(() => _own = _OwnFilter.notOwned)),
          ],
        ),
      );

  Widget _filterChip(String label, bool selected, VoidCallback onTap) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: ChoiceChip(
          label: Text(label),
          selected: selected,
          onSelected: (_) => onTap(),
        ),
      );
}
