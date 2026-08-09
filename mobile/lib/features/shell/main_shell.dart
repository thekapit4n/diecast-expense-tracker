import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';

import '../../core/icons/huge_scan_search_icon.dart';
import '../catalog/catalog_screen.dart';
import '../home/home_screen.dart';
import '../insights/insights_screen.dart';
import '../preorders/preorder_tracker_screen.dart';
import '../scan/scan_screen.dart';

/// One entry in the bottom nav bar.
///
/// Most destinations are pages held alive in the [IndexedStack]. Scan is the
/// exception: it pushes the camera as a route so it isn't kept running in the
/// background, so it carries no page.
class _Destination {
  const _Destination({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    this.page,
  });

  final Widget icon;
  final Widget selectedIcon;
  final String label;

  /// Null for action destinations (Scan).
  final Widget? page;

  bool get isAction => page == null;
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
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  /// Index into [_destinations] of the currently shown page. Never points at
  /// an action destination.
  int _selected = 0;

  /// The page destinations, in nav-bar order, so the IndexedStack child index
  /// can be derived from the nav index instead of hand-maintained arithmetic.
  static final _pageIndices = [
    for (var i = 0; i < _destinations.length; i++)
      if (!_destinations[i].isAction) i,
  ];

  void _onNav(int i) {
    if (_destinations[i].isAction) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const ScanScreen()),
      );
      return; // keep the current tab selected
    }
    setState(() => _selected = i);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _pageIndices.indexOf(_selected),
        children: [
          for (final i in _pageIndices) _destinations[i].page!,
        ],
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
