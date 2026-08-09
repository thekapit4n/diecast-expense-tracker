import 'package:flutter/material.dart';

/// Hugeicons "Scan-Search" icon (24x24 viewBox), stroke-rounded style.
///
/// Not part of the free `hugeicons` pub package, so the path data is
/// reproduced directly from the SVG downloaded from
/// https://hugeicons.com/icon/scan-search?style=stroke-rounded
class HugeScanSearchIcon extends StatelessWidget {
  const HugeScanSearchIcon({super.key, this.size, this.color});

  final double? size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final iconTheme = IconTheme.of(context);
    final resolvedSize = size ?? iconTheme.size ?? 24.0;
    final resolvedColor = color ?? iconTheme.color ?? const Color(0xFF000000);
    return CustomPaint(
      size: Size.square(resolvedSize),
      painter: _HugeScanSearchIconPainter(resolvedColor),
    );
  }
}

class _HugeScanSearchIconPainter extends CustomPainter {
  _HugeScanSearchIconPainter(this.color);

  final Color color;

  static const double _viewBoxSize = 24;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / _viewBoxSize;
    canvas.scale(scale);

    final stroke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final magnifier = Path()
      ..moveTo(15.4922, 15)
      ..lineTo(17.4922, 17)
      ..moveTo(16.4922, 11.5)
      ..cubicTo(16.4922, 9.01472, 14.4775, 7, 11.9922, 7)
      ..cubicTo(9.50691, 7, 7.49219, 9.01472, 7.49219, 11.5)
      ..cubicTo(7.49219, 13.9853, 9.50691, 16, 11.9922, 16)
      ..cubicTo(14.4775, 16, 16.4922, 13.9853, 16.4922, 11.5)
      ..close();

    final frame = Path()
      ..moveTo(14.9922, 21.5)
      ..cubicTo(16.8545, 21.5, 17.7857, 21.5, 18.5313, 21.2286)
      ..cubicTo(19.7812, 20.7737, 20.7659, 19.789, 21.2208, 18.5391)
      ..cubicTo(21.4922, 17.7935, 21.4922, 16.8623, 21.4922, 15)
      ..moveTo(8.99219, 21.5)
      ..cubicTo(7.12987, 21.5, 6.19872, 21.5, 5.4531, 21.2286)
      ..cubicTo(4.20315, 20.7737, 3.21851, 19.789, 2.76357, 18.5391)
      ..cubicTo(2.49219, 17.7935, 2.49219, 16.8623, 2.49219, 15)
      ..moveTo(8.99219, 2.5)
      ..cubicTo(7.12987, 2.5, 6.19872, 2.5, 5.4531, 2.77138)
      ..cubicTo(4.20315, 3.22633, 3.21851, 4.21096, 2.76357, 5.46091)
      ..cubicTo(2.49219, 6.20653, 2.49219, 7.13769, 2.49219, 9)
      ..moveTo(14.9922, 2.5)
      ..cubicTo(16.8545, 2.5, 17.7857, 2.5, 18.5313, 2.77138)
      ..cubicTo(19.7812, 3.22633, 20.7659, 4.21096, 21.2208, 5.46091)
      ..cubicTo(21.4922, 6.20653, 21.4922, 7.13769, 21.4922, 9);

    canvas.drawPath(magnifier, stroke);
    canvas.drawPath(frame, stroke);
  }

  @override
  bool shouldRepaint(covariant _HugeScanSearchIconPainter oldDelegate) =>
      oldDelegate.color != color;
}
