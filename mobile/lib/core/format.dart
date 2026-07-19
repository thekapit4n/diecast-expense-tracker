// Lightweight formatters (no intl dependency).

/// Formats a Ringgit amount like `RM 1,234.50`. Returns `—` for null.
String formatMoney(double? amount) {
  if (amount == null) return '—';
  final fixed = amount.toStringAsFixed(2);
  final parts = fixed.split('.');
  final intPart = parts[0];
  final buf = StringBuffer();
  for (var i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 == 0) buf.write(',');
    buf.write(intPart[i]);
  }
  return 'RM $buf.${parts[1]}';
}

/// Formats an epoch-seconds timestamp as `d MMM yyyy`. Returns `—` for null.
String formatEpochDate(int? epochSeconds) {
  if (epochSeconds == null) return '—';
  final d = DateTime.fromMillisecondsSinceEpoch(epochSeconds * 1000);
  return _formatDate(d);
}

const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

String _formatDate(DateTime d) => '${d.day} ${_months[d.month - 1]} ${d.year}';

/// Formats a DateTime as `yyyy-MM-dd` for Postgres DATE columns, or null.
/// Mirrors the web's formatDateForDatabase.
String? toDbDate(DateTime? d) {
  if (d == null) return null;
  final mo = d.month.toString().padLeft(2, '0');
  final day = d.day.toString().padLeft(2, '0');
  return '${d.year}-$mo-$day';
}

/// Parses a `yyyy-MM-dd` DB date string into a local DateTime (or null).
DateTime? parseDbDate(String? iso) {
  if (iso == null || iso.isEmpty) return null;
  final p = iso.split('-');
  if (p.length != 3) return null;
  final y = int.tryParse(p[0]), mo = int.tryParse(p[1]), d = int.tryParse(p[2]);
  if (y == null || mo == null || d == null) return null;
  return DateTime(y, mo, d);
}

/// Formats a `yyyy-MM-dd` string as `d MMM yyyy`, or `—` when empty/invalid.
String formatIsoDate(String? iso) {
  final d = parseDbDate(iso);
  return d == null ? '—' : _formatDate(d);
}
