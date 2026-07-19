import 'package:supabase_flutter/supabase_flutter.dart';

/// Global Supabase client, initialised in [main].
/// Talks to the same Supabase project as the admin web app.
final supabase = Supabase.instance.client;
