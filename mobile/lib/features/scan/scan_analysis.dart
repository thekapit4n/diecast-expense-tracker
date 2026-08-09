// OCR line sanitization: strips barcode-length digit runs out of scanned box
// text while keeping everything else (item numbers, brand, model name).
//
// Pure Dart — no ML Kit types — so this is unit-testable without a device.

/// One recognized line of text, with the optional per-line confidence ML Kit
/// reports (not all recognizers populate it, hence nullable).
class ScanTextLine {
  const ScanTextLine({required this.text, this.confidence});

  final String text;
  final double? confidence;
}

/// Barcode-filtered OCR output ready for catalog matching, plus the raw text
/// and whatever barcode-like numbers were stripped out (so the UI can say
/// "a barcode was ignored" instead of silently dropping it).
class ScanTextAnalysis {
  const ScanTextAnalysis({
    required this.rawText,
    required this.usefulText,
    required this.ignoredBarcodeValues,
  });

  final String rawText;
  final String usefulText;
  final List<String> ignoredBarcodeValues;
}

/// Standard barcode symbologies likely to appear on packaging.
const _barcodeDigitLengths = {8, 12, 13, 14}; // GTIN-8, UPC-A, EAN-13, GTIN-14

final _digitToken = RegExp(r'^[\d-]+$');

/// True if [value], once spaces/hyphens are compacted out, is a pure digit
/// run whose length matches a common GTIN/UPC symbology.
bool isLikelyBarcodeDigits(String value) {
  final compact = value.replaceAll(RegExp(r'[\s-]'), '');
  if (compact.isEmpty || !RegExp(r'^\d+$').hasMatch(compact)) return false;
  return _barcodeDigitLengths.contains(compact.length);
}

/// Splits [line] into whitespace tokens and, at each digit-only token, tries
/// the largest run of consecutive digit-only tokens first — so a barcode
/// printed with OCR-introduced gaps (`4 895183 691234`) collapses as one
/// unit instead of surviving as several short, harmless-looking numbers.
/// Everything else — including short numbers like `2024` that never form a
/// barcode-length run — passes through untouched.
({String text, List<String> removed}) _stripBarcodes(String line) {
  final tokens = line.split(RegExp(r'\s+')).where((t) => t.isNotEmpty).toList();
  final kept = <String>[];
  final removed = <String>[];
  const maxWindow = 4;

  var i = 0;
  while (i < tokens.length) {
    if (!_digitToken.hasMatch(tokens[i])) {
      kept.add(tokens[i]);
      i++;
      continue;
    }

    var matchedWindow = 0;
    for (var w = maxWindow; w >= 1; w--) {
      if (i + w > tokens.length) continue;
      final window = tokens.sublist(i, i + w);
      if (!window.every((t) => _digitToken.hasMatch(t))) continue;
      final compact = window.join('');
      if (isLikelyBarcodeDigits(compact)) {
        removed.add(window.join(' '));
        matchedWindow = w;
        break;
      }
    }

    if (matchedWindow > 0) {
      i += matchedWindow;
    } else {
      kept.add(tokens[i]);
      i++;
    }
  }

  return (text: kept.join(' ').trim(), removed: removed);
}

/// Removes barcode-length digit runs from [line], keeping the rest of the
/// text intact (including short numbers like a scale or year).
String removeLikelyBarcodeNumbers(String line) => _stripBarcodes(line).text;

/// Runs barcode filtering across every OCR line and assembles the combined
/// result used for catalog matching.
ScanTextAnalysis analyseOcrLines(List<ScanTextLine> lines) {
  final rawText = lines.map((l) => l.text).join('\n');
  final usefulLines = <String>[];
  final ignored = <String>[];

  for (final line in lines) {
    final stripped = _stripBarcodes(line.text);
    if (stripped.text.isNotEmpty) usefulLines.add(stripped.text);
    ignored.addAll(stripped.removed);
  }

  return ScanTextAnalysis(
    rawText: rawText,
    usefulText: usefulLines.join('\n'),
    ignoredBarcodeValues: ignored,
  );
}
