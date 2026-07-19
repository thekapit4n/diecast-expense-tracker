import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../data/models/po_item.dart';
import '../../data/repositories/purchase_repository.dart';
import 'preorder_providers.dart';

/// Bottom sheet to update one PO item's pickup/payment status. Offers quick
/// actions plus a full form, mirroring the web PoStatusModal.
Future<bool?> showPoStatusSheet(BuildContext context, WidgetRef ref, PoItem item) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.9,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (context, controller) =>
          _PoStatusForm(item: item, controller: controller),
    ),
  );
}

class _PoStatusForm extends ConsumerStatefulWidget {
  const _PoStatusForm({required this.item, required this.controller});
  final PoItem item;
  final ScrollController controller;

  @override
  ConsumerState<_PoStatusForm> createState() => _PoStatusFormState();
}

class _PoStatusFormState extends ConsumerState<_PoStatusForm> {
  late String _paymentStatus;
  late String _paymentMethod;
  final _amountCtrl = TextEditingController();
  DateTime? _paymentDate;
  DateTime? _readyDate;
  DateTime? _pickupDeadline;
  DateTime? _collectedDate;
  bool _saving = false;

  PoItem get _item => widget.item;

  @override
  void initState() {
    super.initState();
    _paymentStatus = _item.paymentStatus ?? 'unpaid';
    _paymentMethod = _item.paymentMethod ?? 'none';
    if (_item.amountPaid > 0) _amountCtrl.text = _item.amountPaid.toString();
    _paymentDate = parseDbDate(_item.paymentDate);
    _readyDate = parseDbDate(_item.readyDate);
    _pickupDeadline = parseDbDate(_item.pickupDeadline);
    _collectedDate = parseDbDate(_item.collectedDate);
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate(ValueChanged<DateTime?> onPick, DateTime? current) async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: current ?? now,
      firstDate: DateTime(now.year - 3),
      lastDate: DateTime(now.year + 3),
    );
    if (d != null) onPick(d);
  }

  void _onCollectedChanged(DateTime? date) {
    setState(() {
      _collectedDate = date;
      if (date != null && _paymentStatus != 'paid' && _paymentStatus != 'refunded') {
        _paymentStatus = 'paid';
        _paymentDate ??= date;
      }
    });
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(purchaseRepositoryProvider).updatePoStatus(
            purchaseId: _item.id,
            totalPrice: _item.totalPrice,
            paymentStatus: _paymentStatus,
            partialAmount: double.tryParse(_amountCtrl.text) ?? 0,
            paymentMethod: _paymentMethod,
            paymentDate: _paymentDate,
            readyDate: _readyDate,
            pickupDeadline: _pickupDeadline,
            collectedDate: _collectedDate,
          );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Failed to save: $e')));
    }
  }

  Future<void> _runQuick(Future<void> Function() op) async {
    setState(() => _saving = true);
    try {
      await op();
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final repo = ref.read(purchaseRepositoryProvider);
    final balance = (_item.totalPrice - (double.tryParse(_amountCtrl.text) ?? 0));

    return Stack(
      children: [
        ListView(
          controller: widget.controller,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
          children: [
            Text('Update status', style: theme.textTheme.titleLarge),
            Text(_item.collectionName,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.outline)),
            const SizedBox(height: 16),

            // Quick actions.
            Text('Quick actions', style: theme.textTheme.titleSmall),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _quick('Mark ready', Icons.local_shipping_outlined,
                    () => _runQuick(() => repo.markReady(_item))),
                _quick('Mark fully paid', Icons.check_circle_outline,
                    () => _runQuick(() => repo.markFullyPaid(_item))),
                _quick('Mark collected', Icons.inventory_2_outlined,
                    () => _runQuick(() => repo.markCollected(_item))),
                _quick('Cancel order', Icons.cancel_outlined,
                    () => _confirmCancel(repo), danger: true),
              ],
            ),
            const Divider(height: 32),

            // Full form.
            Text('Payment', style: theme.textTheme.titleSmall),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _paymentStatus,
              decoration: const InputDecoration(
                  labelText: 'Payment status', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'unpaid', child: Text('Unpaid')),
                DropdownMenuItem(value: 'partial', child: Text('Partial (deposit paid)')),
                DropdownMenuItem(value: 'paid', child: Text('Paid')),
                DropdownMenuItem(value: 'refunded', child: Text('Refunded')),
              ],
              onChanged: (v) => setState(() => _paymentStatus = v ?? 'unpaid'),
            ),
            if (_paymentStatus == 'partial') ...[
              const SizedBox(height: 12),
              TextField(
                controller: _amountCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  labelText: 'Amount paid so far (RM)',
                  helperText: 'Balance: ${formatMoney(balance > 0 ? balance : 0)}',
                  border: const OutlineInputBorder(),
                ),
              ),
            ],
            if (_paymentStatus != 'unpaid') ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _paymentMethod,
                decoration: const InputDecoration(
                    labelText: 'Payment method', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'none', child: Text('Not specified')),
                  DropdownMenuItem(value: 'cash', child: Text('Cash')),
                  DropdownMenuItem(value: 'qr_payment', child: Text('QR Payment')),
                  DropdownMenuItem(value: 'credit_card', child: Text('Credit Card')),
                  DropdownMenuItem(value: 'fpx', child: Text('FPX')),
                ],
                onChanged: (v) => setState(() => _paymentMethod = v ?? 'none'),
              ),
              const SizedBox(height: 12),
              _dateField('Payment date', _paymentDate,
                  (d) => setState(() => _paymentDate = d)),
            ],
            const Divider(height: 32),

            Text('Pickup', style: theme.textTheme.titleSmall),
            const SizedBox(height: 8),
            _dateField('Ready date', _readyDate,
                (d) => setState(() => _readyDate = d), todayShortcut: true),
            const SizedBox(height: 12),
            _dateField('Pickup deadline', _pickupDeadline,
                (d) => setState(() => _pickupDeadline = d)),
            const SizedBox(height: 12),
            _dateField('Collected date', _collectedDate, _onCollectedChanged,
                todayShortcut: true),
            const SizedBox(height: 24),

            FilledButton(
              onPressed: _saving ? null : _save,
              style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16)),
              child: const Text('Save'),
            ),
          ],
        ),
        if (_saving)
          const Positioned.fill(
            child: ColoredBox(
              color: Color(0x66000000),
              child: Center(child: CircularProgressIndicator()),
            ),
          ),
      ],
    );
  }

  Widget _quick(String label, IconData icon, VoidCallback onTap,
      {bool danger = false}) {
    return ActionChip(
      avatar: Icon(icon, size: 18, color: danger ? Colors.red : null),
      label: Text(label, style: TextStyle(color: danger ? Colors.red : null)),
      onPressed: _saving ? null : onTap,
    );
  }

  Future<void> _confirmCancel(PurchaseRepository repo) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel this pre-order?'),
        content: Text(_item.collectionName),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Keep')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              style: FilledButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('Cancel order')),
        ],
      ),
    );
    if (ok == true) await _runQuick(() => repo.markCancelled(_item));
  }

  Widget _dateField(String label, DateTime? value, ValueChanged<DateTime?> onPick,
      {bool todayShortcut = false}) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => _pickDate(onPick, value),
            icon: const Icon(Icons.calendar_today, size: 16),
            label: Align(
              alignment: Alignment.centerLeft,
              child: Text(value == null ? label : '$label: ${toDbDate(value)}'),
            ),
            style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12)),
          ),
        ),
        if (todayShortcut)
          TextButton(
            onPressed: () => onPick(DateTime.now()),
            child: const Text('Today'),
          ),
        if (value != null)
          IconButton(
            icon: const Icon(Icons.clear, size: 18),
            onPressed: () => onPick(null),
          ),
      ],
    );
  }
}
