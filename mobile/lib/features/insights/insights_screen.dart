import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/error_view.dart';
import '../../core/format.dart';
import '../../theme/app_theme.dart';
import 'insights_data.dart';

/// Spending insights: month-over-month, a six-month trend, and where the money
/// goes by brand and shop. All derived from tbl_purchase — no new tables.
class InsightsScreen extends ConsumerWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(insightsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Insights')),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(insightsProvider.future),
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => AppErrorView(
            error: e,
            onRetry: () => ref.invalidate(insightsProvider),
          ),
          data: (d) => _InsightsView(data: d),
        ),
      ),
    );
  }
}

class _InsightsView extends StatelessWidget {
  const _InsightsView({required this.data});
  final InsightsData data;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        _MonthComparison(data: data),
        const SizedBox(height: 24),

        _SectionTitle('Last $monthsOfHistory months'),
        const SizedBox(height: 8),
        _MonthTrend(months: data.recentMonths),
        const SizedBox(height: 24),

        _SectionTitle('Top brands'),
        const SizedBox(height: 8),
        _Breakdown(rows: data.topBrands, emptyLabel: 'No owned items yet'),
        const SizedBox(height: 24),

        _SectionTitle('Top shops'),
        const SizedBox(height: 8),
        _Breakdown(
          rows: data.topShops,
          emptyLabel: 'No shop recorded on your purchases',
        ),
        const SizedBox(height: 24),

        _SectionTitle('Collection'),
        const SizedBox(height: 8),
        _Facts(data: data),
      ],
    );
  }
}

class _MonthComparison extends StatelessWidget {
  const _MonthComparison({required this.data});
  final InsightsData data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = AppStatusColors.of(context);
    final change = data.monthOverMonth;

    // Spending less than last month is the good direction.
    final (icon, tint) = switch (change) {
      null => (Icons.remove, theme.colorScheme.outline),
      final c when c > 0 => (Icons.arrow_upward, status.unpaid),
      final c when c < 0 => (Icons.arrow_downward, status.owned),
      _ => (Icons.remove, theme.colorScheme.outline),
    };

    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('This month',
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: theme.colorScheme.outline)),
            const SizedBox(height: 4),
            Text(formatMoney(data.thisMonth),
                style: theme.textTheme.headlineMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(icon, size: 16, color: tint),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    change == null
                        ? 'Nothing spent last month'
                        : '${(change.abs() * 100).toStringAsFixed(0)}% '
                            '${change > 0 ? 'more' : 'less'} than last month '
                            '(${formatMoney(data.lastMonth)})',
                    style: theme.textTheme.bodySmall?.copyWith(color: tint),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Six proportional bars. Deliberately hand-rolled — a charting package would
/// be a large dependency for this, and these inherit the theme for free.
class _MonthTrend extends StatelessWidget {
  const _MonthTrend({required this.months});
  final List<MonthSpend> months;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final peak = months.fold<double>(0, (m, e) => e.amount > m ? e.amount : m);

    if (peak == 0) {
      return _EmptyNote('No payments recorded in the last $monthsOfHistory months');
    }

    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            for (final m in months) ...[
              Row(
                children: [
                  SizedBox(
                    width: 34,
                    child: Text(m.label,
                        style: theme.textTheme.labelSmall
                            ?.copyWith(color: theme.colorScheme.outline)),
                  ),
                  Expanded(
                    child: _Bar(
                      fraction: m.amount / peak,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 92,
                    child: Text(
                      formatMoney(m.amount),
                      textAlign: TextAlign.right,
                      style: theme.textTheme.labelSmall,
                    ),
                  ),
                ],
              ),
              if (m != months.last) const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }
}

class _Breakdown extends StatelessWidget {
  const _Breakdown({required this.rows, required this.emptyLabel});
  final List<CategorySpend> rows;
  final String emptyLabel;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) return _EmptyNote(emptyLabel);

    final theme = Theme.of(context);
    final peak = rows.first.amount;

    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            for (final r in rows) ...[
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(r.label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodyMedium),
                      ),
                      const SizedBox(width: 8),
                      Text(formatMoney(r.amount),
                          style: theme.textTheme.bodyMedium
                              ?.copyWith(fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  _Bar(
                    fraction: peak == 0 ? 0 : r.amount / peak,
                    color: theme.colorScheme.secondary,
                  ),
                  const SizedBox(height: 2),
                  Text('${r.units} unit${r.units == 1 ? '' : 's'}',
                      style: theme.textTheme.labelSmall
                          ?.copyWith(color: theme.colorScheme.outline)),
                ],
              ),
              if (r != rows.last) const SizedBox(height: 14),
            ],
          ],
        ),
      ),
    );
  }
}

class _Facts extends StatelessWidget {
  const _Facts({required this.data});
  final InsightsData data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final facts = <(String, String)>[
      ('Collection value', formatMoney(data.collectionValue)),
      ('Total paid, all time', formatMoney(data.totalSpend)),
      ('Average per unit', formatMoney(data.avgPerUnit)),
      ('Average per model', formatMoney(data.avgPerModel)),
      ('Chase units owned', '${data.chaseUnits}'),
    ];

    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Column(
          children: [
            for (final (label, value) in facts)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(label,
                          style: theme.textTheme.bodyMedium
                              ?.copyWith(color: theme.colorScheme.outline)),
                    ),
                    Text(value,
                        style: theme.textTheme.bodyMedium
                            ?.copyWith(fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({required this.fraction, required this.color});
  final double fraction;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: Container(
        height: 8,
        color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.4),
        child: FractionallySizedBox(
          alignment: Alignment.centerLeft,
          // Keep a sliver visible for tiny non-zero amounts, but show nothing
          // at all for a genuinely empty month.
          widthFactor: fraction <= 0 ? 0 : fraction.clamp(0.02, 1.0),
          child: ColoredBox(color: color),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) =>
      Text(text, style: Theme.of(context).textTheme.titleMedium);
}

class _EmptyNote extends StatelessWidget {
  const _EmptyNote(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(text,
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.outline)),
      ),
    );
  }
}
