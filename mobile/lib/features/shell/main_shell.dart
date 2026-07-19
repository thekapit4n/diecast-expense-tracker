import 'package:flutter/material.dart';

import '../catalog/catalog_screen.dart';
import '../home/home_screen.dart';
import '../preorders/preorder_tracker_screen.dart';
import '../scan/scan_screen.dart';

/// Root scaffold with a bottom nav bar. Uses IndexedStack so each tab keeps
/// its scroll position and state when switching.
///
/// The Scan destination is an action (pushes the scanner) rather than a
/// persistent page, so the camera isn't kept alive in the background.
class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  /// Index into [_pages] (0 Home, 1 Catalog, 2 Pre-orders).
  int _page = 0;

  static const _pages = [
    HomeScreen(),
    CatalogScreen(),
    PreorderTrackerScreen(),
  ];

  // Nav bar has 4 destinations; index 2 (Scan) is an action, not a page.
  static const _scanNavIndex = 2;

  /// Maps the current page to its nav-bar index (Scan sits at 2, so
  /// Pre-orders is nav index 3).
  int get _selectedNav => _page < 2 ? _page : 3;

  void _onNav(int i) {
    if (i == _scanNavIndex) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const ScanScreen()),
      );
      return; // keep the current tab selected
    }
    setState(() => _page = i == 3 ? 2 : i);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _page, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedNav,
        onDestinationSelected: _onNav,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            selectedIcon: Icon(Icons.grid_view),
            label: 'Catalog',
          ),
          NavigationDestination(
            icon: Icon(Icons.qr_code_scanner),
            label: 'Scan',
          ),
          NavigationDestination(
            icon: Icon(Icons.schedule_outlined),
            selectedIcon: Icon(Icons.schedule),
            label: 'Pre-orders',
          ),
        ],
      ),
    );
  }
}
