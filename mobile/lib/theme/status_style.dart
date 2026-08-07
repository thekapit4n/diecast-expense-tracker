import 'package:flutter/material.dart';

import '../core/ownership.dart';
import '../core/po_status.dart';
import '../data/models/purchase.dart';
import 'app_theme.dart';

/// Label + colour for a purchase's status badge.
///
/// This mapping was duplicated verbatim in the home dashboard and the catalog
/// item sheet; both now call here so they cannot drift apart.
(String, Color) purchaseStatusStyle(BuildContext context, Purchase p) {
  final status = AppStatusColors.of(context);
  if (isOwned(p)) return ('Owned', status.owned);
  if (isReadyToCollect(p)) return ('Ready', status.ready);
  if (isPartiallyPaid(p)) return ('Partial', status.partial);
  if (isPreOrder(p)) return ('Pre-order', status.preOrder);
  if (isOutstanding(p)) return ('Unpaid', status.unpaid);
  return ('—', Theme.of(context).colorScheme.outline);
}

/// Label + colour for a pre-order line's stage badge.
(String, Color) poStageStyle(BuildContext context, PoStage stage) {
  final status = AppStatusColors.of(context);
  return switch (stage) {
    PoStage.collected => ('Collected', status.owned),
    PoStage.ready => ('Ready', status.ready),
    PoStage.paid => ('Paid', status.preOrder),
    PoStage.partial => ('Partial', status.partial),
    PoStage.preorder => ('Pre-order', Theme.of(context).colorScheme.outline),
  };
}
