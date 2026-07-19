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
