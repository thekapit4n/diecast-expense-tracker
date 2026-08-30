import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/supabase.dart';
import '../../core/error_view.dart' show ensureOnline, requestTimeout;
import '../../core/format.dart';
import '../../core/ownership.dart';
import '../../data/disposals.dart';
import '../../data/models/purchase.dart';

/// Money paid out in one calendar month.
class MonthSpend {
  const MonthSpend({required this.year, required this.month, required this.amount});

  final int year;
  final int month;
  final double amount;

  String get label => formatMonthShort(month);
}

/// Spend rolled up by brand or by shop.
class CategorySpend {
  const CategorySpend({
    required this.label,
    required this.amount,
    required this.units,
  });

  final String label;
  final double amount;
  final int units;
}

class InsightsData {
  const InsightsData({
    required this.thisMonth,
    required this.lastMonth,
    required this.recentMonths,
    required this.topBrands,
    required this.topShops,
    required this.totalSpend,
    required this.collectionValue,
    required this.unitsOwned,
    required this.modelsOwned,
    required this.chaseUnits,
  });

  final double thisMonth;
  final double lastMonth;

  /// Oldest first, always [monthsOfHistory] entries long (zero-filled).
  final List<MonthSpend> recentMonths;

  final List<CategorySpend> topBrands;
  final List<CategorySpend> topShops;

  /// Everything ever paid, including purchases with no payment date (those
  /// can't be bucketed by month but are still money spent).
  final double totalSpend;

  /// Sum of total_price across owned purchases.
  final double collectionValue;

  final int unitsOwned;
  final int modelsOwned;
  final int chaseUnits;

  double get avgPerUnit => unitsOwned == 0 ? 0 : collectionValue / unitsOwned;
  double get avgPerModel => modelsOwned == 0 ? 0 : collectionValue / modelsOwned;

  /// Change vs last month as a fraction (0.25 = up 25%). Null when there is no
  /// last-month figure to compare against, so the UI can say so instead of
  /// showing a meaningless +100%.
  double? get monthOverMonth =>
      lastMonth == 0 ? null : (thisMonth - lastMonth) / lastMonth;
}

/// How many months the trend bars cover.
const monthsOfHistory = 6;

/// Aggregates the insights metrics.
///
/// Spend is measured as `amount_paid` bucketed by `payment_date` — the date the
/// money actually left, which `PurchaseRepository.updatePoStatus` deliberately
/// backfills when a pre-order settles. [now] is injected so this stays pure and
/// testable.
InsightsData buildInsights(List<Purchase> purchases, DateTime now) {
  final byMonth = <(int, int), double>{};
  final byBrand = <String, (double, int)>{};
  final byShop = <String, (double, int)>{};

  var totalSpend = 0.0;
  var collectionValue = 0.0;
  var unitsOwned = 0;
  var chaseUnits = 0;
  final ownedCollectionIds = <String>{};

  for (final p in purchases) {
    totalSpend += p.amountPaid;

    final paidOn = parseDbDate(p.paymentDate);
    if (paidOn != null && p.amountPaid > 0) {
      final key = (paidOn.year, paidOn.month);
      byMonth[key] = (byMonth[key] ?? 0) + p.amountPaid;
    }

    // Cars that have left stop counting towards what the collection holds and
    // what it's worth. Spend above is untouched — that money really went out.
    final owned = ownedQuantity(p);
    if (owned > 0) {
      // Prorate only when part of a multi-unit purchase has gone, so rows with
      // no disposals keep reporting exactly the total they always did.
      final ownedValue = owned == p.quantity
          ? (p.totalPrice ?? 0)
          : (p.totalPrice ?? 0) * owned / p.quantity;

      unitsOwned += owned;
      collectionValue += ownedValue;
      if (p.collectionId != null) ownedCollectionIds.add(p.collectionId!);
      if (p.isChase) chaseUnits += owned;

      // Brand/shop breakdowns describe the collection, so they follow the same
      // "owned" rule as the value figures rather than counting open pre-orders.
      final brand = p.brandName?.trim();
      if (brand != null && brand.isNotEmpty) {
        final prev = byBrand[brand] ?? (0.0, 0);
        byBrand[brand] = (prev.$1 + ownedValue, prev.$2 + owned);
      }
      final shop = p.shopName?.trim();
      if (shop != null && shop.isNotEmpty) {
        final prev = byShop[shop] ?? (0.0, 0);
        byShop[shop] = (prev.$1 + ownedValue, prev.$2 + owned);
      }
    }
  }

  // Zero-fill the trend so a quiet month shows as a gap, not as a missing bar.
  final recentMonths = <MonthSpend>[];
  for (var i = monthsOfHistory - 1; i >= 0; i--) {
    final m = DateTime(now.year, now.month - i);
    recentMonths.add(MonthSpend(
      year: m.year,
      month: m.month,
      amount: byMonth[(m.year, m.month)] ?? 0,
    ));
  }

  final lastMonthDate = DateTime(now.year, now.month - 1);

  return InsightsData(
    thisMonth: byMonth[(now.year, now.month)] ?? 0,
    lastMonth: byMonth[(lastMonthDate.year, lastMonthDate.month)] ?? 0,
    recentMonths: recentMonths,
    topBrands: _top(byBrand),
    topShops: _top(byShop),
    totalSpend: totalSpend,
    collectionValue: collectionValue,
    unitsOwned: unitsOwned,
    modelsOwned: ownedCollectionIds.length,
    chaseUnits: chaseUnits,
  );
}

/// Highest spend first, capped at five rows.
List<CategorySpend> _top(Map<String, (double, int)> totals) {
  final rows = totals.entries
      .map((e) => CategorySpend(label: e.key, amount: e.value.$1, units: e.value.$2))
      .toList()
    ..sort((a, b) => b.amount.compareTo(a.amount));
  return rows.take(5).toList();
}

final insightsProvider = FutureProvider.autoDispose<InsightsData>((ref) async {
  await ensureOnline();
  final results = await Future.wait<dynamic>([
    supabase.from('tbl_purchase').select(purchaseSelect),
    fetchDisposedByPurchase(),
  ]).timeout(requestTimeout);

  final rows = results[0] as List;
  final disposed = results[1] as Map<String, int>;

  final purchases = applyDisposals(
    rows.map((r) => Purchase.fromRow(r as Map<String, dynamic>)).toList(),
    disposed,
  );

  return buildInsights(purchases, DateTime.now());
});
