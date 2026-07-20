import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/supabase.dart';
import '../../core/error_view.dart' show ensureOnline, requestTimeout;
import '../../core/ownership.dart';
import '../../data/models/purchase.dart';

/// Aggregated numbers for the home dashboard, computed from all purchases
/// using the same ownership rules as the web app.
class DashboardData {
  DashboardData({
    required this.modelsOwned,
    required this.unitsOwned,
    required this.activePreOrderUnits,
    required this.readyToCollectUnits,
    required this.outstandingOrders,
    required this.recentPurchases,
  });

  final int modelsOwned;
  final int unitsOwned;
  final int activePreOrderUnits;
  final int readyToCollectUnits;
  final int outstandingOrders;
  final List<Purchase> recentPurchases;
}

/// Columns needed to compute every dashboard metric, plus the joined
/// collection name/brand for the "recent purchases" list.
const _purchaseSelect = '''
  collection_id, quantity, price_per_unit, total_price, amount_paid,
  payment_status, payment_date, po_order_id, ready_date, collected_date,
  is_chase, created_at,
  tbl_collection ( name, item_no, tbl_master_brand ( name ) )
''';

final dashboardProvider = FutureProvider.autoDispose<DashboardData>((ref) async {
  await ensureOnline();
  final rows = await supabase
      .from('tbl_purchase')
      .select(_purchaseSelect)
      .timeout(requestTimeout);

  final purchases =
      (rows as List).map((r) => Purchase.fromRow(r as Map<String, dynamic>)).toList();

  final ownedCollectionIds = <String>{};
  var unitsOwned = 0;
  var activePreOrderUnits = 0;
  var readyToCollectUnits = 0;
  var outstandingOrders = 0;

  for (final p in purchases) {
    if (isOwned(p)) {
      unitsOwned += p.quantity;
      if (p.collectionId != null) ownedCollectionIds.add(p.collectionId!);
    }
    if (isPreOrder(p)) activePreOrderUnits += p.quantity;
    if (isReadyToCollect(p)) readyToCollectUnits += p.quantity;
    if (isOutstanding(p)) outstandingOrders += 1;
  }

  // Most recent purchases first (created_at is epoch seconds, may be null).
  final recent = [...purchases]
    ..sort((a, b) => (b.createdAt ?? 0).compareTo(a.createdAt ?? 0));

  return DashboardData(
    modelsOwned: ownedCollectionIds.length,
    unitsOwned: unitsOwned,
    activePreOrderUnits: activePreOrderUnits,
    readyToCollectUnits: readyToCollectUnits,
    outstandingOrders: outstandingOrders,
    recentPurchases: recent.take(5).toList(),
  );
});
