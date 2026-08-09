# Smart Image Scanner — Implementation Plan

## Objective

Replace the current barcode-first scanner with a text-first box scanner that:

- Captures a diecast box using the camera or gallery.
- Reads the whole box using on-device OCR.
- Ignores barcode numbers without discarding nearby item information.
- Matches OCR text against the existing catalog using item number, brand, and model name.
- Shows confidence and match reasons instead of treating the first loose result as correct.
- Keeps image similarity as a later enhancement for reranking uncertain OCR matches.

The database does not store barcodes, so barcode values must never be used as an
item number or catalog lookup key.

## Current Implementation and Root Causes

Relevant files:

- `mobile/lib/features/scan/scan_screen.dart`
- `mobile/lib/features/scan/scan_matching.dart`
- `mobile/lib/features/scan/scan_result_screen.dart`
- `mobile/lib/features/catalog/catalog_data.dart`
- `mobile/test/scan_matching_test.dart`

Current problems:

1. `ScanScreen` presents a live barcode scanner as the primary experience even
   though the catalog has no barcode field.
2. `_searchBarcode` sends a barcode value into `matchCatalogItems` as if it were
   an item number. A GTIN such as `4895183691234` cannot match `MGT00012`.
3. Camera capture and gallery run OCR, but `_ocr` returns only `result.text`.
   OCR line positions, confidence, and structure are discarded.
4. Item-number extraction is hardcoded to Mini GT and Inno64 patterns.
5. Partial item numbers are treated as strong matches through bidirectional
   `contains`. A short or damaged OCR result can therefore rank the wrong item.
6. Generic packaging words can influence fallback matching, and results do not
   expose a score or reason.
7. The scan result page uses the first result for the duplicate warning even if
   the match is uncertain.

## Product Decision

Phase 1 must be text-first and on-device. It must not require a new backend,
paid vision API, barcode database, or custom machine-learning model.

Use the dependencies already present:

- `image_picker` for camera and gallery images.
- `google_mlkit_text_recognition` for OCR.

Remove the live barcode-first UI and all barcode lookup behavior. The
`mobile_scanner` dependency may be removed after confirming it has no other
usage in `mobile/`.

Do not mask or crop the whole barcode region in Phase 1. Product information is
often printed next to the barcode. Instead, remove only text sequences that
look like pure GTIN/UPC values.

## Phase 1 Architecture

```text
Camera or gallery image
        |
        v
Google ML Kit OCR
        |
        v
Structured OCR lines
        |
        +--> preserve raw text for diagnostics
        |
        v
Remove pure barcode-number sequences
        |
        v
Normalize text and build catalog-aware candidates
        |
        +--> exact normalized item number
        +--> fuzzy item-number comparison
        +--> brand phrase/token match
        +--> model-name token coverage
        |
        v
Ranked ScanMatch results with confidence and reasons
        |
        v
Result screen: exact / likely / possible match
```

### 1. Structured OCR result

Change the OCR layer so it does not immediately flatten everything into one
string. Iterate through `RecognizedText.blocks` and `TextLine` values.

Introduce pure Dart structures so matching can be unit tested without loading
ML Kit:

```dart
class ScanTextLine {
  const ScanTextLine({
    required this.text,
    this.confidence,
  });

  final String text;
  final double? confidence;
}

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
```

Bounding boxes may be retained for future overlays, but they are not required
for Phase 1 matching.

### 2. Barcode-number filtering

Ignore only pure numeric sequences with common GTIN/UPC lengths:

- GTIN-8: 8 digits
- UPC-A: 12 digits
- EAN-13: 13 digits
- GTIN-14: 14 digits

Whitespace and hyphens may appear between digits due to OCR. Compact them
before checking the length.

Examples that must be ignored:

```text
4895183691234
4 895183 691234
1-234567-890123
```

Examples that must be retained:

```text
MGT00012
IN64-RWB993-TDE26
Nissan Skyline GT-R R34
1:64
2024
```

If a long barcode number occurs inside a line containing other useful text,
remove only that numeric sequence and keep the rest of the line. Do not discard
the entire line.

Suggested pure functions:

```dart
bool isLikelyBarcodeDigits(String value);
String removeLikelyBarcodeNumbers(String line);
ScanTextAnalysis analyseOcrLines(List<ScanTextLine> lines);
```

### 3. Catalog-aware item-number matching

Do not depend only on hardcoded regular expressions. The catalog already
contains the authoritative `itemNo` values.

For every catalog item:

1. Normalize its item number to uppercase alphanumeric characters.
2. Normalize OCR text the same way for exact containment checks.
3. Rank an exact catalog item-number occurrence above every other signal.
4. Only use fuzzy comparison when no exact item number exists.

Keep brand-specific parsing such as Mini GT as an optional candidate extractor,
not as the source of truth.

OCR substitutions such as `O/0`, `I/1`, `L/1`, `S/5`, and `Z/2` must only be
applied while comparing a candidate to a known catalog item number. Do not
globally mutate model names.

Use edit distance carefully:

- Allow at most one edit for short-to-medium item numbers.
- Allow at most two edits only for longer item numbers.
- A fuzzy item-number match must never have the same confidence as an exact
  match.
- Partial prefix matches such as `MGT000` must not be labelled exact.

### 4. Weighted result model

Replace the bare `List<CatalogItem>` ranking result with an explainable model:

```dart
enum ScanConfidence { exact, likely, possible }

class ScanMatch {
  const ScanMatch({
    required this.item,
    required this.score,
    required this.confidence,
    required this.reasons,
  });

  final CatalogItem item;
  final double score; // normalized 0.0 to 1.0
  final ScanConfidence confidence;
  final List<String> reasons;
}
```

Recommended weighting:

| Signal | Contribution |
|---|---:|
| Exact normalized item number | enough to produce `exact` |
| Fuzzy item number | strong, but capped below `exact` |
| Exact brand phrase | medium |
| Model-name token coverage | medium |
| Generic packaging words | zero |

Suggested confidence rules:

- `exact`: exact normalized item-number match.
- `likely`: high fuzzy item-number score, or strong brand plus model-name match.
- `possible`: meaningful model/brand overlap but insufficient evidence.

The implementation may tune numerical weights, but these semantic rules must
remain true.

Useful packaging stopwords should not contribute to model matching, for
example:

```text
scale, diecast, model, collectible, limited, edition, official, product,
warning, made, china, ages
```

Brand words must not be placed in the generic stopword list. For example,
`MINI GT` remains a useful brand signal.

### 5. Chase/normal variants

The catalog can produce normal and chase tiles for the same base collection.
OCR usually cannot prove which variant is in the box.

- Do not silently select one variant because it happens to be first.
- Preserve both variants when they share the same exact item number.
- Label the variant clearly and let the user confirm it.
- Only show a top-level duplicate warning automatically when the leading match
  is unambiguous. Otherwise show ownership/pre-order counts on each candidate.

### 6. Scanner UX

Replace the barcode-first camera view with a clear text-scanning entry screen:

- App bar title: `Scan Box`.
- Primary action: `Take photo`.
- Secondary action: `Choose from gallery`.
- Instruction: `Capture the item number, brand and model name clearly.`
- Tip: `The barcode number will be ignored automatically.`

Processing states should be explicit rather than showing an unexplained
spinner:

1. `Reading box text...`
2. `Searching catalog...`
3. `Preparing matches...`

Use one shared processing pipeline for camera and gallery. Guard against double
submissions, handle cancellation without showing an error, reset busy state in
`finally`, and check `mounted` before navigation or UI updates.

The native camera provided by `image_picker` remains acceptable for Phase 1.
A custom live preview and auto-capture would require the `camera` package and is
deliberately deferred to avoid mixing camera lifecycle work with matching
correctness.

### 7. Result screen UX

The result page should show:

- Detected useful text, with long raw OCR content collapsed by default.
- A note when a barcode-like number was ignored.
- Confidence label for each match.
- Match reasons such as `Item number MGT00012`, `Brand Mini GT`, or
  `Model name match`.
- Exact results before likely and possible results.
- A clear empty state with actions to retake the photo, choose another image,
  or open Catalog for manual search.

Do not show a duplicate warning based solely on the first possible match.

## Phase 2: Image Similarity

Image similarity should only be added after Phase 1 is reliable. Generic image
labelling can identify concepts such as `car`, `toy`, or `box`, but it will not
reliably identify a specific Mini GT SKU.

Recommended design:

1. Precompute an image embedding for each catalog image on the server.
2. Store the embedding with its base `collection_id` and image source.
3. Generate an embedding for the captured box image.
4. Compare it only against the OCR shortlist, not the entire catalog.
5. Use similarity to rerank candidates; never override an exact item-number
   match.
6. Let the user confirm the result and record corrections for future tuning.

This phase requires a deliberate choice between a cloud vision/embedding API
and an on-device model. Do not add API keys, paid services, or a large bundled
model without explicit approval.

## Files to Change in Phase 1

Expected changes:

- `mobile/lib/features/scan/scan_screen.dart`
  - Remove live barcode detection and barcode search.
  - Use one camera/gallery OCR pipeline.
  - Preserve structured OCR lines.
  - Add clear processing and error states.
- `mobile/lib/features/scan/scan_matching.dart`
  - Add barcode-number filtering.
  - Add catalog-aware exact and fuzzy item-number matching.
  - Add weighted brand/model scoring and confidence reasons.
- `mobile/lib/features/scan/scan_result_screen.dart`
  - Accept ranked `ScanMatch` objects.
  - Display confidence and reasons.
  - Make duplicate warnings confidence-safe.
- `mobile/test/scan_matching_test.dart`
  - Expand unit coverage for filtering, OCR noise, ranking, ties, and variants.
- `mobile/pubspec.yaml`
  - Remove `mobile_scanner` only if `rg` confirms it is unused elsewhere after
    the UI refactor.

Optional new pure Dart file:

- `mobile/lib/features/scan/scan_analysis.dart`
  - OCR line sanitization and barcode-number filtering.

## Required Tests

Add tests covering at least the following:

1. `4895183691234` is ignored.
2. Spaced or hyphenated 8/12/13/14-digit barcode values are ignored.
3. `MGT00012` is retained even when printed beside a barcode value.
4. `IN64-RWB993-TDE26`, `R34`, `1:64`, and `2024` are not removed.
5. A numeric sequence embedded in useful text is removed without deleting the
   rest of the line.
6. Exact `MGT00012` ranks the correct catalog item first with `exact`
   confidence.
7. A one-character OCR mistake produces `likely`, never `exact`.
8. A short prefix such as `MGT000` does not become an exact match.
9. Brand plus model name can produce a likely/possible result when the item
   number is unreadable.
10. Generic packaging words alone produce no matches.
11. An unknown box returns an empty result rather than an arbitrary first item.
12. Duplicate warning is not shown for a merely possible top match.
13. Normal/chase tiles sharing one item number are both retained for user
    confirmation.
14. Existing ownership and pre-order count tests continue to pass.

Run:

```bash
cd mobile
flutter analyze
flutter test
```

Do not introduce new analyzer warnings. There is one existing Supabase
`anonKey` deprecation warning outside the scanner scope; do not treat it as a
scanner regression.

## Acceptance Criteria

Phase 1 is complete when:

- The primary Scan action no longer suggests that barcode lookup is supported.
- Camera and gallery use the same OCR-first pipeline.
- Pure barcode values do not influence catalog matching.
- Text next to the barcode remains usable.
- Matching uses the live catalog's item numbers rather than only hardcoded brand
  patterns.
- Exact, likely, and possible results are distinguishable.
- Duplicate warnings are only automatic for unambiguous, high-confidence
  matches.
- Errors and cancellations leave the scanner usable.
- All scanner tests and the existing Flutter test suite pass.
- No unrelated files or existing user changes are overwritten.

## Copy-Paste Prompt for a Coding Agent

```text
Implement Phase 1 of the text-first Smart Image Scanner described in:
documents/mobile/smart-image-scanner-plan.md

Repository context:
- Flutter app is under mobile/.
- Current scanner files are mobile/lib/features/scan/scan_screen.dart,
  scan_matching.dart, and scan_result_screen.dart.
- Catalog data comes from catalogProvider and CatalogItem.
- The database does not store barcode values. Do not add barcode lookup or a
  barcode database.
- Existing dependencies include image_picker,
  google_mlkit_text_recognition, and mobile_scanner.

Required implementation:
1. Replace the barcode-first scanner UI with an OCR-first box scan flow using
   camera and gallery through image_picker.
2. Use one processing pipeline for camera and gallery.
3. Preserve OCR lines instead of using only RecognizedText.text.
4. Remove pure GTIN/UPC-like numeric sequences of 8, 12, 13, or 14 digits from
   matching input, including spaced/hyphenated forms. Remove only the numeric
   sequence, not the whole line. Retain alphanumeric item numbers such as
   MGT00012 and IN64-RWB993-TDE26, plus values such as R34, 1:64, and 2024.
5. Match item numbers dynamically against CatalogItem.itemNo values. Exact
   normalized item-number matches must rank first. Replace the unsafe
   bidirectional contains behavior with exact and carefully bounded fuzzy
   matching.
6. Add weighted brand and model-name fallback matching with packaging
   stopwords. Generic packaging words alone must not return arbitrary matches.
7. Return explainable ScanMatch results with score, exact/likely/possible
   confidence, and reasons.
8. Update ScanResultScreen to show confidence and reasons. Do not show a
   duplicate warning for a possible/ambiguous first result. Preserve both
   chase and normal variants when OCR cannot distinguish them.
9. Add clear processing states, cancellation handling, try/finally busy-state
   cleanup, mounted checks, retake/gallery/manual-search empty-state actions.
10. Remove mobile_scanner from pubspec only after confirming it is unused in
    the mobile app after the refactor.
11. Do not implement cloud image matching, add API keys, change the database,
    or introduce a custom ML model in this phase.
12. Add the tests listed in the plan and keep all existing behavior outside the
    scanner intact.

Before editing, inspect all referenced files and preserve unrelated user
changes. After implementation, run dart format on changed Dart files, then run
flutter analyze and flutter test. Report changed files, important design
decisions, analyzer output, and test results. Do not claim completion if the
tests fail.
```

