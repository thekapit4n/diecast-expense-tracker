import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../catalog/catalog_data.dart';
import 'scan_matching.dart';
import 'scan_result_screen.dart';

/// Smart scanner: a live barcode camera, plus capture-photo / pick-from-gallery
/// actions that OCR the box, extract an item number, and match it against the
/// collection. Camera features need a real device; gallery works anywhere.
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final _scanner = MobileScannerController(detectionSpeed: DetectionSpeed.noDuplicates);
  final _picker = ImagePicker();
  bool _busy = false;
  String? _lastBarcode;

  @override
  void dispose() {
    _scanner.dispose();
    super.dispose();
  }

  Future<String> _ocr(String path) async {
    final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
    try {
      final result = await recognizer.processImage(InputImage.fromFilePath(path));
      return result.text;
    } finally {
      await recognizer.close();
    }
  }

  Future<void> _scanFromImage(ImageSource source) async {
    try {
      final file = await _picker.pickImage(source: source, imageQuality: 90);
      if (file == null) return;
      setState(() => _busy = true);

      final text = await _ocr(file.path);
      final itemNo = extractItemNumber(text);
      final catalog = await ref.read(catalogProvider.future);
      final matches =
          matchCatalogItems(catalog.items, itemNumber: itemNo, rawText: text);

      if (!mounted) return;
      setState(() => _busy = false);
      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => ScanResultScreen(
          recognizedText: text,
          itemNumber: itemNo,
          matches: matches,
        ),
      ));
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Could not read image: $e')));
    }
  }

  Future<void> _searchBarcode(String code) async {
    setState(() => _busy = true);
    final catalog = await ref.read(catalogProvider.future);
    // Barcodes aren't stored in the DB, so try the code as an item-no fragment.
    final matches = matchCatalogItems(catalog.items, itemNumber: code, rawText: code);
    if (!mounted) return;
    setState(() => _busy = false);
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ScanResultScreen(
        recognizedText: code,
        itemNumber: code,
        matches: matches,
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan Diecast')),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                MobileScanner(
                  controller: _scanner,
                  onDetect: (capture) {
                    final code = capture.barcodes.isNotEmpty
                        ? capture.barcodes.first.rawValue
                        : null;
                    if (code != null && code != _lastBarcode) {
                      setState(() => _lastBarcode = code);
                    }
                  },
                  errorBuilder: (context, error) => _CameraUnavailable(error: error),
                ),
                // Scan frame guide.
                Center(
                  child: Container(
                    width: 240,
                    height: 240,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white70, width: 2),
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
                if (_lastBarcode != null)
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 16,
                    child: _BarcodeBanner(
                      code: _lastBarcode!,
                      onSearch: () => _searchBarcode(_lastBarcode!),
                    ),
                  ),
                if (_busy)
                  Container(
                    color: Colors.black45,
                    child: const Center(child: CircularProgressIndicator()),
                  ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Text(
                    'Point at the box barcode, or capture the item number (e.g. MGT00012).',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _busy
                              ? null
                              : () => _scanFromImage(ImageSource.camera),
                          icon: const Icon(Icons.camera_alt),
                          label: const Text('Capture text'),
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.tonalIcon(
                          onPressed: _busy
                              ? null
                              : () => _scanFromImage(ImageSource.gallery),
                          icon: const Icon(Icons.photo_library),
                          label: const Text('Gallery'),
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BarcodeBanner extends StatelessWidget {
  const _BarcodeBanner({required this.code, required this.onSearch});
  final String code;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.8),
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            const Icon(Icons.qr_code, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Text('Barcode: $code',
                  style: const TextStyle(color: Colors.white),
                  overflow: TextOverflow.ellipsis),
            ),
            TextButton(onPressed: onSearch, child: const Text('Search')),
          ],
        ),
      ),
    );
  }
}

class _CameraUnavailable extends StatelessWidget {
  const _CameraUnavailable({required this.error});
  final MobileScannerException error;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      alignment: Alignment.center,
      child: const Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.no_photography, color: Colors.white54, size: 48),
            SizedBox(height: 12),
            Text(
              'Live camera needs a real device.\nUse "Capture text" or "Gallery" below.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70),
            ),
          ],
        ),
      ),
    );
  }
}
