import 'package:flutter/material.dart';

/// App-wide Material 3 theme. Uses a single seed colour so light and dark
/// stay in sync. Tweak [_seed] to rebrand.
class AppTheme {
  static const Color _seed = Color(0xFF2563EB); // blue-600, matches web accent

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: _seed),
      );

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _seed,
          brightness: Brightness.dark,
        ),
      );
}
