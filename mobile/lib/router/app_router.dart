import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/supabase.dart';
import '../features/auth/login_screen.dart';
import '../features/shell/main_shell.dart';

/// App router with auth-aware redirects:
/// - signed out -> forced to /login
/// - signed in and on /login -> bounced to /
final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRefreshStream(supabase.auth.onAuthStateChange);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refresh,
    redirect: (context, state) {
      final loggedIn = supabase.auth.currentSession != null;
      final onLogin = state.matchedLocation == '/login';
      if (!loggedIn) return onLogin ? null : '/login';
      if (onLogin) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const MainShell()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    ],
  );
});

/// Bridges a [Stream] to a [Listenable] so GoRouter re-runs `redirect`
/// whenever auth state changes.
class _AuthRefreshStream extends ChangeNotifier {
  _AuthRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _sub = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _sub;

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}
