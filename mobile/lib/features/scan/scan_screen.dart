import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image_picker/image_picker.dart';

import '../catalog/catalog_data.dart';
import '../shell/nav_intent.dart';
import 'scan_analysis.dart';
import 'scan_matching.dart';
import 'scan_result_screen.dart';

/// Smart scanner: a full-screen live camera view (shutter + gallery button,
/// no OS picker in between) that OCRs the whole box and matches the text
/// (minus any barcode) against the catalog. No live barcode camera — the
/// database has no barcode field, so hunting for one only distracts from the
/// item number/brand/model text that's actually useful.
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> with WidgetsBindingObserver {
  final _picker = ImagePicker();

  CameraController? _controller;
  bool _initializingCamera = false;
  String? _cameraError;
  FlashMode _flashMode = FlashMode.off;

  bool _busy = false;
  String? _status;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Scan starts as a non-visible tab (Home is the default), so the camera
    // is deliberately left uninitialized here — see the scanTabVisibleProvider
    // listener in build() for when it actually gets acquired.
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused) {
      _releaseCamera();
    } else if (state == AppLifecycleState.resumed) {
      // Only reacquire if Scan is still the tab the user's actually on.
      if (ref.read(scanTabVisibleProvider)) _initCamera();
    }
  }

  Future<void> _initCamera() async {
    if (_controller != null || _initializingCamera) return;
    _initializingCamera = true;
    if (mounted) setState(() => _cameraError = null);
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        throw CameraException('no_camera', 'No camera found on this device.');
      }
      final back = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(back, ResolutionPreset.high, enableAudio: false);
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() => _controller = controller);
    } catch (e) {
      if (mounted) setState(() => _cameraError = _describeCameraError(e));
    } finally {
      _initializingCamera = false;
    }
  }

  String _describeCameraError(Object e) {
    if (e is CameraException && e.code == 'CameraAccessDenied') {
      return 'Camera permission denied. Enable it in Settings, or use the gallery below.';
    }
    return 'Camera unavailable on this device. Use the gallery below instead.';
  }

  Future<void> _releaseCamera() async {
    final controller = _controller;
    if (controller == null) return;
    _controller = null;
    if (mounted) setState(() {});
    await controller.dispose();
  }

  Future<void> _toggleFlash() async {
    final controller = _controller;
    if (controller == null) return;
    final next = _flashMode == FlashMode.torch ? FlashMode.off : FlashMode.torch;
    try {
      await controller.setFlashMode(next);
      if (mounted) setState(() => _flashMode = next);
    } catch (_) {
      // Some lenses don't support torch — button just won't toggle.
    }
  }

  Future<List<ScanTextLine>> _recognizeLines(String path) async {
    final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
    try {
      final result = await recognizer.processImage(InputImage.fromFilePath(path));
      return [
        for (final block in result.blocks)
          for (final line in block.lines)
            ScanTextLine(text: line.text, confidence: line.confidence),
      ];
    } finally {
      await recognizer.close();
    }
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized || _busy) return;
    try {
      final file = await controller.takePicture();
      await _processImage(file);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Could not capture photo: $e')));
    }
  }

  Future<void> _pickFromGallery() async {
    if (_busy) return;
    final file = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 90);
    if (file == null) return; // user cancelled — not an error
    await _processImage(file);
  }

  Future<void> _processImage(XFile file) async {
    if (_busy) return;
    try {
      setState(() {
        _busy = true;
        _status = 'Reading box text...';
      });

      final lines = await _recognizeLines(file.path);
      final analysis = analyseOcrLines(lines);
      if (!mounted) return;

      setState(() => _status = 'Searching catalog...');
      final catalog = await ref.read(catalogProvider.future);
      if (!mounted) return;

      setState(() => _status = 'Preparing matches...');
      final matches = matchCatalogItems(catalog.items, analysis.usefulText);
      if (!mounted) return;

      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ScanResultScreen(analysis: analysis, matches: matches),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Could not read image: $e')));
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _status = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Scan is kept alive in the bottom-nav IndexedStack like every other tab
    // (so the nav bar stays visible while scanning), but unlike the others it
    // holds a real camera resource — this is what tells it to acquire the
    // camera when the tab becomes visible and release it the moment it isn't,
    // instead of leaving it running in the background on other tabs.
    ref.listen<bool>(scanTabVisibleProvider, (previous, next) {
      if (next) {
        _initCamera();
      } else {
        _releaseCamera();
      }
    });

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          fit: StackFit.expand,
          children: [
            _cameraBody(),
            _topOverlay(),
            _bottomControls(),
            if (_busy) _processingOverlay(),
          ],
        ),
      ),
    );
  }

  Widget _cameraBody() {
    if (_cameraError != null) return _errorBody();

    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return const ColoredBox(
        color: Colors.black,
        child: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    // CameraPreview otherwise letterboxes to the sensor's aspect ratio —
    // this crops it to fill the screen edge-to-edge instead.
    return LayoutBuilder(
      builder: (context, constraints) => ClipRect(
        child: FittedBox(
          fit: BoxFit.cover,
          child: SizedBox(
            width: constraints.maxWidth,
            height: constraints.maxWidth * controller.value.aspectRatio,
            child: CameraPreview(controller),
          ),
        ),
      ),
    );
  }

  Widget _errorBody() {
    return Container(
      color: Colors.black,
      alignment: Alignment.center,
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.no_photography_outlined, color: Colors.white54, size: 48),
            const SizedBox(height: 16),
            Text(_cameraError!,
                textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70)),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _busy ? null : _pickFromGallery,
              icon: const Icon(Icons.photo_library_outlined),
              label: const Text('Choose from gallery'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _topOverlay() {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        bottom: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 8, 24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.black.withValues(alpha: 0.55), Colors.transparent],
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text('Scan Box',
                        style: TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                  ),
                  if (_controller != null)
                    IconButton(
                      onPressed: _toggleFlash,
                      icon: Icon(
                        _flashMode == FlashMode.torch ? Icons.flash_on : Icons.flash_off,
                        color: Colors.white,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 2),
              const Text(
                'Capture the item number, brand and model name clearly. '
                'The barcode will be ignored automatically.',
                style: TextStyle(color: Colors.white70, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _bottomControls() {
    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.bottomCenter,
              end: Alignment.topCenter,
              colors: [Colors.black.withValues(alpha: 0.6), Colors.transparent],
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _GalleryButton(onTap: _busy ? null : _pickFromGallery),
              _ShutterButton(onTap: () => _capture(), busy: _busy || _controller == null),
              const SizedBox(width: 48), // balances the gallery button so the shutter sits centred
            ],
          ),
        ),
      ),
    );
  }

  Widget _processingOverlay() {
    return Container(
      color: Colors.black54,
      child: Center(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator(),
                const SizedBox(height: 16),
                Text(_status ?? 'Working...'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _GalleryButton extends StatelessWidget {
  const _GalleryButton({required this.onTap});
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white24,
          border: Border.all(color: Colors.white70, width: 1.5),
        ),
        child: const Icon(Icons.photo_library_outlined, color: Colors.white, size: 22),
      ),
    );
  }
}

class _ShutterButton extends StatelessWidget {
  const _ShutterButton({required this.onTap, required this.busy});
  final VoidCallback onTap;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: busy ? null : onTap,
      child: Container(
        width: 72,
        height: 72,
        padding: const EdgeInsets.all(6),
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          border: Border.fromBorderSide(BorderSide(color: Colors.white, width: 4)),
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: busy ? Colors.white38 : Colors.white,
          ),
        ),
      ),
    );
  }
}
