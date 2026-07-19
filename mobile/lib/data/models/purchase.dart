/// One row from tbl_purchase, with the related collection name/brand joined in.
/// Field names mirror the web app's PurchaseRecord where they overlap.
class Purchase {
  Purchase({
    required this.collectionId,
    required this.collectionName,
    required this.itemNo,
    required this.brandName,
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
    required this.createdAt,
  });

  final String? collectionId;
  final String collectionName;
  final String? itemNo;
  final String? brandName;
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

  /// Epoch seconds (tbl_purchase.created_at is a BIGINT).
  final int? createdAt;

  factory Purchase.fromRow(Map<String, dynamic> row) {
    // tbl_collection is joined as a nested object (to-one relation).
    final collection = row['tbl_collection'] as Map<String, dynamic>?;
    final brand = collection?['tbl_master_brand'] as Map<String, dynamic>?;

    double? toDouble(dynamic v) => v == null ? null : (v as num).toDouble();

    return Purchase(
      collectionId: row['collection_id'] as String?,
      collectionName: (collection?['name'] as String?) ?? 'Unknown item',
      itemNo: collection?['item_no'] as String?,
      brandName: brand?['name'] as String?,
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
      createdAt: (row['created_at'] as num?)?.toInt(),
    );
  }
}
