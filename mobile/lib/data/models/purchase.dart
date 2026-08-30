import 'disposal.dart';

/// Columns every [Purchase]-backed screen needs: the dashboard metrics, the
/// spending insights aggregation, and the joined collection name/brand for the
/// "recent purchases" list. Shared so the model and the queries cannot drift.
const purchaseSelect = '''
  id, collection_id, quantity, price_per_unit, total_price, amount_paid,
  payment_status, payment_date, po_order_id, ready_date, collected_date,
  is_chase, shop_name, created_at,
  tbl_collection ( name, item_no, tbl_master_brand ( name ) )
''';

/// One row from tbl_purchase, with the related collection name/brand joined in.
/// Field names mirror the web app's PurchaseRecord where they overlap.
class Purchase {
  Purchase({
    this.id,
    required this.collectionId,
    required this.collectionName,
    required this.itemNo,
    required this.brandName,
    required this.shopName,
    required this.quantity,
    required this.pricePerUnit,
    required this.totalPrice,
    required this.amountPaid,
    required this.paymentStatus,
    required this.paymentDate,
    required this.poOrderId,
    required this.readyDate,
    required this.collectedDate,
    required this.isChase,
    required this.editionType,
    required this.createdAt,
    this.disposedQty = 0,
    this.disposals = const [],
  });

  final String? id;
  final String? collectionId;
  final String collectionName;
  final String? itemNo;
  final String? brandName;
  final String? shopName;
  final int quantity;
  final double? pricePerUnit;
  final double? totalPrice;
  final double amountPaid;
  final String? paymentStatus;
  final String? paymentDate;
  final String? poOrderId;
  final String? readyDate;
  final String? collectedDate;
  final bool isChase;

  /// normal / event_car / black_edition / limited_edition (nullable — most
  /// purchases are plain "normal" and just leave this unset).
  final String? editionType;

  /// Epoch seconds (tbl_purchase.created_at is a BIGINT).
  final int? createdAt;

  /// Units from this purchase that have left the collection — gifted, sold,
  /// traded or lost. Filled in from tbl_disposal by whoever loads the rows;
  /// defaults to 0 for queries that don't care about disposals.
  final int disposedQty;

  /// The individual records of those units leaving — reason, who got it, when.
  /// Only loaded by screens that show the detail; empty elsewhere.
  final List<Disposal> disposals;

  Purchase _copyWith({int? disposedQty, List<Disposal>? disposals}) => Purchase(
    id: id,
    collectionId: collectionId,
    collectionName: collectionName,
    itemNo: itemNo,
    brandName: brandName,
    shopName: shopName,
    quantity: quantity,
    pricePerUnit: pricePerUnit,
    totalPrice: totalPrice,
    amountPaid: amountPaid,
    paymentStatus: paymentStatus,
    paymentDate: paymentDate,
    poOrderId: poOrderId,
    readyDate: readyDate,
    collectedDate: collectedDate,
    isChase: isChase,
    editionType: editionType,
    createdAt: createdAt,
    disposedQty: disposedQty ?? this.disposedQty,
    disposals: disposals ?? this.disposals,
  );

  /// Count only — for screens that show how many are left but not where they
  /// went (dashboard, insights).
  Purchase withDisposedQty(int qty) => _copyWith(disposedQty: qty);

  /// Records plus the count derived from them, so the two can never disagree.
  Purchase withDisposals(List<Disposal> records) => _copyWith(
    disposals: records,
    disposedQty: records
        .where((d) => d.isActive)
        .fold<int>(0, (sum, d) => sum + d.quantity),
  );

  factory Purchase.fromRow(Map<String, dynamic> row) {
    // tbl_collection is joined as a nested object (to-one relation).
    final collection = row['tbl_collection'] as Map<String, dynamic>?;
    final brand = collection?['tbl_master_brand'] as Map<String, dynamic>?;

    double? toDouble(dynamic v) => v == null ? null : (v as num).toDouble();

    return Purchase(
      id: row['id'] as String?,
      collectionId: row['collection_id'] as String?,
      collectionName: (collection?['name'] as String?) ?? 'Unknown item',
      itemNo: collection?['item_no'] as String?,
      brandName: brand?['name'] as String?,
      shopName: row['shop_name'] as String?,
      quantity: (row['quantity'] as num?)?.toInt() ?? 1,
      pricePerUnit: toDouble(row['price_per_unit']),
      totalPrice: toDouble(row['total_price']),
      amountPaid: toDouble(row['amount_paid']) ?? 0,
      paymentStatus: row['payment_status'] as String?,
      paymentDate: row['payment_date'] as String?,
      poOrderId: row['po_order_id'] as String?,
      readyDate: row['ready_date'] as String?,
      collectedDate: row['collected_date'] as String?,
      isChase: row['is_chase'] == true,
      editionType: row['edition_type'] as String?,
      createdAt: (row['created_at'] as num?)?.toInt(),
      disposedQty: (row['disposed_qty'] as num?)?.toInt() ?? 0,
    );
  }
}
