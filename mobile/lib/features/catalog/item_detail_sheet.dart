import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../core/ownership.dart';
import '../../data/models/catalog_item.dart';
import '../../data/models/purchase.dart';
import 'widgets/catalog_image.dart';

/// Bottom sheet showing an item's images, key facts, ownership status and
/// purchase history. Opened by tapping a catalog card.
void showItemDetailSheet(BuildContext context, CatalogItem item) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (context, scrollController) =>
          _ItemDetail(item: item, controller: scrollController),
    ),
  );
}

class _ItemDetail extends StatelessWidget {
  const _ItemDetail({required this.item, required this.controller});
  final CatalogItem item;
  final ScrollController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      controller: controller,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        // Image gallery (each slot tried independently).
        SizedBox(
          height: 220,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: item.imageSources.isEmpty ? 1 : item.imageSources.length,
            separatorBuilder: (_, i) => const SizedBox(width: 8),
            itemBuilder: (_, i) => ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                width: 220,
                child: CatalogImage(
                  sources:
                      item.imageSources.isEmpty ? const [] : [item.imageSources[i]],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),

        Text(item.name, style: theme.textTheme.titleLarge),
        const SizedBox(height: 4),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            _tag(context, item.brandName, theme.colorScheme.primary),
            if (item.itemNo != null) _tag(context, item.itemNo!, Colors.blueGrey),
            if (item.scale != null) _tag(context, item.scale!, Colors.blueGrey),
            if (item.isChase) _tag(context, 'CHASE', Colors.red),
            if (item.isCase) _tag(context, 'CASE', Colors.amber.shade800),
          ],
        ),
        const SizedBox(height: 16),

        // Ownership summary.
        Row(
          children: [
            Expanded(
              child: _statBox(context, 'Owned', '${item.totalQty}', Colors.green),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _statBox(
                  context, 'Pre-order', '${item.preOrderQty}', Colors.blue),
            ),
          ],
        ),
        const SizedBox(height: 20),

        Text('Purchase history', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        if (item.purchases.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text('No purchases recorded'),
          )
        else
          ...(item.purchases.toList()
                ..sort((a, b) =>
                    (b.totalPrice ?? 0).compareTo(a.totalPrice ?? 0)))
              .map((p) => _PurchaseRow(purchase: p)),
      ],
    );
  }

  Widget _tag(BuildContext context, String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(text,
            style: TextStyle(
                color: color, fontSize: 12, fontWeight: FontWeight.w600)),
      );

  Widget _statBox(BuildContext context, String label, String value, Color color) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(value,
              style: theme.textTheme.headlineMedium
                  ?.copyWith(color: color, fontWeight: FontWeight.bold)),
          Text(label, style: theme.textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _PurchaseRow extends StatelessWidget {
  const _PurchaseRow({required this.purchase});
  final Purchase purchase;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (label, color) = _status(purchase, theme);
    final where = [
      if (purchase.paymentStatus != null) purchase.paymentStatus,
    ].whereType<String>().join(' · ');

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      color: theme.colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${purchase.quantity} × ${formatMoney(purchase.pricePerUnit)}',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  if (where.isNotEmpty)
                    Text(where,
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: theme.colorScheme.outline)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(formatMoney(purchase.totalPrice),
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(label,
                      style: TextStyle(
                          fontSize: 11,
                          color: color,
                          fontWeight: FontWeight.w600)),
                ),
              ],
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
