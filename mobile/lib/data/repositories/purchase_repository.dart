import '../../config/supabase.dart';
import '../../core/format.dart';
import '../../core/po_status.dart';
import '../models/po_item.dart';

/// A shop from tbl_shop_information (for the purchase form dropdown).
class Shop {
  Shop(this.id, this.name);
  final String id;
  final String name;
}

/// All reads/writes for purchases and the pre-order tracker. Mirrors the web
/// app's insert (Add Purchase) and update (PoStatusModal) logic so the two
/// stay consistent against the shared database.
class PurchaseRepository {
  String? get _userId => supabase.auth.currentUser?.id;

  Map<String, dynamic> _insertAudit() {
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    return {
      'created_by': _userId,
      'created_at': now,
      'updated_by': _userId,
      'updated_at': now,
    };
  }

  Map<String, dynamic> _updateAudit() => {
        'updated_by': _userId,
        'updated_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      };

  Future<List<Shop>> fetchShops() async {
    final rows = await supabase
        .from('tbl_shop_information')
        .select('id, shop_name')
        .order('shop_name');
    return (rows as List)
        .map((r) => Shop(
              (r as Map)['id'] as String,
              (r['shop_name'] as String?) ?? 'Unnamed shop',
            ))
        .toList();
  }

  static const _poSelect = '''
    id, quantity, price_per_unit, total_price, payment_status, pre_order_status,
    amount_paid, payment_date, payment_method, variant_status, packaging_type, ready_date,
    pickup_deadline, collected_date, collection_id, po_order_id,
    tbl_collection!inner ( name, item_no ),
    tbl_po_order!inner (
      id, reference, channel, eta, po_close_date, order_date, source_link,
      tbl_shop_information ( shop_name )
    )
  ''';

  Future<List<PoItem>> fetchPoItems() async {
    final rows = await supabase
        .from('tbl_purchase')
        .select(_poSelect)
        .not('po_order_id', 'is', null)
        .order('created_at', ascending: false);
    return (rows as List)
        .map((r) => PoItem.fromRow(r as Map<String, dynamic>))
        .toList();
  }

  /// Inserts a purchase (quick entry). When paid, also writes a matching
  /// tbl_collection_detail row, exactly like the web Add Purchase flow.
  Future<void> insertPurchase({
    required String collectionId,
    int? brandId,
    required int quantity,
    required double pricePerUnit,
    required bool isChase,
    String? purchaseType,
    String? platform,
    required String paymentStatus,
    String? paymentMethod,
    DateTime? paymentDate,
    DateTime? collectedDate,
    String? urlLink,
    String? shopId,
    String? shopName,
    String? remark,
    double partialAmount = 0,
  }) async {
    final totalPrice = pricePerUnit * quantity;
    final amountPaid = computeAmountPaid(
      paymentStatus: paymentStatus,
      totalPrice: totalPrice,
      partialAmount: partialAmount,
    );

    final inserted = await supabase
        .from('tbl_purchase')
        .insert({
          'collection_id': collectionId,
          'quantity': quantity,
          'price_per_unit': pricePerUnit,
          'total_price': totalPrice,
          'purchase_type': purchaseType,
          'platform': platform,
          'payment_status': paymentStatus,
          'payment_method':
              (paymentMethod != null && paymentMethod != 'none') ? paymentMethod : null,
          'payment_date': toDbDate(paymentDate),
          'collected_date': toDbDate(collectedDate),
          'url_link': urlLink,
          'is_chase': isChase,
          'shop_id': shopId,
          'shop_name': shopName,
          'remark': remark,
          'amount_paid': amountPaid,
          ..._insertAudit(),
        })
        .select()
        .single();

    if (paymentStatus == 'paid') {
      await supabase.from('tbl_collection_detail').insert({
        'collection_id': collectionId,
        'purchase_id': inserted['id'],
        'quantity': quantity,
        'brand_id': brandId,
        'is_chase': isChase,
        'is_case': false,
        'remark': remark,
        ..._insertAudit(),
      });
    }
  }

  /// Full status update for one PO item (mirrors PoStatusModal.handleSave).
  Future<void> updatePoStatus({
    required String purchaseId,
    required double totalPrice,
    required String paymentStatus,
    double partialAmount = 0,
    String? paymentMethod,
    DateTime? paymentDate,
    DateTime? readyDate,
    DateTime? pickupDeadline,
    DateTime? collectedDate,
  }) async {
    final amount = computeAmountPaid(
      paymentStatus: paymentStatus,
      totalPrice: totalPrice,
      partialAmount: partialAmount,
    );
    // Backfill a payment date once settled so dashboard "spend" picks it up.
    final resolvedPaymentDate = paymentDate ??
        ((paymentStatus == 'paid' || paymentStatus == 'partial')
            ? (collectedDate ?? DateTime.now())
            : null);

    await supabase.from('tbl_purchase').update({
      'payment_status': paymentStatus,
      'amount_paid': amount,
      'payment_method':
          (paymentMethod != null && paymentMethod != 'none') ? paymentMethod : null,
      'payment_date': toDbDate(resolvedPaymentDate),
      'ready_date': toDbDate(readyDate),
      'pickup_deadline': toDbDate(pickupDeadline),
      'collected_date': toDbDate(collectedDate),
      ..._updateAudit(),
    }).eq('id', purchaseId);
  }

  /// Quick action: mark ready today (defaults a pickup deadline one month out).
  Future<void> markReady(PoItem item) async {
    await supabase.from('tbl_purchase').update({
      'ready_date': toDbDate(DateTime.now()),
      if (item.pickupDeadline == null)
        'pickup_deadline': toDbDate(DateTime(
            DateTime.now().year, DateTime.now().month + 1, DateTime.now().day)),
      ..._updateAudit(),
    }).eq('id', item.id);
  }

  /// Quick action: mark fully paid (keeps any existing payment date).
  Future<void> markFullyPaid(PoItem item) async {
    await supabase.from('tbl_purchase').update({
      'payment_status': 'paid',
      'amount_paid': item.totalPrice,
      'payment_date': item.paymentDate ?? toDbDate(DateTime.now()),
      ..._updateAudit(),
    }).eq('id', item.id);
  }

  /// Quick action: mark collected today (implies fully paid, matches web).
  Future<void> markCollected(PoItem item) async {
    final today = toDbDate(DateTime.now());
    await supabase.from('tbl_purchase').update({
      'collected_date': today,
      'payment_status': 'paid',
      'amount_paid': item.totalPrice,
      'payment_date': item.paymentDate ?? today,
      ..._updateAudit(),
    }).eq('id', item.id);
  }

  /// Quick action: cancel this pre-order line.
  Future<void> markCancelled(PoItem item) async {
    await supabase.from('tbl_purchase').update({
      'pre_order_status': 'cancelled',
      ..._updateAudit(),
    }).eq('id', item.id);
  }
}
