import 'package:diecast_mobile/core/po_status.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('poStage', () {
    test('collected wins over everything', () {
      expect(
        poStage(paymentStatus: 'paid', readyDate: '2026-01-01', collectedDate: '2026-02-01'),
        PoStage.collected,
      );
    });
    test('ready shows before payment states', () {
      expect(
        poStage(paymentStatus: 'unpaid', readyDate: '2026-01-01', collectedDate: null),
        PoStage.ready,
      );
    });
    test('paid vs partial vs pre-order', () {
      expect(poStage(paymentStatus: 'paid', readyDate: null, collectedDate: null), PoStage.paid);
      expect(poStage(paymentStatus: 'partial', readyDate: null, collectedDate: null), PoStage.partial);
      expect(poStage(paymentStatus: 'unpaid', readyDate: null, collectedDate: null), PoStage.preorder);
    });
  });

  group('orderTabForGroup', () {
    test('all collected -> collected tab', () {
      final items = [
        (readyDate: '2026-01-01', collectedDate: '2026-02-01'),
        (readyDate: '2026-01-01', collectedDate: '2026-02-02'),
      ];
      expect(orderTabForGroup(items), OrderTab.collected);
    });
    test('any ready-not-collected -> ready tab', () {
      final items = [
        (readyDate: '2026-01-01', collectedDate: null),
        (readyDate: null, collectedDate: null),
      ];
      expect(orderTabForGroup(items), OrderTab.ready);
    });
    test('none ready, none collected -> pending tab', () {
      final items = [
        (readyDate: null, collectedDate: null),
        (readyDate: null, collectedDate: null),
      ];
      expect(orderTabForGroup(items), OrderTab.pending);
    });
  });

  group('computeAmountPaid', () {
    test('paid pays the full total', () {
      expect(computeAmountPaid(paymentStatus: 'paid', totalPrice: 120), 120);
    });
    test('partial uses the entered amount', () {
      expect(
        computeAmountPaid(paymentStatus: 'partial', totalPrice: 120, partialAmount: 50),
        50,
      );
    });
    test('unpaid/refunded pay nothing', () {
      expect(computeAmountPaid(paymentStatus: 'unpaid', totalPrice: 120), 0);
      expect(computeAmountPaid(paymentStatus: 'refunded', totalPrice: 120), 0);
    });
  });

  group('balanceForItem', () {
    test('collected items owe nothing', () {
      expect(
        balanceForItem(collectedDate: '2026-01-01', totalPrice: 120, amountPaid: 0),
        0,
      );
    });
    test('outstanding is total minus paid', () {
      expect(
        balanceForItem(collectedDate: null, totalPrice: 120, amountPaid: 50),
        70,
      );
    });
    test('never negative when overpaid', () {
      expect(
        balanceForItem(collectedDate: null, totalPrice: 120, amountPaid: 200),
        0,
      );
    });
  });
}
