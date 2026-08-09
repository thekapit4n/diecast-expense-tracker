import 'package:flutter/material.dart';

import '../../data/models/catalog_item.dart';
import '../../theme/app_theme.dart';
import '../catalog/catalog_screen.dart';
import '../catalog/item_detail_sheet.dart';
import '../catalog/widgets/diecast_card.dart';
import 'scan_analysis.dart';
import 'scan_matching.dart';

/// Shows what a scan found: the text the OCR kept (barcode stripped out),
/// a duplicate warning only when the top match is unambiguous, and every
/// candidate grouped by how confident the match is.
class ScanResultScreen extends StatelessWidget {
  const ScanResultScreen({
    super.key,
    required this.analysis,
    required this.matches,
  });

  final ScanTextAnalysis analysis;
  final List<ScanMatch> matches;

  @override
  Widget build(BuildContext context) {
    final top = matches.isNotEmpty ? matches.first : null;
    // Automatic only for an unambiguous top match — a likely/possible guess
    // isn't solid enough grounds to tell the user they already own this.
    final showDuplicate =
        top != null &&
        top.confidence == ScanConfidence.exact &&
        (top.item.totalQty > 0 || top.item.preOrderQty > 0);

    final exact = matches
        .where((m) => m.confidence == ScanConfidence.exact)
        .toList();
    final likely = matches
        .where((m) => m.confidence == ScanConfidence.likely)
        .toList();
    final possible = matches
        .where((m) => m.confidence == ScanConfidence.possible)
        .toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Scan Result')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _RecognizedTextCard(analysis: analysis),
          const SizedBox(height: 16),

          if (showDuplicate) _DuplicateWarning(item: top.item),

          if (matches.isEmpty)
            const _EmptyState()
          else ...[
            if (exact.isNotEmpty) _matchSection(context, 'Exact match', exact),
            if (likely.isNotEmpty)
              _matchSection(context, 'Likely matches', likely),
            if (possible.isNotEmpty)
              _matchSection(context, 'Possible matches', possible),
          ],
        ],
      ),
    );
  }

  Widget _matchSection(
    BuildContext context,
    String title,
    List<ScanMatch> group,
  ) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$title (${group.length})', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.52,
            ),
            itemCount: group.length,
            itemBuilder: (_, i) => _MatchTile(match: group[i]),
          ),
        ],
      ),
    );
  }
}

class _MatchTile extends StatelessWidget {
  const _MatchTile({required this.match});
  final ScanMatch match;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: DiecastCard(
            item: match.item,
            onTap: () => showItemDetailSheet(context, match.item),
          ),
        ),
        const SizedBox(height: 4),
        if (match.reasons.isNotEmpty)
          Text(
            match.reasons.first,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.outline,
            ),
          ),
      ],
    );
  }
}

class _RecognizedTextCard extends StatefulWidget {
  const _RecognizedTextCard({required this.analysis});
  final ScanTextAnalysis analysis;

  @override
  State<_RecognizedTextCard> createState() => _RecognizedTextCardState();
}

class _RecognizedTextCardState extends State<_RecognizedTextCard> {
  bool _showRaw = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final analysis = widget.analysis;
    final usefulText = analysis.usefulText.trim();

    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.document_scanner_outlined),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    usefulText.isEmpty ? 'No usable text found' : usefulText,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            if (analysis.ignoredBarcodeValues.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Barcode ignored: ${analysis.ignoredBarcodeValues.join(', ')}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
            ],
            if (analysis.rawText.trim().isNotEmpty) ...[
              const SizedBox(height: 4),
              TextButton(
                onPressed: () => setState(() => _showRaw = !_showRaw),
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  _showRaw ? 'Hide raw OCR text' : 'Show raw OCR text',
                ),
              ),
              if (_showRaw)
                Text(
                  analysis.rawText.trim(),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.outline,
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        children: [
          Icon(Icons.search_off, size: 48, color: theme.colorScheme.outline),
          const SizedBox(height: 12),
          const Text(
            'No matching item found',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            'Try capturing the item number more clearly, or search manually in the Catalog.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.outline,
            ),
          ),
          const SizedBox(height: 20),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.camera_alt_outlined, size: 18),
                label: const Text('Retake photo'),
              ),
              OutlinedButton.icon(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.photo_library_outlined, size: 18),
                label: const Text('Choose another image'),
              ),
              FilledButton.tonalIcon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CatalogScreen()),
                ),
                icon: const Icon(Icons.grid_view_outlined, size: 18),
                label: const Text('Open Catalog'),
              ),
            ],
          ),
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
      if (item.totalQty > 0)
        'You already own ${item.totalQty} unit(s) of this item.',
      if (item.preOrderQty > 0)
        'You also have ${item.preOrderQty} unit(s) on pre-order.',
    ];

    final warning = AppStatusColors.of(context).warning;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: warning.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: warning),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_amber_rounded, color: warning),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Already in your collection',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
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
