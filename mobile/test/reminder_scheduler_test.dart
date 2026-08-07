import 'package:diecast_mobile/data/models/po_item.dart';
import 'package:diecast_mobile/features/notifications/reminder_scheduler.dart';
import 'package:flutter_test/flutter_test.dart';

PoItem _item({
  String id = 'po-item-1',
  String? paymentStatus = 'paid',
  String? preOrderStatus,
  String? readyDate,
  String? pickupDeadline,
  String? collectedDate,
  String? poEta,
  String? shopName = 'Toy Shop',
}) {
  return PoItem(
    id: id,
    quantity: 1,
    pricePerUnit: 100,
    totalPrice: 100,
    paymentStatus: paymentStatus,
    preOrderStatus: preOrderStatus,
    amountPaid: 100,
    paymentDate: null,
    paymentMethod: null,
    variantStatus: null,
    packagingType: null,
    readyDate: readyDate,
    pickupDeadline: pickupDeadline,
    collectedDate: collectedDate,
    collectionId: 'c1',
    collectionName: 'Porsche 911 GT3',
    itemNo: 'MGT001',
    poOrderId: 'po1',
    poReference: 'REF',
    poChannel: null,
    poEta: poEta,
    poCloseDate: null,
    poOrderDate: null,
    poSourceLink: null,
    shopName: shopName,
  );
}

/// 7 Aug 2026, 08:00 — before the 09:00 fire hour, so "today at 9" is future.
final _now = DateTime(2026, 8, 7, 8);

Set<ReminderKind> _kinds(List<Reminder> rs) => rs.map((r) => r.kind).toSet();

void main() {
  group('skips', () {
    test('cancelled pre-orders produce nothing', () {
      final rs = buildReminders([
        _item(preOrderStatus: 'cancelled', readyDate: '2026-08-10'),
      ], _now);
      expect(rs, isEmpty);
    });

    test('collected pre-orders produce nothing', () {
      final rs = buildReminders([
        _item(readyDate: '2026-08-10', collectedDate: '2026-08-11'),
      ], _now);
      expect(rs, isEmpty);
    });

    test('an item with no dates at all produces nothing', () {
      expect(buildReminders([_item()], _now), isEmpty);
    });
  });

  group('ready to collect', () {
    test('fires at 09:00 on the ready date', () {
      final rs = buildReminders([_item(readyDate: '2026-08-10')], _now);

      expect(_kinds(rs), {ReminderKind.readyToCollect});
      expect(rs.single.fireAt, DateTime(2026, 8, 10, 9));
      expect(rs.single.body, contains('Toy Shop'));
    });

    test('an already-ready item is nudged at the next 09:00', () {
      final rs = buildReminders([_item(readyDate: '2026-08-01')], _now);
      expect(rs.single.fireAt, DateTime(2026, 8, 7, 9));
    });

    test('after 09:00 the nudge moves to tomorrow morning', () {
      final rs = buildReminders(
        [_item(readyDate: '2026-08-01')],
        DateTime(2026, 8, 7, 21),
      );
      expect(rs.single.fireAt, DateTime(2026, 8, 8, 9));
    });

    test('a long-stale ready date is dropped rather than nagged about', () {
      final rs = buildReminders([_item(readyDate: '2025-01-01')], _now);
      expect(rs, isEmpty);
    });
  });

  group('payment due', () {
    test('an unpaid ready item also gets a payment reminder, a day later', () {
      final rs = buildReminders([
        _item(paymentStatus: 'unpaid', readyDate: '2026-08-10'),
      ], _now);

      expect(_kinds(rs), {ReminderKind.readyToCollect, ReminderKind.paymentDue});
      final payment = rs.firstWhere((r) => r.kind == ReminderKind.paymentDue);
      expect(payment.fireAt, DateTime(2026, 8, 11, 9));
    });

    test('partial payment counts as outstanding', () {
      final rs = buildReminders([
        _item(paymentStatus: 'partial', readyDate: '2026-08-10'),
      ], _now);
      expect(_kinds(rs), contains(ReminderKind.paymentDue));
    });

    test('a fully paid ready item gets no payment reminder', () {
      final rs = buildReminders([
        _item(paymentStatus: 'paid', readyDate: '2026-08-10'),
      ], _now);
      expect(_kinds(rs), {ReminderKind.readyToCollect});
    });
  });

  group('deadlines', () {
    test('warns three days ahead and again on the day', () {
      final rs = buildReminders([
        _item(readyDate: '2026-08-10', pickupDeadline: '2026-08-20'),
      ], _now);

      final soon = rs.firstWhere((r) => r.kind == ReminderKind.deadlineSoon);
      final today = rs.firstWhere((r) => r.kind == ReminderKind.deadlineToday);
      expect(soon.fireAt, DateTime(2026, 8, 17, 9));
      expect(today.fireAt, DateTime(2026, 8, 20, 9));
    });

    test('deadlines apply even when the item is not ready yet', () {
      final rs = buildReminders([_item(pickupDeadline: '2026-08-20')], _now);
      expect(_kinds(rs), {ReminderKind.deadlineSoon, ReminderKind.deadlineToday});
    });
  });

  group('eta', () {
    test('chases the ETA while the item is not ready', () {
      final rs = buildReminders([_item(poEta: '2026-08-15')], _now);
      expect(_kinds(rs), {ReminderKind.etaReached});
      expect(rs.single.fireAt, DateTime(2026, 8, 15, 9));
    });

    test('is skipped once the item is marked ready', () {
      final rs = buildReminders([
        _item(readyDate: '2026-08-10', poEta: '2026-08-15'),
      ], _now);
      expect(_kinds(rs), {ReminderKind.readyToCollect});
    });
  });

  group('ids and ordering', () {
    test('ids are stable across rebuilds and fit a 32-bit signed int', () {
      final first = buildReminders([_item(readyDate: '2026-08-10')], _now).single;
      final second = buildReminders([_item(readyDate: '2026-08-10')], _now).single;

      expect(first.id, second.id);
      expect(first.id, greaterThanOrEqualTo(0));
      expect(first.id, lessThanOrEqualTo(0x7fffffff));
    });

    test('different items and kinds get different ids', () {
      final rs = buildReminders([
        _item(id: 'a', paymentStatus: 'unpaid', readyDate: '2026-08-10'),
        _item(id: 'b', paymentStatus: 'unpaid', readyDate: '2026-08-10'),
      ], _now);

      expect(rs.map((r) => r.id).toSet(), hasLength(rs.length));
    });

    test('results are ordered by fire time', () {
      final rs = buildReminders([
        _item(readyDate: '2026-08-10', pickupDeadline: '2026-08-20'),
      ], _now);

      final times = rs.map((r) => r.fireAt).toList();
      expect(times, orderedEquals([...times]..sort()));
    });
  });

  group('category filtering', () {
    test('only enabled categories are produced', () {
      final item = _item(
        paymentStatus: 'unpaid',
        readyDate: '2026-08-10',
        pickupDeadline: '2026-08-20',
      );

      expect(
        _kinds(buildReminders([item], _now, enabled: {ReminderCategory.deadlines})),
        {ReminderKind.deadlineSoon, ReminderKind.deadlineToday},
      );
      expect(
        _kinds(buildReminders([item], _now, enabled: {ReminderCategory.payments})),
        {ReminderKind.paymentDue},
      );
      expect(buildReminders([item], _now, enabled: const {}), isEmpty);
    });
  });
}
