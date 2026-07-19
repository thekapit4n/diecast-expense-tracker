import 'package:diecast_mobile/data/models/catalog_item.dart';
import 'package:diecast_mobile/features/scan/scan_matching.dart';
import 'package:flutter_test/flutter_test.dart';

CatalogItem _item({
  required String id,
  required String name,
  String? itemNo,
  int owned = 0,
  int preorder = 0,
}) =>
    CatalogItem(
      id: id,
      name: name,
      itemNo: itemNo,
      scale: '1:64',
      remark: null,
      brandName: 'Mini GT',
      brandId: 1,
      isChase: false,
      isCase: false,
      totalQty: owned,
      preOrderQty: preorder,
      imageSources: const [],
      purchases: const [],
    );

void main() {
  group('extractItemNumber', () {
    test('reads a Mini GT code from noisy OCR text', () {
      const ocr = 'MINI GT\nNissan Skyline GT-R\nScale 1:64\nMGT00012';
      expect(extractItemNumber(ocr), 'MGT00012');
    });

    test('tolerates a stray space in the code', () {
      expect(extractItemNumber('code MGT 00009 here'), 'MGT00009');
    });

    test('reads an Inno64 code', () {
      expect(extractItemNumber('IN64-RWB993-TDE26 white'), 'IN64-RWB993-TDE26');
    });

    test('returns null when no code is present', () {
      expect(extractItemNumber('just some random box text'), isNull);
    });
  });

  group('matchCatalogItems', () {
    final catalog = [
      _item(id: '1', name: 'Nissan Skyline GT-R', itemNo: 'MGT00012', owned: 2, preorder: 1),
      _item(id: '2', name: 'Toyota Supra A80', itemNo: 'MGT00009'),
      _item(id: '3', name: 'Porsche RWB 993', itemNo: 'IN64-RWB993-TDE26'),
    ];

    test('item number match returns the exact tile', () {
      final r = matchCatalogItems(catalog, itemNumber: 'MGT00012');
      expect(r, hasLength(1));
      expect(r.first.id, '1');
    });

    test('the matched item exposes owned/pre-order counts for the warning', () {
      final top = matchCatalogItems(catalog, itemNumber: 'MGT00012').first;
      expect(top.totalQty, 2);
      expect(top.preOrderQty, 1);
    });

    test('falls back to name search when no item number', () {
      final r = matchCatalogItems(catalog, rawText: 'toyota supra');
      expect(r.first.id, '2');
    });

    test('returns empty when nothing matches', () {
      expect(matchCatalogItems(catalog, itemNumber: 'MGT99999', rawText: 'zzz'),
          isEmpty);
    });
  });
}
