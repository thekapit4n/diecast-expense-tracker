import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/supabase.dart';
import '../../core/error_view.dart' show ensureOnline, requestTimeout;
import '../../core/ownership.dart';
import '../../data/disposals.dart';
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

final dashboardProvider = FutureProvider.autoDispose<DashboardData>((ref) async {
  await ensureOnline();
  final results = await Future.wait<dynamic>([
    supabase.from('tbl_purchase').select(purchaseSelect),
    fetchDisposedByPurchase(),
  ]).timeout(requestTimeout);

  final rows = results[0] as List;
  final disposed = results[1] as Map<String, int>;

  final purchases = applyDisposals(
    rows.map((r) => Purchase.fromRow(r as Map<String, dynamic>)).toList(),
    disposed,
  );

  final ownedCollectionIds = <String>{};
  var unitsOwned = 0;
  var activePreOrderUnits = 0;
  var readyToCollectUnits = 0;
  var outstandingOrders = 0;

  for (final p in purchases) {
    // Cars that have left are no longer units on the shelf, even though the
    // money spent on them stays in the spending figures.
    final owned = ownedQuantity(p);
    if (owned > 0) {
      unitsOwned += owned;
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
