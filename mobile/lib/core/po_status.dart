// Pre-order status logic, mirrored from the web PreorderTracker / PoStatusModal
// so mobile and web categorise identically. Pure functions — unit-tested.

/// The visible stage of a single PO line item (its badge).
enum PoStage { collected, ready, paid, partial, preorder }

/// Which "All orders" tab a whole PO order falls under.
enum OrderTab { pending, ready, collected }

const paymentStatuses = ['unpaid', 'partial', 'paid', 'refunded'];
const paymentMethods = ['none', 'cash', 'qr_payment', 'credit_card', 'fpx'];

/// Stage badge for one line item. Order matters: collected wins over ready,
/// ready over paid, etc. (matches the web StageBadge).
PoStage poStage({
  required String? paymentStatus,
  required String? readyDate,
  required String? collectedDate,
}) {
  if (collectedDate != null) return PoStage.collected;
  if (readyDate != null) return PoStage.ready;
  if (paymentStatus == 'paid') return PoStage.paid;
  if (paymentStatus == 'partial') return PoStage.partial;
  return PoStage.preorder;
}

String poStageLabel(PoStage s) => switch (s) {
      PoStage.collected => 'Collected',
      PoStage.ready => 'Ready for pickup',
      PoStage.paid => 'Paid',
      PoStage.partial => 'Partial',
      PoStage.preorder => 'Pre-order',
    };

/// Which tab a whole PO order (group of line items) belongs to. Collected only
/// when every item is collected; ready when any item is ready-not-collected;
/// otherwise pending. Matches the web grouping filter.
OrderTab orderTabForGroup(List<({String? readyDate, String? collectedDate})> items) {
  final allCollected = items.every((i) => i.collectedDate != null);
  if (allCollected) return OrderTab.collected;
  final hasReady = items.any((i) => i.readyDate != null && i.collectedDate == null);
  return hasReady ? OrderTab.ready : OrderTab.pending;
}

/// amount_paid derived from the chosen payment status (matches the web:
/// paid → full total, partial → the entered amount, otherwise 0).
double computeAmountPaid({
  required String paymentStatus,
  required double totalPrice,
  double partialAmount = 0,
}) {
  if (paymentStatus == 'paid') return totalPrice;
  if (paymentStatus == 'partial') return partialAmount;
  return 0;
}

/// Outstanding balance for one line item (never negative), counted only while
/// it hasn't been collected — matches the web "Balance due" summation.
double balanceForItem({
  required String? collectedDate,
  required double totalPrice,
  required double amountPaid,
}) {
  if (collectedDate != null) return 0;
  final due = totalPrice - amountPaid;
  return due > 0 ? due : 0;
}
