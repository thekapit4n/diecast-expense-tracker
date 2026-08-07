import '../../core/format.dart';
import '../../data/models/po_item.dart';

/// What a reminder is about. Each kind fires at most once per pre-order line.
enum ReminderKind {
  readyToCollect,
  deadlineSoon,
  deadlineToday,
  etaReached,
  paymentDue,
}

/// User-facing grouping, so Settings can offer three switches instead of five.
enum ReminderCategory { readiness, deadlines, payments }

extension ReminderKindCategory on ReminderKind {
  ReminderCategory get category => switch (this) {
        ReminderKind.readyToCollect => ReminderCategory.readiness,
        ReminderKind.etaReached => ReminderCategory.readiness,
        ReminderKind.deadlineSoon => ReminderCategory.deadlines,
        ReminderKind.deadlineToday => ReminderCategory.deadlines,
        ReminderKind.paymentDue => ReminderCategory.payments,
      };
}

/// A single notification to schedule.
class Reminder {
  const Reminder({
    required this.itemId,
    required this.kind,
    required this.fireAt,
    required this.title,
    required this.body,
  });

  final String itemId;
  final ReminderKind kind;
  final DateTime fireAt;
  final String title;
  final String body;

  /// Stable across rebuilds so re-syncing replaces a reminder rather than
  /// stacking a duplicate next to it. Masked to 31 bits because the platform
  /// notification id is a signed 32-bit int.
  int get id => Object.hash(itemId, kind.index) & 0x7fffffff;

  @override
  bool operator ==(Object other) =>
      other is Reminder &&
      other.itemId == itemId &&
      other.kind == kind &&
      other.fireAt == fireAt;

  @override
  int get hashCode => Object.hash(itemId, kind, fireAt);

  @override
  String toString() => 'Reminder($itemId, ${kind.name}, $fireAt)';
}

/// Reminders fire mid-morning rather than at midnight.
const _fireHour = 9;

/// How long after its date a missed reminder is still worth surfacing. Past
/// this, the pre-order has been sitting long enough that a nudge is noise.
const _staleAfter = Duration(days: 90);

/// How far ahead of the pickup deadline the first warning goes out.
const _deadlineWarningLead = Duration(days: 3);

/// Builds the full set of reminders for [items].
///
/// Pure so it can be unit-tested: [now] is injected, and nothing here touches
/// the notification plugin. Only [enabled] categories are produced.
List<Reminder> buildReminders(
  List<PoItem> items,
  DateTime now, {
  Set<ReminderCategory> enabled = const {
    ReminderCategory.readiness,
    ReminderCategory.deadlines,
    ReminderCategory.payments,
  },
}) {
  final out = <Reminder>[];

  for (final item in items) {
    // Nothing to chase once it's cancelled or in your hands.
    if (item.preOrderStatus == 'cancelled') continue;
    if (item.collectedDate != null) continue;

    final name = item.collectionName.isEmpty ? 'A pre-order' : item.collectionName;
    final shop = item.shopName;
    final ready = parseDbDate(item.readyDate);
    final deadline = parseDbDate(item.pickupDeadline);
    final eta = parseDbDate(item.poEta);
    final unpaid = item.paymentStatus == 'unpaid' || item.paymentStatus == 'partial';

    void add(ReminderKind kind, DateTime day, String title, String body) {
      if (!enabled.contains(kind.category)) return;
      final at = _fireAt(day, now);
      if (at == null) return;
      out.add(Reminder(
        itemId: item.id,
        kind: kind,
        fireAt: at,
        title: title,
        body: body,
      ));
    }

    if (ready != null) {
      add(
        ReminderKind.readyToCollect,
        ready,
        'Ready to collect',
        shop == null ? name : '$name is waiting at $shop',
      );

      if (unpaid) {
        // A day after it's ready, so it doesn't land on top of the collect
        // reminder.
        add(
          ReminderKind.paymentDue,
          ready.add(const Duration(days: 1)),
          'Payment outstanding',
          '$name is ready but not fully paid',
        );
      }
    } else if (eta != null) {
      // Only chase the ETA while the item still hasn't been marked ready.
      add(
        ReminderKind.etaReached,
        eta,
        'Pre-order ETA reached',
        '$name was due around ${formatIsoDate(item.poEta)}',
      );
    }

    if (deadline != null) {
      add(
        ReminderKind.deadlineSoon,
        deadline.subtract(_deadlineWarningLead),
        'Pickup deadline approaching',
        '$name must be collected by ${formatIsoDate(item.pickupDeadline)}',
      );
      add(
        ReminderKind.deadlineToday,
        deadline,
        'Pickup deadline today',
        'Last day to collect $name',
      );
    }
  }

  out.sort((a, b) => a.fireAt.compareTo(b.fireAt));
  return out;
}

/// When a reminder for [day] should actually fire.
///
/// Normally [_fireHour] on the day itself. If that moment has passed the
/// reminder is moved to the next upcoming [_fireHour] so an already-overdue
/// pre-order still gets one nudge — unless it is more than [_staleAfter] old,
/// in which case it is dropped.
DateTime? _fireAt(DateTime day, DateTime now) {
  final onTheDay = DateTime(day.year, day.month, day.day, _fireHour);
  if (onTheDay.isAfter(now)) return onTheDay;

  if (now.difference(onTheDay) > _staleAfter) return null;

  final thisMorning = DateTime(now.year, now.month, now.day, _fireHour);
  return thisMorning.isAfter(now)
      ? thisMorning
      : thisMorning.add(const Duration(days: 1));
}
