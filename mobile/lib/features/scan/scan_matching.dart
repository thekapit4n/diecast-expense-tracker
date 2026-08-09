import '../../data/models/catalog_item.dart';

/// How confident a [ScanMatch] is, most to least certain. A fuzzy item-number
/// match can never reach [exact] — only an exact normalized item-number
/// occurrence does.
enum ScanConfidence { exact, likely, possible }

/// One ranked catalog candidate for a scan, with a human-readable trail of
/// why it matched so the result screen doesn't have to guess.
class ScanMatch {
  const ScanMatch({
    required this.item,
    required this.score,
    required this.confidence,
    required this.reasons,
  });

  final CatalogItem item;

  /// Normalized 0.0–1.0; only meaningful for ordering matches against each
  /// other, not as an absolute probability.
  final double score;
  final ScanConfidence confidence;
  final List<String> reasons;
}

/// Generic packaging text that carries no identifying signal on its own —
/// excluded from model-name coverage so a box covered in only this kind of
/// text doesn't falsely match something.
const _packagingStopwords = {
  'scale',
  'diecast',
  'model',
  'collectible',
  'limited',
  'edition',
  'official',
  'product',
  'warning',
  'made',
  'china',
  'ages',
};

/// OCR digit/letter confusions, applied only while comparing a candidate
/// token to a known catalog item number — never to model-name text, which
/// would corrupt ordinary words (see module docs on why this stays scoped).
const _ocrConfusable = {'O': '0', 'I': '1', 'L': '1', 'S': '5', 'Z': '2'};

String _normItemNo(String s) =>
    s.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');

String _confusableFold(String s) =>
    s.split('').map((c) => _ocrConfusable[c] ?? c).join();

int _editDistance(String a, String b) {
  final m = a.length, n = b.length;
  final prev = List<int>.generate(n + 1, (j) => j);
  final curr = List<int>.filled(n + 1, 0);
  for (var i = 1; i <= m; i++) {
    curr[0] = i;
    for (var j = 1; j <= n; j++) {
      final cost = a[i - 1] == b[j - 1] ? 0 : 1;
      curr[j] = [
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      ].reduce((x, y) => x < y ? x : y);
    }
    for (var j = 0; j <= n; j++) {
      prev[j] = curr[j];
    }
  }
  return prev[n];
}

/// Best-effort quick read of a Mini GT / Inno64 style code, used only for the
/// "detected item no" display hint — the real matching below scans the whole
/// catalog instead of depending on this.
String? extractItemNumber(String text) {
  final upper = text.toUpperCase();

  final mgt = RegExp(r'MGT\s?\d{3,5}').firstMatch(upper);
  if (mgt != null) return mgt.group(0)!.replaceAll(RegExp(r'\s'), '');

  final in64 = RegExp(r'IN64-[A-Z0-9-]{2,}').firstMatch(upper);
  if (in64 != null) return in64.group(0);

  return null;
}

/// Alphanumeric/hyphenated tokens long enough to plausibly be an item number.
List<String> _itemNoCandidates(String text) => text
    .split(RegExp(r'[^A-Za-z0-9-]+'))
    .where((t) => t.length >= 4)
    .toSet()
    .toList();

/// Lowercase, stopword-filtered significant words (length ≥ 3).
Set<String> _significantWords(String text, {bool dropStopwords = false}) {
  final words = text
      .toLowerCase()
      .split(RegExp(r'[^a-z0-9]+'))
      .where((w) => w.length >= 3)
      .toSet();
  if (!dropStopwords) return words;
  return words.difference(_packagingStopwords);
}

/// Ranks [items] against OCR text already filtered of barcode numbers
/// ([usefulText] — see [analyseOcrLines]/[removeLikelyBarcodeNumbers]).
///
/// Exact normalized item-number occurrences win outright. Only when no
/// catalog item has one does a fuzzy item-number comparison, brand phrase, or
/// model-name token coverage contribute — each is a separate, capped signal
/// so no single loose word can produce a false "exact" result.
List<ScanMatch> matchCatalogItems(List<CatalogItem> items, String usefulText) {
  final candidates = _itemNoCandidates(usefulText);
  final ocrWords = _significantWords(usefulText);
  final ocrTextLower = usefulText.toLowerCase().replaceAll(RegExp(r'\s+'), ' ');

  final results = <ScanMatch>[];

  for (final item in items) {
    final catalogNorm = _normItemNo(item.itemNo ?? '');

    if (catalogNorm.isNotEmpty) {
      // 1) Exact normalized item-number occurrence — the strongest possible
      // signal, so it short-circuits every other check for this item.
      final hasExact = candidates.any((c) => _normItemNo(c) == catalogNorm);
      if (hasExact) {
        results.add(
          ScanMatch(
            item: item,
            score: 1,
            confidence: ScanConfidence.exact,
            reasons: ['Item number ${item.itemNo}'],
          ),
        );
        continue;
      }

      // 2) Fuzzy item-number comparison — only reached when no catalog item
      // matched exactly. Capped well below an exact score/confidence.
      final maxEdits = catalogNorm.length > 8 ? 2 : 1;
      final foldedCatalog = _confusableFold(catalogNorm);
      String? bestFuzzy;
      var bestDistance = maxEdits + 1;
      for (final c in candidates) {
        final normC = _normItemNo(c);
        if (normC.length < 4) continue;
        final lengthDiff = (normC.length - catalogNorm.length).abs();
        if (lengthDiff > maxEdits) continue;
        final distance = _editDistance(_confusableFold(normC), foldedCatalog);
        if (distance <= maxEdits && distance < bestDistance) {
          bestDistance = distance;
          bestFuzzy = c;
        }
      }
      if (bestFuzzy != null) {
        results.add(
          ScanMatch(
            item: item,
            score: 0.7,
            confidence: ScanConfidence.likely,
            reasons: ['Item number close to ${item.itemNo} (OCR noise)'],
          ),
        );
        continue;
      }
    }

    // 3) No usable item-number signal — fall back to brand phrase + model
    // name token coverage, both of which ignore packaging stopwords.
    final brandPhrase = item.brandName.trim().toLowerCase();
    final brandHit =
        brandPhrase.isNotEmpty && ocrTextLower.contains(brandPhrase);

    final nameWords = _significantWords(item.name, dropStopwords: true);
    final matchedWords = nameWords.intersection(ocrWords);
    final modelCoverage = nameWords.isEmpty
        ? 0.0
        : matchedWords.length / nameWords.length;

    if (!brandHit && modelCoverage == 0) continue; // no signal at all

    final score = (brandHit ? 0.4 : 0.0) + modelCoverage * 0.6;
    final confidence = brandHit && modelCoverage >= 0.6
        ? ScanConfidence.likely
        : ScanConfidence.possible;

    final reasons = [
      if (brandHit) 'Brand ${item.brandName}',
      if (modelCoverage > 0)
        'Model name match (${(modelCoverage * 100).round()}%)',
    ];
    results.add(
      ScanMatch(
        item: item,
        score: score,
        confidence: confidence,
        reasons: reasons,
      ),
    );
  }

  results.sort((a, b) {
    final byConfidence = a.confidence.index.compareTo(b.confidence.index);
    if (byConfidence != 0) return byConfidence;
    return b.score.compareTo(a.score);
  });
  return results.take(12).toList();
}
