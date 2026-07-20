import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'router/app_router.dart';
import 'theme/app_theme.dart';

/// How long the branded splash stays up. Startup is fast, so without this the
/// splash flashes past before it can be read.
const _splashMinimumDuration = Duration(milliseconds: 1800);

Future<void> main() async {
  final binding = WidgetsFlutterBinding.ensureInitialized();
  // Hold the native splash until we explicitly remove it below.
  FlutterNativeSplash.preserve(widgetsBinding: binding);
  final splashShownAt = DateTime.now();

  await dotenv.load(fileName: '.env');
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  runApp(const ProviderScope(child: DiecastApp()));

  // Keep the splash up for the remainder of the minimum duration, so it reads
  // as branding rather than a flicker.
  final elapsed = DateTime.now().difference(splashShownAt);
  final remaining = _splashMinimumDuration - elapsed;
  if (remaining > Duration.zero) await Future.delayed(remaining);
  FlutterNativeSplash.remove();
}

class DiecastApp extends ConsumerWidget {
  const DiecastApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'Diecast Collector',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: router,
    );
  }
}
