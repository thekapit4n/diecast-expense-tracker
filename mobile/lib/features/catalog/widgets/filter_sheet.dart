import 'package:flutter/material.dart';

/// Opens a bottom sheet for picking one ([multi] = false) or several
/// ([multi] = true) values out of [options], with Clear/Apply actions.
///
/// Long multi-select lists (more than [_searchThreshold] options) get a
/// search box + scrollable checkbox list instead of a chip wrap — searching
/// beats scrolling once there are more than a handful of brands.
///
/// Returns the applied selection, or `null` if the sheet was dismissed
/// without applying (so the caller can leave its filter state untouched).
Future<Set<String>?> showFilterSheet(
  BuildContext context, {
  required String title,
  required List<(String value, String label)> options,
  required Set<String> initial,
  required bool multi,
}) {
  return showModalBottomSheet<Set<String>>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _FilterSheet(
      title: title,
      options: options,
      initial: initial,
      multi: multi,
    ),
  );
}

const _searchThreshold = 6;

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({
    required this.title,
    required this.options,
    required this.initial,
    required this.multi,
  });

  final String title;
  final List<(String value, String label)> options;
  final Set<String> initial;
  final bool multi;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late Set<String> _selected = {...widget.initial};
  final _searchCtrl = TextEditingController();
  String _query = '';

  bool get _searchable =>
      widget.multi && widget.options.length > _searchThreshold;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _toggle(String value) {
    setState(() {
      if (widget.multi) {
        _selected.contains(value)
            ? _selected.remove(value)
            : _selected.add(value);
      } else {
        _selected = {value};
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final q = _query.trim().toLowerCase();
    final filtered = q.isEmpty
        ? widget.options
        : widget.options.where((o) => o.$2.toLowerCase().contains(q)).toList();

    return SafeArea(
      top: false,
      child: AnimatedPadding(
        duration: const Duration(milliseconds: 100),
        curve: Curves.decelerate,
        // showModalBottomSheet doesn't dodge the keyboard on its own — this
        // keeps the search box and footer buttons above it instead of
        // letting them sit hidden underneath.
        padding: EdgeInsets.fromLTRB(
          20,
          4,
          20,
          16 + MediaQuery.of(context).viewInsets.bottom,
        ),
        // Belt-and-braces: on shorter phones the keyboard can eat enough
        // height that title + search + list + footer no longer fit, so this
        // scrolls instead of overflowing rather than assuming it always fits.
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.title, style: theme.textTheme.titleMedium),
              const SizedBox(height: 12),
              if (_searchable) ...[
                TextField(
                  controller: _searchCtrl,
                  onChanged: (v) => setState(() => _query = v),
                  decoration: InputDecoration(
                    hintText: 'Search ${widget.title}',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    isDense: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 340),
                  child: filtered.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(child: Text('No matches')),
                        )
                      : Builder(
                          builder: (context) {
                            // Already-checked options float to the top (like
                            // the Die Carz reference) so applied picks stay
                            // visible instead of getting lost in a long list.
                            final checked = <(String, String)>[];
                            final unchecked = <(String, String)>[];
                            for (final o in filtered) {
                              (_selected.contains(o.$1) ? checked : unchecked)
                                  .add(o);
                            }
                            return ListView(
                              shrinkWrap: true,
                              children: [
                                if (q.isEmpty)
                                  CheckboxListTile(
                                    title: const Text('All'),
                                    value: _selected.isEmpty,
                                    dense: true,
                                    controlAffinity:
                                        ListTileControlAffinity.trailing,
                                    onChanged: (_) =>
                                        setState(() => _selected = {}),
                                  ),
                                for (final (value, label) in checked)
                                  CheckboxListTile(
                                    title: Text(label),
                                    value: true,
                                    dense: true,
                                    controlAffinity:
                                        ListTileControlAffinity.trailing,
                                    onChanged: (_) => _toggle(value),
                                  ),
                                if (checked.isNotEmpty && unchecked.isNotEmpty)
                                  const Divider(height: 1),
                                for (final (value, label) in unchecked)
                                  CheckboxListTile(
                                    title: Text(label),
                                    value: false,
                                    dense: true,
                                    controlAffinity:
                                        ListTileControlAffinity.trailing,
                                    onChanged: (_) => _toggle(value),
                                  ),
                              ],
                            );
                          },
                        ),
                ),
              ] else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (widget.multi)
                      FilterChip(
                        label: const Text('All'),
                        selected: _selected.isEmpty,
                        onSelected: (_) => setState(() => _selected = {}),
                      ),
                    for (final (value, label) in widget.options)
                      FilterChip(
                        label: Text(label),
                        selected: _selected.contains(value),
                        onSelected: (_) => _toggle(value),
                      ),
                  ],
                ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      // Single-select always needs one value picked, so Clear
                      // falls back to the first option (expected to be the
                      // neutral "All" choice) instead of an empty selection.
                      onPressed: () => setState(
                        () => _selected = widget.multi
                            ? {}
                            : {widget.options.first.$1},
                      ),
                      child: const Text('Clear'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => Navigator.of(context).pop(_selected),
                      child: const Text('Apply'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
