import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../data/models/catalog_item.dart';
import '../catalog/catalog_data.dart';
import '../preorders/preorder_providers.dart';

/// Quick purchase entry for a known collection item (opened from the catalog
/// or a scan result). Inserts into tbl_purchase using the same rules as the
/// web Add Purchase page.
class AddPurchaseScreen extends ConsumerStatefulWidget {
  const AddPurchaseScreen({super.key, required this.item});

  final CatalogItem item;

  @override
  ConsumerState<AddPurchaseScreen> createState() => _AddPurchaseScreenState();
}

class _AddPurchaseScreenState extends ConsumerState<AddPurchaseScreen> {
  final _formKey = GlobalKey<FormState>();
  final _qtyCtrl = TextEditingController(text: '1');
  final _priceCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _linkCtrl = TextEditingController();
  final _remarkCtrl = TextEditingController();

  late bool _isChase = widget.item.isChase;
  String _purchaseType = 'online';
  String _platform = 'shopee';
  String _paymentStatus = 'paid';
  String _paymentMethod = 'none';
  DateTime? _paymentDate;
  DateTime? _collectedDate;
  String? _shopId;
  String? _shopName;
  bool _saving = false;

  @override
  void dispose() {
    _qtyCtrl.dispose();
    _priceCtrl.dispose();
    _amountCtrl.dispose();
    _linkCtrl.dispose();
    _remarkCtrl.dispose();
    super.dispose();
  }

  double get _total {
    final q = int.tryParse(_qtyCtrl.text) ?? 0;
    final p = double.tryParse(_priceCtrl.text) ?? 0;
    return q * p;
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

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ref.read(purchaseRepositoryProvider).insertPurchase(
            collectionId: _baseCollectionId,
            brandId: widget.item.brandId,
            quantity: int.parse(_qtyCtrl.text),
            pricePerUnit: double.parse(_priceCtrl.text),
            isChase: _isChase,
            purchaseType: _purchaseType,
            platform: _purchaseType == 'online' ? _platform : null,
            paymentStatus: _paymentStatus,
            paymentMethod: _paymentMethod,
            paymentDate: _paymentDate,
            collectedDate: _collectedDate,
            urlLink: _linkCtrl.text.trim().isEmpty ? null : _linkCtrl.text.trim(),
            shopId: _shopId,
            shopName: _shopName,
            remark: _remarkCtrl.text.trim().isEmpty ? null : _remarkCtrl.text.trim(),
            partialAmount: double.tryParse(_amountCtrl.text) ?? 0,
          );
      // Refresh downstream views that show purchases.
      ref.invalidate(catalogProvider);
      ref.invalidate(poItemsProvider);
      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Purchase added')));
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Failed to add purchase: $e')));
    }
  }

  /// The catalog tile id may carry a `::chase` suffix; the real collection id
  /// is the part before it.
  String get _baseCollectionId => widget.item.id.split('::').first;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final shopsAsync = ref.watch(shopsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Add Purchase')),
      body: Stack(
        children: [
          Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Item header.
                Card(
                  elevation: 0,
                  color: theme.colorScheme.surfaceContainerHighest,
                  child: ListTile(
                    title: Text(widget.item.name),
                    subtitle: Text([
                      if (widget.item.itemNo != null) widget.item.itemNo!,
                      widget.item.brandName,
                    ].join(' · ')),
                  ),
                ),
                const SizedBox(height: 16),

                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Chase variant'),
                  value: _isChase,
                  onChanged: (v) => setState(() => _isChase = v),
                ),

                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _qtyCtrl,
                        keyboardType: TextInputType.number,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                            labelText: 'Quantity', border: OutlineInputBorder()),
                        validator: (v) =>
                            (int.tryParse(v ?? '') ?? 0) < 1 ? 'Min 1' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _priceCtrl,
                        keyboardType:
                            const TextInputType.numberWithOptions(decimal: true),
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                            labelText: 'Price/unit (RM)', border: OutlineInputBorder()),
                        validator: (v) =>
                            double.tryParse(v ?? '') == null ? 'Required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text('Total: ${formatMoney(_total)}',
                      style: theme.textTheme.titleMedium),
                ),
                const SizedBox(height: 16),

                // Shop / platform.
                shopsAsync.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (e, st) => const SizedBox.shrink(),
                  data: (shops) => DropdownButtonFormField<String?>(
                    initialValue: _shopId,
                    isExpanded: true,
                    decoration: const InputDecoration(
                        labelText: 'Shop (optional)', border: OutlineInputBorder()),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('— None —')),
                      ...shops.map((s) =>
                          DropdownMenuItem(value: s.id, child: Text(s.name))),
                    ],
                    onChanged: (v) => setState(() {
                      _shopId = v;
                      _shopName = v == null
                          ? null
                          : shops.firstWhere((s) => s.id == v).name;
                    }),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _purchaseType,
                  decoration: const InputDecoration(
                      labelText: 'Purchase type', border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: 'online', child: Text('Online')),
                    DropdownMenuItem(value: 'shop', child: Text('Shop')),
                    DropdownMenuItem(value: 'meetup', child: Text('Meetup')),
                    DropdownMenuItem(value: 'event', child: Text('Event')),
                  ],
                  onChanged: (v) => setState(() => _purchaseType = v ?? 'online'),
                ),
                if (_purchaseType == 'online') ...[
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _platform,
                    decoration: const InputDecoration(
                        labelText: 'Platform', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'shopee', child: Text('Shopee')),
                      DropdownMenuItem(value: 'lazada', child: Text('Lazada')),
                      DropdownMenuItem(value: 'japan_mercari', child: Text('Japan Mercari')),
                      DropdownMenuItem(value: 'carousell', child: Text('Carousell')),
                      DropdownMenuItem(value: 'tiktok', child: Text('Tiktok')),
                      DropdownMenuItem(value: 'facebook', child: Text('Facebook')),
                      DropdownMenuItem(value: 'instagram', child: Text('Instagram')),
                      DropdownMenuItem(value: 'tokopedia', child: Text('Tokopedia')),
                      DropdownMenuItem(value: 'amazon', child: Text('Amazon')),
                      DropdownMenuItem(value: 'ebay', child: Text('eBay')),
                      DropdownMenuItem(value: 'aliexpress', child: Text('AliExpress')),
                      DropdownMenuItem(value: 'other', child: Text('Other')),
                    ],
                    onChanged: (v) => setState(() => _platform = v ?? 'other'),
                  ),
                ],
                const SizedBox(height: 16),

                // Payment.
                DropdownButtonFormField<String>(
                  initialValue: _paymentStatus,
                  decoration: const InputDecoration(
                      labelText: 'Payment status', border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: 'unpaid', child: Text('Unpaid')),
                    DropdownMenuItem(value: 'partial', child: Text('Partial')),
                    DropdownMenuItem(value: 'paid', child: Text('Paid')),
                    DropdownMenuItem(value: 'refunded', child: Text('Refunded')),
                  ],
                  onChanged: (v) => setState(() => _paymentStatus = v ?? 'paid'),
                ),
                if (_paymentStatus == 'partial') ...[
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _amountCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                        labelText: 'Amount paid so far (RM)',
                        border: OutlineInputBorder()),
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
                const SizedBox(height: 12),
                _dateField('Collection date', _collectedDate,
                    (d) => setState(() => _collectedDate = d)),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _linkCtrl,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(
                      labelText: 'Order link (optional)', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _remarkCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                      labelText: 'Notes (optional)', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 24),

                FilledButton(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16)),
                  child: const Text('Add Purchase'),
                ),
              ],
            ),
          ),
          if (_saving)
            const Positioned.fill(
              child: ColoredBox(
                color: Color(0x66000000),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
        ],
      ),
    );
  }

  Widget _dateField(String label, DateTime? value, ValueChanged<DateTime?> onPick) {
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
        if (value != null)
          IconButton(
            icon: const Icon(Icons.clear, size: 18),
            onPressed: () => onPick(null),
          ),
      ],
    );
  }
}
