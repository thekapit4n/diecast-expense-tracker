import '../config/supabase.dart';
import 'models/disposal.dart';
import 'models/purchase.dart';

/// Cars that have left the collection — given away, sold, traded or lost.
///
/// The web app records these in tbl_disposal (see the web migration
/// supabase/migrations/20260830000000_create_tbl_disposal.sql). Mobile is
/// read-only here: it never writes disposals, it just subtracts them so the
/// owned counts agree with the web app, and shows where a car went.
///
/// Only 'active' rows count. A 'returned' row is a refused COD parcel that
/// came back, so its unit is on the shelf again.

/// Full disposal records, grouped by tbl_purchase.id. Screens that only need
/// counts can pass the result through [disposedCounts].
Future<Map<String, List<Disposal>>> fetchDisposalsByPurchase() async {
  final rows = await supabase
      .from('tbl_disposal')
      .select(
        'purchase_id, quantity, reason, status, counterparty, '
        'disposal_date, gross_amount, remark',
      )
      .eq('status', 'active')
      .order('disposal_date', ascending: false);

  final map = <String, List<Disposal>>{};
  for (final row in rows as List) {
    final d = Disposal.fromRow(row as Map<String, dynamic>);
    (map[d.purchaseId] ??= []).add(d);
  }
  return map;
}

/// How many units have left, per purchase.
Map<String, int> disposedCounts(Map<String, List<Disposal>> byPurchase) => {
      for (final entry in byPurchase.entries)
        entry.key: entry.value
            .where((d) => d.isActive)
            .fold(0, (sum, d) => sum + d.quantity),
    };

/// Counts only — for the dashboard and insights, which never show the detail.
Future<Map<String, int>> fetchDisposedByPurchase() async =>
    disposedCounts(await fetchDisposalsByPurchase());

/// Stamps each purchase with how many of its units have gone, so
/// [ownedQuantity] can work it out downstream.
List<Purchase> applyDisposals(
  List<Purchase> purchases,
  Map<String, int> disposedByPurchase,
) {
  if (disposedByPurchase.isEmpty) return purchases;
  return [
    for (final p in purchases)
      if (p.id != null && (disposedByPurchase[p.id] ?? 0) > 0)
        p.withDisposedQty(disposedByPurchase[p.id]!)
      else
        p,
  ];
}

/// Attaches both the count and the records, for screens that show where a car
/// went as well as how many are left.
List<Purchase> applyDisposalRecords(
  List<Purchase> purchases,
  Map<String, List<Disposal>> byPurchase,
) {
  if (byPurchase.isEmpty) return purchases;
  return [
    for (final p in purchases)
      if (p.id != null && (byPurchase[p.id]?.isNotEmpty ?? false))
        p.withDisposals(byPurchase[p.id]!)
      else
        p,
  ];
}
