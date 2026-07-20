import 'dart:async';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

/// Backstop for a request that hangs (e.g. connected to Wi-Fi that has no
/// actual internet). [ensureOnline] catches the common "no network at all"
/// case instantly, so this only matters in edge cases.
const requestTimeout = Duration(seconds: 10);

/// Fails fast when the device has no network interface at all, so the user
/// sees the offline message immediately instead of waiting out a timeout.
Future<void> ensureOnline() async {
  final results = await Connectivity().checkConnectivity();
  if (results.isEmpty || results.every((r) => r == ConnectivityResult.none)) {
    throw const SocketException('No internet connection');
  }
}

/// True when a failure looks like a connectivity problem rather than a bug,
/// so we can tell the user to check their connection instead of showing a
/// meaningless technical error.
bool isNetworkError(Object e) {
  if (e is SocketException || e is TimeoutException || e is HttpException) {
    return true;
  }
  final s = e.toString().toLowerCase();
  return s.contains('socketexception') ||
      s.contains('clientexception') ||
      s.contains('failed host lookup') ||
      s.contains('network is unreachable') ||
      s.contains('connection refused') ||
      s.contains('connection closed') ||
      s.contains('connection reset') ||
      s.contains('timeout') ||
      s.contains('timed out');
}

/// Friendly error state with a Retry button. Scrollable so it still works
/// inside a RefreshIndicator (pull-to-refresh keeps working).
class AppErrorView extends StatelessWidget {
  const AppErrorView({super.key, required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final offline = isNetworkError(error);

    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    offline ? Icons.wifi_off_rounded : Icons.error_outline,
                    size: 56,
                    color: theme.colorScheme.outline,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    offline ? 'No internet connection' : 'Something went wrong',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    offline
                        ? 'Check your Wi-Fi or mobile data, then try again.'
                        : "We couldn't load your data. Please try again.",
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(color: theme.colorScheme.outline),
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
