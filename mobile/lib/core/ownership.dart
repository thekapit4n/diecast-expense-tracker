import '../data/models/purchase.dart';

/// Ownership rules mirrored from the web app (lib/catalog-ownership.ts) so
/// the mobile numbers always agree with the admin site.

/// A purchase counts as "owned" once it's paid, and — if it's a tracked PO
/// item — has also been physically collected. Direct (non-PO) purchases have
/// no pickup lifecycle, so paid alone is enough.
bool isOwned(Purchase p) =>
    p.paymentStatus == 'paid' && (p.poOrderId == null || p.collectedDate != null);

/// A pre-order is a tracked PO line item that isn't owned yet.
bool isPreOrder(Purchase p) => p.poOrderId != null && !isOwned(p);

/// Ready to collect: a pre-order the seller has marked ready but not yet
/// collected.
bool isReadyToCollect(Purchase p) =>
    isPreOrder(p) && p.readyDate != null && p.collectedDate == null;

/// Not fully settled: still owes money (either explicitly unpaid, or the
/// running amount paid is below the total).
bool isOutstanding(Purchase p) {
  if (p.paymentStatus == 'paid') return false;
  return true;
}

/// Partially paid: some money down but not the full amount.
bool isPartiallyPaid(Purchase p) {
  final total = p.totalPrice;
  if (total == null || total <= 0) return false;
  return p.amountPaid > 0 && p.amountPaid < total;
}
