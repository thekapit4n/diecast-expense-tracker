import 'package:diecast_mobile/data/models/catalog_item.dart';
import 'package:diecast_mobile/features/scan/scan_analysis.dart';
import 'package:diecast_mobile/features/scan/scan_matching.dart';
import 'package:diecast_mobile/features/scan/scan_result_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

CatalogItem _item({
  required String id,
  required String name,
  String? itemNo,
  String brandName = 'Mini GT',
  bool isChase = false,
  int owned = 0,
  int preorder = 0,
}) => CatalogItem(
  id: id,
  name: name,
  itemNo: itemNo,
  scale: '1:64',
  remark: null,
  brandName: brandName,
  brandId: 1,
  isChase: isChase,
  isCase: false,
  totalQty: owned,
  preOrderQty: preorder,
  imageSources: const [],
  purchases: const [],
);

void main() {
  group('extractItemNumber (display hint only)', () {
    test('reads a Mini GT code from noisy OCR text', () {
      const ocr = 'MINI GT\nNissan Skyline GT-R\nScale 1:64\nMGT00012';
      expect(extractItemNumber(ocr), 'MGT00012');
    });

    test('reads an Inno64 code', () {
      expect(extractItemNumber('IN64-RWB993-TDE26 white'), 'IN64-RWB993-TDE26');
    });

    test('returns null when no code is present', () {
      expect(extractItemNumber('just some random box text'), isNull);
    });
  });

  group('isLikelyBarcodeDigits / removeLikelyBarcodeNumbers', () {
    test('a bare EAN-13 value is ignored', () {
      expect(isLikelyBarcodeDigits('4895183691234'), isTrue);
      expect(removeLikelyBarcodeNumbers('4895183691234'), isEmpty);
    });

    test(
      'spaced or hyphenated 8/12/13/14-digit barcode values are ignored',
      () {
        expect(isLikelyBarcodeDigits('12345678'), isTrue); // GTIN-8
        expect(isLikelyBarcodeDigits('123456789012'), isTrue); // UPC-A
        expect(
          isLikelyBarcodeDigits('4 895183 691234'),
          isTrue,
        ); // EAN-13, spaced
        expect(
          isLikelyBarcodeDigits('1-234567-890123'),
          isTrue,
        ); // EAN-13, hyphenated
        expect(isLikelyBarcodeDigits('12345678901234'), isTrue); // GTIN-14

        expect(removeLikelyBarcodeNumbers('4 895183 691234'), isEmpty);
        expect(removeLikelyBarcodeNumbers('1-234567-890123'), isEmpty);
      },
    );

    test('MGT00012 is retained even when printed beside a barcode value', () {
      expect(removeLikelyBarcodeNumbers('MGT00012 4895183691234'), 'MGT00012');
    });

    test('alphanumeric codes, scale, and year are never removed', () {
      for (final line in ['IN64-RWB993-TDE26', 'R34', '1:64', '2024']) {
        expect(removeLikelyBarcodeNumbers(line), line);
      }
    });

    test('a numeric sequence embedded in useful text is removed without '
        'deleting the rest of the line', () {
      expect(
        removeLikelyBarcodeNumbers(
          'SCALE 1:64 4895183691234 DIECAST MODEL CAR',
        ),
        'SCALE 1:64 DIECAST MODEL CAR',
      );
    });

    test('a short, non-barcode-length number is left alone', () {
      expect(isLikelyBarcodeDigits('2024'), isFalse);
      expect(
        removeLikelyBarcodeNumbers('Nissan Skyline GT-R R34 2024'),
        'Nissan Skyline GT-R R34 2024',
      );
    });
  });

  group('analyseOcrLines', () {
    test('strips barcodes across lines and reports what was ignored', () {
      const lines = [
        ScanTextLine(text: 'MINI GT'),
        ScanTextLine(text: 'Nissan Skyline GT-R'),
        ScanTextLine(text: 'MGT00012'),
        ScanTextLine(text: '4895183691234'),
      ];
      final analysis = analyseOcrLines(lines);

      expect(analysis.rawText, contains('4895183691234'));
      expect(analysis.usefulText, isNot(contains('4895183691234')));
      expect(analysis.usefulText, contains('MGT00012'));
      expect(analysis.ignoredBarcodeValues, contains('4895183691234'));
    });
  });

  group('matchCatalogItems', () {
    final catalog = [
      _item(
        id: '1',
        name: 'Nissan Skyline GT-R',
        itemNo: 'MGT00012',
        owned: 2,
        preorder: 1,
      ),
      _item(id: '2', name: 'Toyota Supra A80', itemNo: 'MGT00009'),
      _item(
        id: '3',
        name: 'Porsche RWB 993',
        itemNo: 'IN64-RWB993-TDE26',
        brandName: 'Inno64',
      ),
    ];

    test(
      'exact item number ranks the correct catalog item first with exact confidence',
      () {
        final r = matchCatalogItems(catalog, 'MGT00012');
        expect(r, isNotEmpty);
        expect(r.first.item.id, '1');
        expect(r.first.confidence, ScanConfidence.exact);
      },
    );

    test(
      'the matched item exposes owned/pre-order counts for the duplicate warning',
      () {
        final top = matchCatalogItems(catalog, 'MGT00012').first;
        expect(top.item.totalQty, 2);
        expect(top.item.preOrderQty, 1);
      },
    );

    test('a one-character OCR mistake produces likely, never exact', () {
      final r = matchCatalogItems(catalog, 'MGT00013'); // real code is MGT00012
      final m = r.firstWhere((m) => m.item.id == '1');
      expect(m.confidence, ScanConfidence.likely);
      expect(r.any((m) => m.confidence == ScanConfidence.exact), isFalse);
    });

    test('a short prefix does not become an exact (or fuzzy) match', () {
      final r = matchCatalogItems(catalog, 'MGT000');
      expect(r.where((m) => m.item.id == '1'), isEmpty);
      expect(r.any((m) => m.confidence == ScanConfidence.exact), isFalse);
    });

    test('brand plus model name produces a likely result when the item '
        'number is unreadable', () {
      final r = matchCatalogItems(catalog, 'MINI GT NISSAN SKYLINE GT-R');
      final m = r.firstWhere((m) => m.item.id == '1');
      expect(m.confidence, ScanConfidence.likely);
      expect(m.reasons, isNotEmpty);
    });

    test('generic packaging words alone produce no matches', () {
      final r = matchCatalogItems(
        catalog,
        'SCALE DIECAST MODEL COLLECTIBLE LIMITED EDITION OFFICIAL PRODUCT '
        'WARNING MADE CHINA AGES',
      );
      expect(r, isEmpty);
    });

    test(
      'an unknown box returns an empty result rather than an arbitrary first item',
      () {
        final r = matchCatalogItems(
          catalog,
          'RANDOM UNRELATED BOX TEXT XYZQPR HELLO WORLD',
        );
        expect(r, isEmpty);
      },
    );

    test(
      'normal and chase tiles sharing one item number are both retained for confirmation',
      () {
        final catalogWithChase = [
          ...catalog,
          _item(
            id: '1-chase',
            name: 'Nissan Skyline GT-R',
            itemNo: 'MGT00012',
            isChase: true,
          ),
        ];
        final r = matchCatalogItems(catalogWithChase, 'MGT00012');
        expect(r.map((m) => m.item.id).toSet(), {'1', '1-chase'});
        expect(r.every((m) => m.confidence == ScanConfidence.exact), isTrue);
      },
    );
  });

  group('ScanResultScreen duplicate warning', () {
    const analysis = ScanTextAnalysis(
      rawText: 'x',
      usefulText: 'x',
      ignoredBarcodeValues: [],
    );
    final ownedItem = _item(
      id: '1',
      name: 'Nissan Skyline GT-R',
      itemNo: 'MGT00012',
      owned: 2,
    );

    testWidgets('is not shown for a merely possible top match', (tester) async {
      final match = ScanMatch(
        item: ownedItem,
        score: 0.3,
        confidence: ScanConfidence.possible,
        reasons: const ['Model name match (40%)'],
      );
      await tester.pumpWidget(
        MaterialApp(
          home: ScanResultScreen(analysis: analysis, matches: [match]),
        ),
      );

      expect(find.text('Already in your collection'), findsNothing);
    });

    testWidgets('is shown for an unambiguous exact top match', (tester) async {
      final match = ScanMatch(
        item: ownedItem,
        score: 1,
        confidence: ScanConfidence.exact,
        reasons: const ['Item number MGT00012'],
      );
      await tester.pumpWidget(
        MaterialApp(
          home: ScanResultScreen(analysis: analysis, matches: [match]),
        ),
      );

      expect(find.text('Already in your collection'), findsOneWidget);
    });
  });
}
