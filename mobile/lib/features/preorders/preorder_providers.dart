import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/po_item.dart';
import '../../data/repositories/purchase_repository.dart';

final purchaseRepositoryProvider =
    Provider<PurchaseRepository>((ref) => PurchaseRepository());

/// All PO line items (tbl_purchase rows linked to a PO order).
final poItemsProvider = FutureProvider.autoDispose<List<PoItem>>((ref) {
  return ref.read(purchaseRepositoryProvider).fetchPoItems();
});

/// Shops for the purchase form dropdown.
final shopsProvider = FutureProvider.autoDispose<List<Shop>>((ref) {
  return ref.read(purchaseRepositoryProvider).fetchShops();
});
