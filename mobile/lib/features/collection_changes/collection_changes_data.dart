import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/supabase.dart';
import '../../core/error_view.dart' show ensureOnline, requestTimeout;
import '../../data/catalog_image_paths.dart';

/// One car leaving the collection, with everything a card needs to show it:
/// where it went, what it originally cost, and a photo to recognise it by.
class CollectionChange {
  const CollectionChange({
    required this.id,
    required this.quantity,
    required this.reason,
    required this.status,
    required this.collectionName,
    required this.brandName,
    required this.imageSources,
    required this.grossAmount,
    required this.postageOut,
    required this.fees,
    required this.costPerUnit,
    this.itemNo,
    this.handover,
    this.disposalDate,
    this.counterparty,
    this.paymentStatus,
    this.remark,
    this.shopName,
    this.purchaseDate,
    this.isChase = false,
  });

  final String id;
  final int quantity;

  /// sold / gift / trade / lost / damaged
  final String reason;
  final String status;

  final String collectionName;
  final String? itemNo;
  final String brandName;
  final List<String> imageSources;
  final bool isChase;

  final String? handover;
  final String? disposalDate;
  final String? counterparty;
  final String? paymentStatus;
  final String? remark;

  final double grossAmount;
  final double postageOut;
  final double fees;

  /// What the car cost you originally — the figure that makes a gift record
  /// mean something, since a gift has no sale numbers of its own.
  final double costPerUnit;
  final String? shopName;
  final String? purchaseDate;

  bool get isActive => status == 'active';
  bool get isMoneyReason => reason == 'sold' || reason == 'trade';

  /// A sale only counts once the unit really left and the money really came in
  /// — the mirror of a purchase not being owned until it is paid.
  bool get isRealisedSale =>
      reason == 'sold' && isActive && paymentStatus == 'received';

  double get netProfit =>
      grossAmount - postageOut - fees - (costPerUnit * quantity);

  String get badge => switch (reason) {
        'sold' => 'SOLD',
        'gift' => 'GIFT',
        'trade' => 'TRADED',
        'lost' => 'LOST',
        'damaged' => 'DAMAGED',
        _ => 'GONE',
      };

  String get reasonWord => switch (reason) {
        'sold' => 'Sold',
        'gift' => 'Gift',
        'trade' => 'Traded',
        'lost' => 'Lost',
        'damaged' => 'Damaged',
        _ => 'Gone',
      };

  /// Everything the search box matches against.
  String get searchText => [
        collectionName,
        itemNo,
        brandName,
        counterparty,
        remark,
      ].whereType<String>().join(' ').toLowerCase();

  factory CollectionChange.fromRow(Map<String, dynamic> row) {
    final purchase = row['tbl_purchase'] as Map<String, dynamic>?;
    final collection = row['tbl_collection'] as Map<String, dynamic>?;
    final brand = collection?['tbl_master_brand'] as Map<String, dynamic>?;
    final brandName = (brand?['name'] as String?) ?? 'Unknown';
    final isChase = purchase?['is_chase'] == true;

    double toDouble(dynamic v) => v == null ? 0 : (v as num).toDouble();

    return CollectionChange(
      id: row['id'] as String,
      quantity: (row['quantity'] as num?)?.toInt() ?? 1,
      reason: (row['reason'] as String?) ?? 'sold',
      status: (row['status'] as String?) ?? 'active',
      collectionName: (collection?['name'] as String?) ?? 'Unknown item',
      itemNo: collection?['item_no'] as String?,
      brandName: brandName,
      isChase: isChase,
      imageSources: catalogImageSources(
        brandName: brandName,
        itemNo: collection?['item_no'] as String?,
        collectionName: collection?['name'] as String?,
        remark: collection?['remark'] as String?,
        isChase: isChase,
      ),
      handover: row['handover'] as String?,
      disposalDate: row['disposal_date'] as String?,
      counterparty: row['counterparty'] as String?,
      paymentStatus: row['payment_status'] as String?,
      remark: row['remark'] as String?,
      grossAmount: toDouble(row['gross_amount']),
      postageOut: toDouble(row['postage_out']),
      fees: toDouble(row['fees']),
      costPerUnit: toDouble(purchase?['price_per_unit']),
      shopName: purchase?['shop_name'] as String?,
      purchaseDate: purchase?['payment_date'] as String?,
    );
  }
}

/// The five reasons, in the same order as the web app's menu.
const collectionChangeReasons = [
  (value: 'sold', label: 'Sold'),
  (value: 'gift', label: 'Gifted'),
  (value: 'trade', label: 'Traded'),
  (value: 'lost', label: 'Lost'),
  (value: 'damaged', label: 'Damaged'),
];

/// Everything that has left the collection, newest first.
///
/// Written by the web app; mobile is read-only here. Returned records are kept
/// in the list so a refused parcel is visible, but they never count towards
/// what has gone or what a sale made.
final collectionChangesProvider =
    FutureProvider.autoDispose<List<CollectionChange>>((ref) async {
  await ensureOnline();

  final rows = await supabase
      .from('tbl_disposal')
      .select(
        'id, quantity, reason, handover, disposal_date, counterparty, '
        'gross_amount, postage_out, fees, payment_status, status, remark, '
        'tbl_purchase ( price_per_unit, is_chase, shop_name, payment_date ), '
        'tbl_collection ( name, item_no, remark, tbl_master_brand ( name ) )',
      )
      .order('disposal_date', ascending: false)
      .timeout(requestTimeout);

  return [
    for (final row in rows as List)
      CollectionChange.fromRow(row as Map<String, dynamic>),
  ];
});
