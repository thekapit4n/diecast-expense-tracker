import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/error_view.dart';
import '../../core/format.dart';
import '../../theme/app_theme.dart';
import 'insights_data.dart';

/// How long bars grow/shrink and money values count up, on first load and on
/// every subsequent refresh.
const _animDuration = Duration(milliseconds: 400);

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
        child: AnimatedSwitcher(
          duration: _animDuration,
          child: async.when(
            loading: () => const Center(
              key: ValueKey('loading'),
              child: CircularProgressIndicator(),
            ),
            error: (e, _) => AppErrorView(
              key: const ValueKey('error'),
              error: e,
              onRetry: () => ref.invalidate(insightsProvider),
            ),
            data: (d) => _InsightsView(key: const ValueKey('data'), data: d),
          ),
        ),
      ),
    );
  }
}

class _InsightsView extends StatelessWidget {
  const _InsightsView({super.key, required this.data});
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
            _AnimatedMoney(
              amount: data.thisMonth,
              style: theme.textTheme.headlineMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
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

/// Six-month spend trend, drawn with fl_chart so bars grow in on first load
/// and animate between values whenever the underlying data refreshes.
class _MonthTrend extends StatefulWidget {
  const _MonthTrend({required this.months});
  final List<MonthSpend> months;

  @override
  State<_MonthTrend> createState() => _MonthTrendState();
}

class _MonthTrendState extends State<_MonthTrend> {
  // Starts false so the first frame renders zero-height bars, then flips true
  // a frame later — fl_chart's own swapAnimationDuration tweens the growth.
  bool _grown = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _grown = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final months = widget.months;
    final peak = months.fold<double>(0, (m, e) => e.amount > m ? e.amount : m);

    return AnimatedSwitcher(
      duration: _animDuration,
      child: peak == 0
          ? _EmptyNote(
              key: const ValueKey('empty'),
              'No payments recorded in the last $monthsOfHistory months',
            )
          : Card(
              key: const ValueKey('chart'),
              elevation: 0,
              color: theme.colorScheme.surfaceContainerHighest,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 20, 16, 12),
                child: SizedBox(
                  height: 160,
                  child: BarChart(
                    duration: _animDuration,
                    curve: Curves.easeOutCubic,
                    BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: peak * 1.2,
                      gridData: const FlGridData(show: false),
                      borderData: FlBorderData(show: false),
                      barTouchData: BarTouchData(
                        touchTooltipData: BarTouchTooltipData(
                          getTooltipColor: (_) => theme.colorScheme.inverseSurface,
                          getTooltipItem: (group, groupIndex, rod, rodIndex) => BarTooltipItem(
                            formatMoney(months[group.x].amount),
                            TextStyle(
                              color: theme.colorScheme.onInverseSurface,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                      titlesData: FlTitlesData(
                        show: true,
                        leftTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 24,
                            getTitlesWidget: (value, meta) {
                              final i = value.toInt();
                              if (i < 0 || i >= months.length) return const SizedBox();
                              return Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  months[i].label,
                                  style: theme.textTheme.labelSmall
                                      ?.copyWith(color: theme.colorScheme.outline),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                      barGroups: [
                        for (var i = 0; i < months.length; i++)
                          BarChartGroupData(
                            x: i,
                            barRods: [
                              BarChartRodData(
                                toY: _grown ? months[i].amount : 0,
                                color: theme.colorScheme.primary,
                                width: 18,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ],
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

/// Top brands/shops by spend. Hand-rolled rather than fl_chart — the RM
/// amount and unit count need to sit next to the bar and be readable at a
/// glance, not hidden behind a tap-to-reveal tooltip. Still animates: the
/// bar fills in and the money counts up, same as everything else here.
class _Breakdown extends StatelessWidget {
  const _Breakdown({required this.rows, required this.emptyLabel});
  final List<CategorySpend> rows;
  final String emptyLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final peak = rows.isEmpty ? 0.0 : rows.first.amount;

    return AnimatedSwitcher(
      duration: _animDuration,
      child: rows.isEmpty
          ? _EmptyNote(key: const ValueKey('empty'), emptyLabel)
          : Card(
              key: ValueKey(rows.map((r) => r.label).join('|')),
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
                              _AnimatedMoney(
                                amount: r.amount,
                                style: theme.textTheme.bodyMedium
                                    ?.copyWith(fontWeight: FontWeight.w600),
                              ),
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
            ),
    );
  }
}

/// A single proportional bar that eases to its target width whenever
/// [fraction] changes — used by [_Breakdown], which needs a compact bar
/// alongside text rather than a full chart axis.
class _Bar extends StatelessWidget {
  const _Bar({required this.fraction, required this.color});
  final double fraction;
  final Color color;

  @override
  Widget build(BuildContext context) {
    // Keep a sliver visible for tiny non-zero amounts, but show nothing at
    // all for a genuinely empty row.
    final target = fraction <= 0 ? 0.0 : fraction.clamp(0.02, 1.0);

    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: Container(
        height: 8,
        color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.4),
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: target),
          duration: _animDuration,
          curve: Curves.easeOutCubic,
          builder: (context, value, child) => FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: value,
            child: child,
          ),
          child: ColoredBox(color: color),
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
    final moneyFacts = <(String, double)>[
      ('Collection value', data.collectionValue),
      ('Total paid, all time', data.totalSpend),
      ('Average per unit', data.avgPerUnit),
      ('Average per model', data.avgPerModel),
    ];
    final valueStyle =
        theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600);
    final labelStyle =
        theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.outline);

    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Column(
          children: [
            for (final (label, amount) in moneyFacts)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Row(
                  children: [
                    Expanded(child: Text(label, style: labelStyle)),
                    _AnimatedMoney(amount: amount, style: valueStyle),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                children: [
                  Expanded(child: Text('Chase units owned', style: labelStyle)),
                  Text('${data.chaseUnits}', style: valueStyle),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Money text that eases from its previous value to [amount] whenever it
/// changes — a soft count-up rather than a hard jump.
class _AnimatedMoney extends StatelessWidget {
  const _AnimatedMoney({required this.amount, this.style});
  final double amount;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: amount),
      duration: _animDuration,
      curve: Curves.easeOut,
      builder: (context, value, _) => Text(formatMoney(value), style: style),
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
  const _EmptyNote(this.text, {super.key});
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
