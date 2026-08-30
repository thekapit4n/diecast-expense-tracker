import '../config/supabase.dart';
import 'models/purchase.dart';

/// Cars that have left the collection — given away, sold, traded or lost.
///
/// The web app records these in tbl_disposal (see the web
/// supabase/migrations/20260830000000_create_tbl_disposal.sql). Mobile is
/// read-only here: it never writes disposals, it just has to subtract them so
/// the owned counts agree with the web app.
///
/// Only 'active' rows count. A 'returned' row is a refused COD parcel that
/// came back, so its unit is on the shelf again.

/// Units that have left, keyed by tbl_purchase.id.
Future<Map<String, int>> fetchDisposedByPurchase() async {
  final rows = await supabase
      .from('tbl_disposal')
      .select('purchase_id, quantity, status')
      .eq('status', 'active');

  final map = <String, int>{};
  for (final row in rows as List) {
    final m = row as Map<String, dynamic>;
    final pid = m['purchase_id'] as String?;
    if (pid == null) continue;
    map[pid] = (map[pid] ?? 0) + ((m['quantity'] as num?)?.toInt() ?? 0);
  }
  return map;
}

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
