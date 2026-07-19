import 'purchase.dart';

/// One catalog tile. Chase and normal variants of the same collection render
/// as separate tiles (matching the web), so [id] may be suffixed `::chase`.
class CatalogItem {
  CatalogItem({
    required this.id,
    required this.name,
    required this.itemNo,
    required this.scale,
    required this.remark,
    required this.brandName,
    required this.brandId,
    required this.isChase,
    required this.isCase,
    required this.totalQty,
    required this.preOrderQty,
    required this.imageSources,
    required this.purchases,
  });

  final String id;
  final String name;
  final String? itemNo;
  final String? scale;
  final String? remark;
  final String brandName;
  final int? brandId;
  final bool isChase;
  final bool isCase;

  /// Owned units (paid + collected where applicable).
  final int totalQty;

  /// Units still tracked in a PO deal, not yet collected + paid.
  final int preOrderQty;

  /// Ordered image source candidates (external URLs or storage paths).
  final List<String> imageSources;

  final List<Purchase> purchases;

  bool get isOwnedTile => totalQty > 0;
  bool get isPreOrderTile => !isOwnedTile && preOrderQty > 0;
}
