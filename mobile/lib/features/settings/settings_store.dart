import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The app's [SharedPreferences] handle.
///
/// Overridden in `main()` with an already-resolved instance so preference
/// reads are synchronous everywhere else — that's what lets the saved theme
/// apply on the first frame instead of flashing the default first.
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw StateError('sharedPreferencesProvider must be overridden in main()');
});
