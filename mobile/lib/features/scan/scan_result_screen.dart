import 'package:flutter/material.dart';

import '../../data/models/catalog_item.dart';
import '../catalog/item_detail_sheet.dart';
import '../catalog/widgets/diecast_card.dart';

/// Shows what a scan found: a duplicate warning if the top match is already
/// owned/pre-ordered, the recognized text, and the matching catalog tiles.
class ScanResultScreen extends StatelessWidget {
  const ScanResultScreen({
    super.key,
    required this.recognizedText,
    required this.itemNumber,
    required this.matches,
  });

  final String recognizedText;
  final String? itemNumber;
  final List<CatalogItem> matches;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final top = matches.isNotEmpty ? matches.first : null;
    final showDuplicate =
        top != null && (top.totalQty > 0 || top.preOrderQty > 0);

    return Scaffold(
      appBar: AppBar(title: const Text('Scan Result')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Recognized info.
          Card(
            elevation: 0,
            color: theme.colorScheme.surfaceContainerHighest,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  const Icon(Icons.document_scanner_outlined),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          itemNumber != null
                              ? 'Detected item no: $itemNumber'
                              : 'No item number detected',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        if (recognizedText.trim().isNotEmpty)
                          Text(
                            recognizedText.trim().replaceAll('\n', ' '),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall
                                ?.copyWith(color: theme.colorScheme.outline),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Duplicate warning.
          if (showDuplicate) _DuplicateWarning(item: top),

          // Matches.
          if (matches.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Column(
                children: [
                  Icon(Icons.search_off,
                      size: 48, color: theme.colorScheme.outline),
                  const SizedBox(height: 12),
                  const Text('No matching item found',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(
                    'Try capturing the item number more clearly, or search manually in the Catalog.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: theme.colorScheme.outline),
                  ),
                ],
              ),
            )
          else ...[
            Text(
              matches.length == 1
                  ? '1 match'
                  : '${matches.length} possible matches',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.62,
              ),
              itemCount: matches.length,
              itemBuilder: (_, i) => DiecastCard(
                item: matches[i],
                onTap: () => showItemDetailSheet(context, matches[i]),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DuplicateWarning extends StatelessWidget {
  const _DuplicateWarning({required this.item});
  final CatalogItem item;

  @override
  Widget build(BuildContext context) {
    final lines = <String>[
      if (item.totalQty > 0) 'You already own ${item.totalQty} unit(s) of this item.',
      if (item.preOrderQty > 0)
        'You also have ${item.preOrderQty} unit(s) on pre-order.',
    ];

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.amber.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.amber.shade700),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_amber_rounded, color: Colors.amber.shade800),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Already in your collection',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                ...lines.map((l) => Text(l)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
