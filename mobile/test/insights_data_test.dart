import 'package:diecast_mobile/data/models/purchase.dart';
import 'package:diecast_mobile/features/insights/insights_data.dart';
import 'package:flutter_test/flutter_test.dart';

/// A paid, collected (therefore owned) purchase unless overridden.
Purchase _p({
  String? collectionId = 'c1',
  String? brandName = 'Mini GT',
  String? shopName = 'Toy Shop',
  int quantity = 1,
  double? totalPrice = 100,
  double amountPaid = 100,
  String? paymentStatus = 'paid',
  String? paymentDate = '2026-08-05',
  String? collectedDate = '2026-08-05',
  String? poOrderId,
  bool isChase = false,
}) {
  return Purchase(
    collectionId: collectionId,
    collectionName: 'Some Car',
    itemNo: 'MGT001',
    brandName: brandName,
    shopName: shopName,
    quantity: quantity,
    pricePerUnit: totalPrice == null ? null : totalPrice / quantity,
    totalPrice: totalPrice,
    amountPaid: amountPaid,
    paymentStatus: paymentStatus,
    paymentDate: paymentDate,
    poOrderId: poOrderId,
    readyDate: null,
    collectedDate: collectedDate,
    isChase: isChase,
    createdAt: null,
  );
}

final _now = DateTime(2026, 8, 7);

void main() {
  group('buildInsights month buckets', () {
    test('splits spend into this month and last month by payment_date', () {
      final d = buildInsights([
        _p(paymentDate: '2026-08-01', amountPaid: 50),
        _p(paymentDate: '2026-08-20', amountPaid: 30),
        _p(paymentDate: '2026-07-15', amountPaid: 40),
      ], _now);

      expect(d.thisMonth, 80);
      expect(d.lastMonth, 40);
      expect(d.monthOverMonth, 1.0); // 80 vs 40 = up 100%
    });

    test('monthOverMonth is null when last month had no spend', () {
      final d = buildInsights([_p(paymentDate: '2026-08-01', amountPaid: 50)], _now);
      expect(d.lastMonth, 0);
      expect(d.monthOverMonth, isNull);
    });

    test('trend is zero-filled, oldest first, and ends on the current month', () {
      final d = buildInsights([_p(paymentDate: '2026-06-10', amountPaid: 25)], _now);

      expect(d.recentMonths, hasLength(monthsOfHistory));
      expect(d.recentMonths.first.month, 3); // Mar
      expect(d.recentMonths.last.month, 8); // Aug
      expect(d.recentMonths.map((m) => m.amount), [0, 0, 0, 25, 0, 0]);
    });

    test('trend spans a year boundary', () {
      final d = buildInsights(
        [_p(paymentDate: '2025-12-01', amountPaid: 10)],
        DateTime(2026, 2, 3),
      );
      expect(d.recentMonths.first.year, 2025);
      expect(d.recentMonths.first.month, 9);
      expect(d.recentMonths.last.year, 2026);
      expect(d.recentMonths.last.month, 2);
      expect(d.recentMonths.firstWhere((m) => m.month == 12).amount, 10);
    });

    test('a payment with no date still counts toward total spend', () {
      final d = buildInsights([_p(paymentDate: null, amountPaid: 60)], _now);
      expect(d.totalSpend, 60);
      expect(d.thisMonth, 0);
    });
  });

  group('buildInsights breakdowns', () {
    test('rolls up by brand and by shop, highest spend first', () {
      final d = buildInsights([
        _p(brandName: 'Mini GT', shopName: 'A', totalPrice: 100),
        _p(brandName: 'Mini GT', shopName: 'B', totalPrice: 50, quantity: 2),
        _p(brandName: 'Inno64', shopName: 'A', totalPrice: 200),
      ], _now);

      expect(d.topBrands.map((b) => b.label), ['Inno64', 'Mini GT']);
      expect(d.topBrands.first.amount, 200);
      expect(d.topBrands.last.units, 3);

      expect(d.topShops.map((s) => s.label), ['A', 'B']);
      expect(d.topShops.first.amount, 300);
    });

    test('caps each breakdown at five rows', () {
      final d = buildInsights([
        for (var i = 0; i < 8; i++)
          _p(brandName: 'Brand $i', totalPrice: (i + 1) * 10),
      ], _now);
      expect(d.topBrands, hasLength(5));
      expect(d.topBrands.first.label, 'Brand 7');
    });

    test('ignores blank and missing brand/shop names', () {
      final d = buildInsights([
        _p(brandName: null, shopName: '  '),
        _p(brandName: 'Mini GT', shopName: 'A'),
      ], _now);
      expect(d.topBrands.map((b) => b.label), ['Mini GT']);
      expect(d.topShops.map((s) => s.label), ['A']);
    });

    test('excludes items that are not owned yet', () {
      // An unpaid, uncollected pre-order line.
      final d = buildInsights([
        _p(
          paymentStatus: 'unpaid',
          amountPaid: 0,
          paymentDate: null,
          collectedDate: null,
          poOrderId: 'po1',
          brandName: 'Mini GT',
        ),
      ], _now);

      expect(d.topBrands, isEmpty);
      expect(d.unitsOwned, 0);
      expect(d.collectionValue, 0);
    });
  });

  group('buildInsights collection facts', () {
    test('counts units, distinct models and chase units', () {
      final d = buildInsights([
        _p(collectionId: 'c1', quantity: 2, totalPrice: 100),
        _p(collectionId: 'c1', quantity: 1, totalPrice: 50, isChase: true),
        _p(collectionId: 'c2', quantity: 1, totalPrice: 50),
      ], _now);

      expect(d.unitsOwned, 4);
      expect(d.modelsOwned, 2);
      expect(d.chaseUnits, 1);
      expect(d.collectionValue, 200);
      expect(d.avgPerUnit, 50);
      expect(d.avgPerModel, 100);
    });

    test('averages are zero rather than NaN on an empty collection', () {
      final d = buildInsights([], _now);
      expect(d.avgPerUnit, 0);
      expect(d.avgPerModel, 0);
      expect(d.recentMonths, hasLength(monthsOfHistory));
    });
  });
}
