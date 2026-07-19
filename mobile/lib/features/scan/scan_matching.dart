import '../../data/models/catalog_item.dart';

String _norm(String s) => s.toUpperCase().replaceAll(RegExp(r'\s+'), '');

/// Pull a likely diecast item number out of OCR text.
/// Mini GT boxes print codes like `MGT00012`; we also accept a couple of
/// other common hobby formats. Returns null if nothing convincing is found.
String? extractItemNumber(String text) {
  final upper = text.toUpperCase();

  // Mini GT: MGT + 5 digits (tolerate a stray space and short OCR reads).
  final mgt = RegExp(r'MGT\s?\d{3,5}').firstMatch(upper);
  if (mgt != null) return mgt.group(0)!.replaceAll(RegExp(r'\s'), '');

  // Inno64 style: IN64-XXXX...
  final in64 = RegExp(r'IN64-[A-Z0-9-]{2,}').firstMatch(upper);
  if (in64 != null) return in64.group(0);

  return null;
}

/// Ranked catalog matches for a scan.
///
/// If [itemNumber] is provided, prefers tiles whose item_no contains it (a
/// strong match). Otherwise falls back to matching name/item_no against the
/// meaningful words in [rawText].
List<CatalogItem> matchCatalogItems(
  List<CatalogItem> items, {
  String? itemNumber,
  String? rawText,
}) {
  if (itemNumber != null && itemNumber.isNotEmpty) {
    final target = _norm(itemNumber);
    final strong = items.where((it) {
      final code = _norm(it.itemNo ?? '');
      return code.isNotEmpty && (code.contains(target) || target.contains(code));
    }).toList();
    if (strong.isNotEmpty) return strong;
  }

  final text = rawText ?? '';
  final terms = text
      .toLowerCase()
      .split(RegExp(r'[^a-z0-9]+'))
      .where((t) => t.length >= 3)
      .toSet()
      .toList();
  if (terms.isEmpty) return const [];

  final scored = <(CatalogItem, int)>[];
  for (final it in items) {
    final hay = '${it.name} ${it.itemNo ?? ''}'.toLowerCase();
    final score = terms.where(hay.contains).length;
    if (score > 0) scored.add((it, score));
  }
  scored.sort((a, b) => b.$2.compareTo(a.$2));
  return scored.take(12).map((e) => e.$1).toList();
}
