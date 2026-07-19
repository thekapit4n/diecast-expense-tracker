import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../../../config/supabase.dart';
import '../../../data/catalog_image_paths.dart';

/// Loads a catalog image, trying each source in [sources] in order and falling
/// back to the next when one fails (mirroring the web's slot 1..5 behaviour).
///
/// A source is either a full http(s) URL, or a bucket-relative storage path
/// which is fetched from Supabase Storage's authenticated endpoint using the
/// current user's access token.
class CatalogImage extends StatefulWidget {
  const CatalogImage({super.key, required this.sources, this.fit = BoxFit.cover});

  final List<String> sources;
  final BoxFit fit;

  @override
  State<CatalogImage> createState() => _CatalogImageState();
}

class _CatalogImageState extends State<CatalogImage> {
  int _index = 0;

  ({String url, Map<String, String>? headers})? _resolve(String source) {
    if (source.startsWith('http')) return (url: source, headers: null);

    final token = supabase.auth.currentSession?.accessToken;
    final anon = dotenv.env['SUPABASE_ANON_KEY'];
    final base = dotenv.env['SUPABASE_URL'];
    if (token == null || anon == null || base == null) return null;

    return (
      url: '$base/storage/v1/object/authenticated/$storageBucket/$source',
      headers: {'apikey': anon, 'Authorization': 'Bearer $token'},
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_index >= widget.sources.length) return _placeholder(theme);
    final resolved = _resolve(widget.sources[_index]);
    if (resolved == null) return _placeholder(theme);

    return Image.network(
      resolved.url,
      headers: resolved.headers,
      fit: widget.fit,
      gaplessPlayback: true,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return Container(
          color: theme.colorScheme.surfaceContainerHighest,
          child: const Center(
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        );
      },
      errorBuilder: (context, error, stack) {
        // Try the next candidate on the next frame.
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _index < widget.sources.length) {
            setState(() => _index++);
          }
        });
        return _placeholder(theme);
      },
    );
  }

  Widget _placeholder(ThemeData theme) => Container(
        color: theme.colorScheme.surfaceContainerHighest,
        child: Icon(Icons.directions_car_outlined,
            size: 36, color: theme.colorScheme.outlineVariant),
      );
}
