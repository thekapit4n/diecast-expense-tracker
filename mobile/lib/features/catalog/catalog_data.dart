import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/supabase.dart';
import '../../core/error_view.dart' show ensureOnline, requestTimeout;
import '../../core/ownership.dart';
import '../../data/catalog_image_paths.dart';
import '../../data/models/catalog_item.dart';
import '../../data/models/purchase.dart';

/// Everything the catalog screen needs: the built tiles plus the brand list.
class CatalogData {
  CatalogData({
    required this.items,
    required this.brands,
    required this.defaultBrand,
  });

  final List<CatalogItem> items;
  final List<String> brands;
  final String? defaultBrand;
}

/// Rebuilds the catalog exactly like the web app's catalog/page.tsx:
/// group purchases + details per collection, split chase/normal into tiles,
/// and aggregate owned / pre-order quantities with the shared ownership rules.
final catalogProvider = FutureProvider.autoDispose<CatalogData>((ref) async {
  await ensureOnline();
  final collectionsF = supabase
      .from('tbl_collection')
      .select(
        'id, name, item_no, scale, remark, brand_id, tbl_master_brand(name)',
      )
      .order('name', ascending: true);

  final brandsF = supabase
      .from('tbl_master_brand')
      .select('id, name, type')
      .eq('isactive', 1)
      .eq('type', 'Diecast')
      .order('name');

  final purchasesF = supabase
      .from('tbl_purchase')
      .select(
        'id, collection_id, quantity, price_per_unit, total_price, amount_paid, '
        'is_chase, edition_type, shop_name, platform, payment_date, payment_status, '
        'ready_date, collected_date, po_order_id, created_at',
      );

  final detailsF = supabase
      .from('tbl_collection_detail')
      .select('collection_id, is_case, is_chase');

  // Cars that have left the collection. Without this the app would keep
  // counting a car you gave away as owned, and disagree with the web app.
  final disposalsF = supabase
      .from('tbl_disposal')
      .select('purchase_id, quantity, status')
      .eq('status', 'active');

  final results = await Future.wait([
    collectionsF,
    brandsF,
    purchasesF,
    detailsF,
    disposalsF,
  ]).timeout(requestTimeout);
  final collectionsRaw = results[0] as List;
  final brandsRaw = results[1] as List;
  final purchasesRaw = results[2] as List;
  final detailsRaw = results[3] as List;
  final disposalsRaw = results[4] as List;

  // --- Units that have left, per purchase ---
  final disposedByPurchase = <String, int>{};
  for (final row in disposalsRaw) {
    final map = row as Map<String, dynamic>;
    final pid = map['purchase_id'] as String?;
    if (pid == null) continue;
    final qty = (map['quantity'] as num?)?.toInt() ?? 0;
    disposedByPurchase[pid] = (disposedByPurchase[pid] ?? 0) + qty;
  }

  // --- Group purchases per collection ---
  final purchaseMap = <String, List<Purchase>>{};
  for (final row in purchasesRaw) {
    final map = row as Map<String, dynamic>;
    final cid = map['collection_id'] as String?;
    if (cid == null) continue;
    final p = Purchase.fromRow(map);
    final gone = p.id == null ? 0 : (disposedByPurchase[p.id] ?? 0);
    (purchaseMap[cid] ??= []).add(gone > 0 ? p.withDisposedQty(gone) : p);
  }

  // --- Group case flags per collection, split by variant ---
  final detailMap = <String, ({bool chaseCase, bool normalCase})>{};
  for (final row in detailsRaw) {
    final map = row as Map<String, dynamic>;
    final cid = map['collection_id'] as String?;
    if (cid == null) continue;
    final cur = detailMap[cid] ?? (chaseCase: false, normalCase: false);
    if (map['is_case'] == true) {
      detailMap[cid] = map['is_chase'] == true
          ? (chaseCase: true, normalCase: cur.normalCase)
          : (chaseCase: cur.chaseCase, normalCase: true);
    } else {
      detailMap[cid] = cur;
    }
  }

  // --- Build tiles ---
  final items = <CatalogItem>[];
  for (final row in collectionsRaw) {
    final c = row as Map<String, dynamic>;
    final id = c['id'] as String;
    final brandObj = c['tbl_master_brand'] as Map<String, dynamic>?;
    final brandName = (brandObj?['name'] as String?) ?? 'Unknown';
    final purchases = purchaseMap[id] ?? const [];
    final detail = detailMap[id];

    final chase = purchases.where((p) => p.isChase).toList();
    final normal = purchases.where((p) => !p.isChase).toList();

    CatalogItem build(
      String tileId,
      List<Purchase> ps,
      bool isChase,
      bool isCase,
    ) => CatalogItem(
      id: tileId,
      name: c['name'] as String,
      itemNo: c['item_no'] as String?,
      scale: c['scale'] as String?,
      remark: c['remark'] as String?,
      brandName: brandName,
      brandId: (c['brand_id'] as num?)?.toInt(),
      isChase: isChase,
      isCase: isCase,
      editionTypes: {
        for (final p in ps)
          if (p.editionType != null && p.editionType != 'normal')
            p.editionType!,
      },
      totalQty: ps.fold(0, (s, p) => s + ownedQuantity(p)),
      preOrderQty: ps.where(isPreOrder).fold(0, (s, p) => s + p.quantity),
      imageSources: catalogImageSources(
        brandName: brandName,
        itemNo: c['item_no'] as String?,
        collectionName: c['name'] as String,
        remark: c['remark'] as String?,
        isChase: isChase,
      ),
      purchases: ps,
    );

    if (chase.isNotEmpty && normal.isNotEmpty) {
      items.add(build('$id::chase', chase, true, detail?.chaseCase ?? false));
      items.add(build(id, normal, false, detail?.normalCase ?? false));
    } else if (chase.isNotEmpty) {
      items.add(build(id, chase, true, detail?.chaseCase ?? false));
    } else {
      items.add(build(id, normal, false, detail?.normalCase ?? false));
    }
  }

  // --- Brands that actually have collection data ---
  final brandIdsWithData = <int>{
    for (final row in collectionsRaw)
      if ((row as Map)['brand_id'] != null) (row['brand_id'] as num).toInt(),
  };
  final brands = <String>[
    for (final row in brandsRaw)
      if (brandIdsWithData.contains(((row as Map)['id'] as num).toInt()))
        row['name'] as String,
  ]..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));

  final defaultBrand = brands.cast<String?>().firstWhere(
    (b) => b!.toLowerCase().contains('mini gt'),
    orElse: () => null,
  );

  return CatalogData(items: items, brands: brands, defaultBrand: defaultBrand);
});
