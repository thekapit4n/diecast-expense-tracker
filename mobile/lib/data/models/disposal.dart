/// One record of units leaving the collection — given away, sold, traded or
/// lost. Written by the web app; mobile only reads them.
class Disposal {
  const Disposal({
    required this.purchaseId,
    required this.quantity,
    required this.reason,
    required this.status,
    this.counterparty,
    this.disposalDate,
    this.grossAmount,
    this.remark,
  });

  final String purchaseId;
  final int quantity;

  /// sold / gift / trade / lost / damaged
  final String reason;

  /// active = the unit is gone. returned = a refused parcel came back, so it
  /// is on the shelf again and must not reduce the owned count.
  final String status;

  final String? counterparty;
  final String? disposalDate;
  final double? grossAmount;
  final String? remark;

  bool get isActive => status == 'active';

  /// Badge wording, matching the web app's labels.
  String get label => switch (reason) {
        'sold' => 'SOLD',
        'gift' => 'GIFT',
        'trade' => 'TRADED',
        'lost' => 'LOST',
        'damaged' => 'DAMAGED',
        _ => 'GONE',
      };

  factory Disposal.fromRow(Map<String, dynamic> row) => Disposal(
        purchaseId: row['purchase_id'] as String,
        quantity: (row['quantity'] as num?)?.toInt() ?? 0,
        reason: (row['reason'] as String?) ?? 'sold',
        status: (row['status'] as String?) ?? 'active',
        counterparty: row['counterparty'] as String?,
        disposalDate: row['disposal_date'] as String?,
        grossAmount: (row['gross_amount'] as num?)?.toDouble(),
        remark: row['remark'] as String?,
      );
}
