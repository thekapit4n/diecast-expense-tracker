// Basic smoke test. The full app requires Supabase + .env initialisation,
// so feature tests live alongside their features. This just verifies the
// widget tree builds.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('MaterialApp builds', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: Text('ok'))),
    );
    expect(find.text('ok'), findsOneWidget);
  });
}
