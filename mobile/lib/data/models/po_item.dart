/// One pre-order line item (tbl_purchase joined with its collection and
/// tbl_po_order header). Mirrors the web PreorderTracker's PoTrackerRow.
class PoItem {
  PoItem({
    required this.id,
    required this.quantity,
    required this.pricePerUnit,
    required this.totalPrice,
    required this.paymentStatus,
    required this.preOrderStatus,
    required this.amountPaid,
    required this.paymentDate,
    required this.paymentMethod,
    required this.variantStatus,
    required this.packagingType,
    required this.readyDate,
    required this.pickupDeadline,
    required this.collectedDate,
    required this.collectionId,
    required this.collectionName,
    required this.itemNo,
    required this.poOrderId,
    required this.poReference,
    required this.poChannel,
    required this.poEta,
    required this.poCloseDate,
    required this.poOrderDate,
    required this.poSourceLink,
    required this.shopName,
  });

  final String id;
  final int quantity;
  final double pricePerUnit;
  final double totalPrice;
  final String? paymentStatus;
  final String? preOrderStatus;
  final double amountPaid;
  final String? paymentDate;
  final String? paymentMethod;
  final String? variantStatus;
  final String? packagingType;
  final String? readyDate;
  final String? pickupDeadline;
  final String? collectedDate;
  final String collectionId;
  final String collectionName;
  final String? itemNo;
  final String poOrderId;
  final String? poReference;
  final String? poChannel;
  final String? poEta;
  final String? poCloseDate;
  final String? poOrderDate;
  final String? poSourceLink;
  final String? shopName;

  factory PoItem.fromRow(Map<String, dynamic> row) {
    final collection = row['tbl_collection'] as Map<String, dynamic>?;
    final po = row['tbl_po_order'] as Map<String, dynamic>?;
    final shop = po?['tbl_shop_information'] as Map<String, dynamic>?;
    double toD(dynamic v) => (v as num?)?.toDouble() ?? 0;

    return PoItem(
      id: row['id'] as String,
      quantity: (row['quantity'] as num?)?.toInt() ?? 1,
      pricePerUnit: toD(row['price_per_unit']),
      totalPrice: toD(row['total_price']),
      paymentStatus: row['payment_status'] as String?,
      preOrderStatus: row['pre_order_status'] as String?,
      amountPaid: toD(row['amount_paid']),
      paymentDate: row['payment_date'] as String?,
      paymentMethod: row['payment_method'] as String?,
      variantStatus: row['variant_status'] as String?,
      packagingType: row['packaging_type'] as String?,
      readyDate: row['ready_date'] as String?,
      pickupDeadline: row['pickup_deadline'] as String?,
      collectedDate: row['collected_date'] as String?,
      collectionId: row['collection_id'] as String,
      collectionName: (collection?['name'] as String?) ?? '',
      itemNo: collection?['item_no'] as String?,
      poOrderId: row['po_order_id'] as String,
      poReference: po?['reference'] as String?,
      poChannel: po?['channel'] as String?,
      poEta: po?['eta'] as String?,
      poCloseDate: po?['po_close_date'] as String?,
      poOrderDate: po?['order_date'] as String?,
      poSourceLink: po?['source_link'] as String?,
      shopName: shop?['shop_name'] as String?,
    );
  }
}
