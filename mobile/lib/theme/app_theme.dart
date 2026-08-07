import 'package:flutter/material.dart';

/// Semantic colours that Material's [ColorScheme] has no slot for: the
/// payment/ownership statuses and the dashboard accents.
///
/// These used to be raw `Colors.green` / `Colors.orange` literals scattered
/// across the screens, which meant they kept their light-mode saturation on a
/// dark surface and read as muddy. Each one now has a dark counterpart, and
/// [AppStatusColors.of] is the single place any screen gets them from.
@immutable
class AppStatusColors extends ThemeExtension<AppStatusColors> {
  const AppStatusColors({
    required this.owned,
    required this.ready,
    required this.partial,
    required this.preOrder,
    required this.unpaid,
    required this.info,
    required this.chase,
    required this.caseBadge,
    required this.warning,
  });

  final Color owned;
  final Color ready;
  final Color partial;
  final Color preOrder;
  final Color unpaid;

  /// Secondary dashboard accent (units owned) — no status meaning.
  final Color info;

  final Color chase;
  final Color caseBadge;
  final Color warning;

  /// Light values are the literals the app shipped with, so light mode is
  /// unchanged. Dark values step up a few shades: the 500-weight Material
  /// colours fail against a dark surface.
  static const light = AppStatusColors(
    owned: Colors.green,
    ready: Colors.teal,
    partial: Colors.orange,
    preOrder: Colors.blue,
    unpaid: Colors.red,
    info: Colors.indigo,
    chase: Colors.red,
    caseBadge: Color(0xFFFFA000), // amber.shade700
    warning: Color(0xFFFFC107), // amber
  );

  static final dark = AppStatusColors(
    owned: Colors.green.shade300,
    ready: Colors.teal.shade300,
    partial: Colors.orange.shade300,
    preOrder: Colors.blue.shade300,
    unpaid: Colors.red.shade300,
    info: Colors.indigo.shade200,
    chase: Colors.red.shade300,
    caseBadge: Colors.amber.shade400,
    warning: Colors.amber.shade300,
  );

  static AppStatusColors of(BuildContext context) =>
      Theme.of(context).extension<AppStatusColors>() ?? light;

  @override
  AppStatusColors copyWith({
    Color? owned,
    Color? ready,
    Color? partial,
    Color? preOrder,
    Color? unpaid,
    Color? info,
    Color? chase,
    Color? caseBadge,
    Color? warning,
  }) {
    return AppStatusColors(
      owned: owned ?? this.owned,
      ready: ready ?? this.ready,
      partial: partial ?? this.partial,
      preOrder: preOrder ?? this.preOrder,
      unpaid: unpaid ?? this.unpaid,
      info: info ?? this.info,
      chase: chase ?? this.chase,
      caseBadge: caseBadge ?? this.caseBadge,
      warning: warning ?? this.warning,
    );
  }

  @override
  AppStatusColors lerp(ThemeExtension<AppStatusColors>? other, double t) {
    if (other is! AppStatusColors) return this;
    return AppStatusColors(
      owned: Color.lerp(owned, other.owned, t)!,
      ready: Color.lerp(ready, other.ready, t)!,
      partial: Color.lerp(partial, other.partial, t)!,
      preOrder: Color.lerp(preOrder, other.preOrder, t)!,
      unpaid: Color.lerp(unpaid, other.unpaid, t)!,
      info: Color.lerp(info, other.info, t)!,
      chase: Color.lerp(chase, other.chase, t)!,
      caseBadge: Color.lerp(caseBadge, other.caseBadge, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
    );
  }
}

/// App-wide Material 3 theme. Uses a single seed colour so light and dark
/// stay in sync. Tweak [_seed] to rebrand.
class AppTheme {
  static const Color _seed = Color(0xFF2563EB); // blue-600, matches web accent

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: _seed),
        extensions: const [AppStatusColors.light],
      );

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _seed,
          brightness: Brightness.dark,
        ),
        extensions: [AppStatusColors.dark],
      );
}
