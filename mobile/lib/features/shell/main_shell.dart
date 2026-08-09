import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';

import '../../core/icons/huge_scan_search_icon.dart';
import '../catalog/catalog_screen.dart';
import '../home/home_screen.dart';
import '../insights/insights_screen.dart';
import '../preorders/preorder_tracker_screen.dart';
import '../scan/scan_screen.dart';
import 'nav_intent.dart';

/// One entry in the bottom nav bar. Every destination is a page held alive in
/// the [IndexedStack] — including Scan, so the bottom nav stays visible while
/// scanning instead of Scan opening as a separate full-screen route.
class _Destination {
  const _Destination({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.page,
  });

  final Widget icon;
  final Widget selectedIcon;
  final String label;
  final Widget page;
}

const _destinations = [
  _Destination(
    icon: HugeIcon(icon: HugeIcons.strokeRoundedHome01),
    selectedIcon: HugeIcon(icon: HugeIcons.strokeRoundedHome01),
    label: 'Home',
    page: HomeScreen(),
  ),
  _Destination(
    icon: HugeIcon(icon: HugeIcons.strokeRoundedGridView),
    selectedIcon: HugeIcon(icon: HugeIcons.strokeRoundedGridView),
    label: 'Catalog',
    page: CatalogScreen(),
  ),
  _Destination(
    icon: HugeScanSearchIcon(),
    selectedIcon: HugeScanSearchIcon(),
    label: 'Scan',
    page: ScanScreen(),
  ),
  _Destination(
    icon: HugeIcon(icon: HugeIcons.strokeRoundedPackageProcess),
    selectedIcon: HugeIcon(icon: HugeIcons.strokeRoundedPackageProcess),
    label: 'Pre-orders',
    page: PreorderTrackerScreen(),
  ),
  _Destination(
    icon: HugeIcon(icon: HugeIcons.strokeRoundedChartAnalysis),
    selectedIcon: HugeIcon(icon: HugeIcons.strokeRoundedChartAnalysis),
    label: 'Insights',
    page: InsightsScreen(),
  ),
];

/// Root scaffold with a bottom nav bar. Uses IndexedStack so each tab keeps
/// its scroll position and state when switching.
class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _selected = 0;

  static final _catalogIndex =
      _destinations.indexWhere((d) => d.page is CatalogScreen);
  static final _preordersIndex =
      _destinations.indexWhere((d) => d.page is PreorderTrackerScreen);
  static final _scanIndex = _destinations.indexWhere((d) => d.page is ScanScreen);

  void _onNav(int i) {
    setState(() => _selected = i);
    ref.read(scanTabVisibleProvider.notifier).set(i == _scanIndex);
  }

  @override
  Widget build(BuildContext context) {
    // A dashboard-card tap switches to the tab its filter lives on; the
    // destination screen itself watches the same provider to apply the
    // filter and clear it.
    ref.listen<HomeNavTarget?>(homeNavIntentProvider, (previous, next) {
      final targetIndex = switch (next) {
        HomeNavTarget.catalogOwned => _catalogIndex,
        HomeNavTarget.preorderReady || HomeNavTarget.preorderUnpaid => _preordersIndex,
        null => null,
      };
      if (targetIndex != null && targetIndex != -1) {
        setState(() => _selected = targetIndex);
      }
    });

    return Scaffold(
      body: IndexedStack(
        index: _selected,
        children: [for (final d in _destinations) d.page],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selected,
        onDestinationSelected: _onNav,
        destinations: [
          for (final d in _destinations)
            NavigationDestination(
              icon: d.icon,
              selectedIcon: d.selectedIcon,
              label: d.label,
            ),
        ],
      ),
    );
  }
}
