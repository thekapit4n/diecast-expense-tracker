import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../config/supabase.dart';

/// Emits an event whenever the user signs in, signs out or the token refreshes.
final authStateProvider = StreamProvider<AuthState>((ref) {
  return supabase.auth.onAuthStateChange;
});

/// The current session, or null when signed out. Rebuilds on auth changes.
final sessionProvider = Provider<Session?>((ref) {
  ref.watch(authStateProvider);
  return supabase.auth.currentSession;
});

/// Convenience: the signed-in user's email (or null).
final userEmailProvider = Provider<String?>((ref) {
  return ref.watch(sessionProvider)?.user.email;
});
