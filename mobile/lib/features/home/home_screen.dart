import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/supabase.dart';
import '../../core/error_view.dart';
import '../../core/format.dart';
import '../../core/ownership.dart';
import '../../data/models/purchase.dart';
import 'dashboard_data.dart';

/// Home dashboard: collection summary + recent purchases + Scan button.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Diecast Collector'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => supabase.auth.signOut(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(dashboardProvider.future),
        child: async.when(
          loading: () => const _CenteredScroll(child: CircularProgressIndicator()),
          error: (e, _) => AppErrorView(
            error: e,
            onRetry: () => ref.invalidate(dashboardProvider),
          ),
          data: (d) => _DashboardView(data: d),
        ),
      ),
    );
  }
}

class _DashboardView extends StatelessWidget {
  const _DashboardView({required this.data});
  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        // --- Summary stat cards ---
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.5,
          children: [
            _StatCard(
              label: 'Models owned',
              value: '${data.modelsOwned}',
              icon: Icons.inventory_2_outlined,
              color: Colors.blue,
            ),
            _StatCard(
              label: 'Units owned',
              value: '${data.unitsOwned}',
              icon: Icons.widgets_outlined,
              color: Colors.indigo,
            ),
            _StatCard(
              label: 'Active pre-orders',
              value: '${data.activePreOrderUnits}',
              icon: Icons.schedule,
              color: Colors.orange,
            ),
            _StatCard(
              label: 'Ready to collect',
              value: '${data.readyToCollectUnits}',
              icon: Icons.local_shipping_outlined,
              color: Colors.green,
            ),
          ],
        ),
        const SizedBox(height: 12),
        _StatCard(
          label: 'Unpaid / partially paid orders',
          value: '${data.outstandingOrders}',
          icon: Icons.payments_outlined,
          color: Colors.red,
          wide: true,
        ),

        const SizedBox(height: 24),

        // --- Recent purchases ---
        Text('Recent purchases',
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (data.recentPurchases.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: Text('No purchases yet')),
          )
        else
          ...data.recentPurchases.map((p) => _PurchaseTile(purchase: p)),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.wide = false,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: color.withValues(alpha: 0.15),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(value,
                      style: theme.textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.bold)),
                  Text(label,
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: theme.colorScheme.outline),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PurchaseTile extends StatelessWidget {
  const _PurchaseTile({required this.purchase});
  final Purchase purchase;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (statusLabel, statusColor) = _status(purchase, theme);

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      color: theme.colorScheme.surfaceContainerHighest,
      child: ListTile(
        title: Text(purchase.collectionName,
            maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text([
          if (purchase.itemNo != null) purchase.itemNo!,
          'x${purchase.quantity}',
          if (purchase.isChase) 'CHASE',
        ].join(' · ')),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(formatMoney(purchase.totalPrice),
                style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(statusLabel,
                  style: TextStyle(
                      fontSize: 11,
                      color: statusColor,
                      fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }

  (String, Color) _status(Purchase p, ThemeData theme) {
    if (isOwned(p)) return ('Owned', Colors.green);
    if (isReadyToCollect(p)) return ('Ready', Colors.teal);
    if (isPartiallyPaid(p)) return ('Partial', Colors.orange);
    if (isPreOrder(p)) return ('Pre-order', Colors.blue);
    if (isOutstanding(p)) return ('Unpaid', Colors.red);
    return ('—', theme.colorScheme.outline);
  }
}

/// A scrollable centred child so RefreshIndicator works even in loading/error.
class _CenteredScroll extends StatelessWidget {
  const _CenteredScroll({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
