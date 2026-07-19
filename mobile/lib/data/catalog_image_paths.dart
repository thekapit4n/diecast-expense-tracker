// Mirrors the web app's lib/collection-images.ts, but returns bucket-relative
// storage paths (e.g. "mini-gt/MGT00012/1.jpg") instead of /api/ URLs, since
// the mobile app reads Supabase Storage directly as the logged-in user.

const storageBucket = 'diecast-images';
const _defaultSlots = 5;

String _slugify(String name) => name
    .trim()
    .toLowerCase()
    .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
    .replaceAll(RegExp(r'^-+|-+$'), '');

String getBrandStorageSlug(String brandName) {
  final n = brandName.trim().toLowerCase();
  if (n.contains('mini gt')) return 'mini-gt';
  return _slugify(brandName);
}

String? _sanitizeFolderKey(String itemNo, String brandName) {
  final normalized = itemNo.trim().toUpperCase();
  if (normalized.isEmpty) return null;

  final isMiniGt = brandName.trim().toLowerCase().contains('mini gt');
  if (isMiniGt) {
    return RegExp(r'MGT\d{5}').firstMatch(normalized)?.group(0);
  }

  final cleaned = normalized
      .replaceAll(RegExp(r'[^A-Z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  if (cleaned.isEmpty || cleaned.length > 64) return null;
  if (!RegExp(r'^[A-Z0-9][A-Z0-9-]{0,63}$').hasMatch(cleaned)) return null;
  return cleaned;
}

String? _sanitizeFolderKeyFromName(String name) {
  final cleaned = name
      .trim()
      .toUpperCase()
      .replaceAll(RegExp(r'[^A-Z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  if (cleaned.isEmpty || cleaned.length > 64) return null;
  if (!RegExp(r'^[A-Z0-9][A-Z0-9-]{0,63}$').hasMatch(cleaned)) return null;
  return cleaned;
}

String? _resolveFolderKey({
  String? itemNo,
  String? collectionName,
  required String brandName,
}) {
  if (itemNo != null && itemNo.trim().isNotEmpty) {
    final k = _sanitizeFolderKey(itemNo, brandName);
    if (k != null) return k;
  }
  if (collectionName != null && collectionName.trim().isNotEmpty) {
    return _sanitizeFolderKeyFromName(collectionName);
  }
  return null;
}

/// Bucket-relative storage paths for image slots 1..[maxSlots].
List<String> storageImagePaths({
  required String brandName,
  String? itemNo,
  String? collectionName,
  bool isChase = false,
  int maxSlots = _defaultSlots,
}) {
  final folderKey =
      _resolveFolderKey(itemNo: itemNo, collectionName: collectionName, brandName: brandName);
  if (folderKey == null) return [];

  final brandSlug = getBrandStorageSlug(brandName);
  final safeFolderKey = brandSlug == 'mini-gt' ? folderKey.toUpperCase() : folderKey;
  final variant = isChase ? '/chase' : '';
  return List.generate(
    maxSlots,
    (i) => '$brandSlug/$safeFolderKey$variant/${i + 1}.jpg',
  );
}

/// Full external (http/https) image URLs embedded in the remark text. The /api/
/// relative URLs the web also supports are skipped — they need the web host.
List<String> remarkImageUrls(String? remark) {
  if (remark == null) return [];
  final re =
      RegExp(r'https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|gif)', caseSensitive: false);
  return re.allMatches(remark).map((m) => m.group(0)!).toList();
}

/// Ordered image source candidates for a catalog tile. A chase tile only ever
/// uses its dedicated chase/ subfolder (matching the web), while a normal tile
/// falls back across remark URLs then storage slots.
List<String> catalogImageSources({
  required String brandName,
  String? itemNo,
  String? collectionName,
  String? remark,
  required bool isChase,
}) {
  if (isChase) {
    return storageImagePaths(
      brandName: brandName,
      itemNo: itemNo,
      collectionName: collectionName,
      isChase: true,
    );
  }
  return [
    ...remarkImageUrls(remark),
    ...storageImagePaths(
      brandName: brandName,
      itemNo: itemNo,
      collectionName: collectionName,
    ),
  ];
}
