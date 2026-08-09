import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Where a dashboard-card tap wants the shell to land, and which filter the
/// destination screen should pre-apply once it gets there.
///
/// Destinations are kept alive in [MainShell]'s IndexedStack rather than
/// pushed as routes, so there's no navigator argument to carry this — every
/// interested widget watches this instead, applies its own slice of the
/// intent, then clears it so switching tabs manually afterward doesn't keep
/// re-applying a stale filter.
enum HomeNavTarget { preorderReady, preorderUnpaid, catalogOwned }

class HomeNavIntentController extends Notifier<HomeNavTarget?> {
  @override
  HomeNavTarget? build() => null;

  void set(HomeNavTarget target) => state = target;
  void clear() => state = null;
}

final homeNavIntentProvider =
    NotifierProvider<HomeNavIntentController, HomeNavTarget?>(
        HomeNavIntentController.new);

/// Whether the Scan tab is the one currently visible.
///
/// Scan holds a live [CameraController] — a real hardware resource — and it
/// lives in the IndexedStack like every other tab (so the bottom nav stays
/// visible while scanning), which means it's never actually unmounted when
/// the user switches away. Without this signal it would keep the camera
/// running in the background on every other tab. [MainShell] keeps this in
/// sync with which tab is selected; ScanScreen acquires the camera when it
/// flips to true and releases it when it flips to false.
class ScanTabVisibilityController extends Notifier<bool> {
  @override
  bool build() => false;

  void set(bool visible) => state = visible;
}

final scanTabVisibleProvider =
    NotifierProvider<ScanTabVisibilityController, bool>(ScanTabVisibilityController.new);
