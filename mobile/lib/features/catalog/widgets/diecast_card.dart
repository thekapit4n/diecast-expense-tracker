import 'package:flutter/material.dart';

import '../../../data/models/catalog_item.dart';
import 'catalog_image.dart';

/// A single catalog tile: square image with owned/pre-order/chase/case/scale
/// badges, then name / item no / brand. Mirrors the web DiecastCard.
class DiecastCard extends StatelessWidget {
  const DiecastCard({super.key, required this.item, required this.onTap});

  final CatalogItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final borderColor = item.isOwnedTile
        ? Colors.green
        : item.isPreOrderTile
            ? Colors.blue
            : theme.colorScheme.outlineVariant;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor, width: item.isOwnedTile || item.isPreOrderTile ? 1.5 : 1),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CatalogImage(sources: item.imageSources),
                  if (item.isOwnedTile)
                    _badge(context, 'OWNED', Colors.green, top: true)
                  else if (item.isPreOrderTile)
                    _badge(context, 'PRE-ORDER', Colors.blue, top: true),
                  if (item.scale != null)
                    Positioned(
                      right: 6,
                      bottom: 6,
                      child: _chip(item.scale!, Colors.black87, Colors.white),
                    ),
                  if (item.isChase || item.isCase)
                    Positioned(
                      left: 6,
                      bottom: 6,
                      child: Row(children: [
                        if (item.isChase) _chip('CHASE', Colors.red, Colors.white),
                        if (item.isChase && item.isCase) const SizedBox(width: 4),
                        if (item.isCase) _chip('CASE', Colors.amber.shade700, Colors.white),
                      ]),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall
                          ?.copyWith(fontWeight: FontWeight.w600, height: 1.2)),
                  if (item.itemNo != null)
                    Text(item.itemNo!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelSmall
                            ?.copyWith(color: theme.colorScheme.outline)),
                  Text(item.brandName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.labelSmall
                          ?.copyWith(color: theme.colorScheme.outline)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _badge(BuildContext context, String text, Color color, {bool top = false}) {
    return Positioned(
      left: 6,
      top: 6,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(text,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 9,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5)),
      ),
    );
  }

  Widget _chip(String text, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(text,
          style: TextStyle(
              color: fg, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.3)),
    );
  }
}
