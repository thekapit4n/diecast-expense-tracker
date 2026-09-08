import 'package:diecast_mobile/core/ownership.dart';
import 'package:diecast_mobile/data/disposals.dart';
import 'package:diecast_mobile/data/models/purchase.dart';
import 'package:flutter_test/flutter_test.dart';

/// A paid, collected (therefore owned) purchase unless overridden.
Purchase _p({
  String? id = 'p1',
  int quantity = 1,
  int disposedQty = 0,
  String? paymentStatus = 'paid',
  String? collectedDate = '2026-08-05',
  String? poOrderId,
}) {
  return Purchase(
    id: id,
    collectionId: 'c1',
    collectionName: 'Some Car',
    itemNo: 'MGT001',
    brandName: 'Mini GT',
    shopName: 'Toy Shop',
    quantity: quantity,
    pricePerUnit: 50,
    totalPrice: 50.0 * quantity,
    amountPaid: 50.0 * quantity,
    paymentStatus: paymentStatus,
    paymentDate: '2026-08-05',
    poOrderId: poOrderId,
    readyDate: null,
    collectedDate: collectedDate,
    isChase: false,
    editionType: null,
    createdAt: 1,
    disposedQty: disposedQty,
  );
}

void main() {
  group('ownedQuantity', () {
    test('counts every unit when nothing has left', () {
      expect(ownedQuantity(_p(quantity: 2)), 2);
    });

    test('drops to zero once the only unit is given away', () {
      expect(ownedQuantity(_p(quantity: 1, disposedQty: 1)), 0);
    });

    test('subtracts only the units that left from a multi-unit purchase', () {
      expect(ownedQuantity(_p(quantity: 3, disposedQty: 1)), 2);
    });

    test('never goes negative if the data is inconsistent', () {
      expect(ownedQuantity(_p(quantity: 1, disposedQty: 5)), 0);
    });

    test('stays zero for an unpaid purchase regardless of disposals', () {
      expect(ownedQuantity(_p(paymentStatus: 'unpaid')), 0);
    });

    test('stays zero for a PO item that has not been collected', () {
      expect(
        ownedQuantity(_p(poOrderId: 'po1', collectedDate: null)),
        0,
      );
    });
  });

  group('applyDisposals', () {
    test('stamps the disposed count onto the matching purchase', () {
      final result = applyDisposals([_p(id: 'p1', quantity: 2)], {'p1': 1});
      expect(result.single.disposedQty, 1);
      expect(ownedQuantity(result.single), 1);
    });

    test('leaves purchases with no disposal untouched', () {
      final result = applyDisposals([_p(id: 'p2', quantity: 2)], {'p1': 1});
      expect(result.single.disposedQty, 0);
      expect(ownedQuantity(result.single), 2);
    });

    test('returns the list unchanged when there are no disposals at all', () {
      final input = [_p(quantity: 2)];
      expect(identical(applyDisposals(input, {}), input), isTrue);
    });
  });
}
