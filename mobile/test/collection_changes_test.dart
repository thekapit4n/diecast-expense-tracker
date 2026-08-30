import 'package:diecast_mobile/features/collection_changes/collection_changes_data.dart';
import 'package:flutter_test/flutter_test.dart';

CollectionChange _c({
  String reason = 'sold',
  String status = 'active',
  String? paymentStatus = 'received',
  int quantity = 1,
  double gross = 80,
  double postage = 0,
  double fees = 0,
  double cost = 50,
}) {
  return CollectionChange(
    id: 'd1',
    quantity: quantity,
    reason: reason,
    status: status,
    collectionName: 'Some Car',
    brandName: 'Mini GT',
    imageSources: const [],
    grossAmount: gross,
    postageOut: postage,
    fees: fees,
    costPerUnit: cost,
    paymentStatus: paymentStatus,
  );
}

void main() {
  group('netProfit', () {
    test('is sale price minus what the car cost', () {
      expect(_c().netProfit, 30);
    });

    test('subtracts postage and fees, not just the car cost', () {
      expect(_c(postage: 8, fees: 4).netProfit, 18);
    });

    test('goes negative when selling costs outweigh the margin', () {
      expect(_c(gross: 52, postage: 8, fees: 4).netProfit, -10);
    });

    test('multiplies the cost by the units sold', () {
      expect(_c(quantity: 2, gross: 160).netProfit, 60);
    });
  });

  group('isRealisedSale', () {
    test('true for a settled sale', () {
      expect(_c().isRealisedSale, isTrue);
    });

    test('false while a COD is still waiting for money', () {
      expect(_c(paymentStatus: 'pending').isRealisedSale, isFalse);
    });

    test('false once the parcel came back', () {
      expect(_c(status: 'returned').isRealisedSale, isFalse);
    });

    test('false for a gift — a present is not a trade', () {
      expect(_c(reason: 'gift', gross: 0).isRealisedSale, isFalse);
    });
  });

  group('badge', () {
    test('names the reason rather than saying "gone"', () {
      expect(_c(reason: 'gift').badge, 'GIFT');
      expect(_c(reason: 'sold').badge, 'SOLD');
      expect(_c(reason: 'trade').badge, 'TRADED');
      expect(_c(reason: 'lost').badge, 'LOST');
      expect(_c(reason: 'damaged').badge, 'DAMAGED');
    });

    test('falls back rather than showing a raw database value', () {
      expect(_c(reason: 'something-else').badge, 'GONE');
    });
  });

  group('isMoneyReason', () {
    test('only sales and trades carry money', () {
      expect(_c(reason: 'sold').isMoneyReason, isTrue);
      expect(_c(reason: 'trade').isMoneyReason, isTrue);
      expect(_c(reason: 'gift').isMoneyReason, isFalse);
      expect(_c(reason: 'lost').isMoneyReason, isFalse);
    });
  });

  group('searchText', () {
    test('covers the fields the search box offers to match', () {
      const c = CollectionChange(
        id: 'd1',
        quantity: 1,
        reason: 'gift',
        status: 'active',
        collectionName: 'Skyline GT-R',
        itemNo: 'MGT512',
        brandName: 'Mini GT',
        imageSources: [],
        grossAmount: 0,
        postageOut: 0,
        fees: 0,
        costPerUnit: 50,
        counterparty: "Amir's son",
        remark: 'Birthday present',
      );

      expect(c.searchText, contains('skyline'));
      expect(c.searchText, contains('mgt512'));
      expect(c.searchText, contains('mini gt'));
      expect(c.searchText, contains("amir's son"));
      expect(c.searchText, contains('birthday'));
    });
  });
}
