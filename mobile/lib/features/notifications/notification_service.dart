import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import 'reminder_scheduler.dart';

/// Wraps flutter_local_notifications so the rest of the app only deals in
/// [Reminder]s.
///
/// These are *local* notifications computed on-device. They fire reliably once
/// scheduled, but they can only be rebuilt while the app is running — if a
/// pre-order changes on the web and the phone never opens the app, nothing
/// reschedules. Server-driven push would need an Edge Function plus APNs.
class NotificationService {
  NotificationService._();

  static final instance = NotificationService._();

  final _plugin = FlutterLocalNotificationsPlugin();
  bool _ready = false;

  static const _details = NotificationDetails(
    iOS: DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    ),
  );

  /// Prepares the plugin and the timezone database. Safe to call repeatedly.
  ///
  /// Does not prompt for permission — [requestPermission] does that, so the
  /// prompt appears when the user turns reminders on rather than at launch.
  Future<void> init() async {
    if (_ready) return;

    tz_data.initializeTimeZones();
    await _plugin.initialize(
      settings: const InitializationSettings(
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
    );
    _ready = true;
  }

  /// Shows the iOS permission prompt. Returns false if the user declined, or
  /// if permission was already denied at the OS level.
  Future<bool> requestPermission() async {
    await init();
    final ios = _plugin.resolvePlatformSpecificImplementation<
        IOSFlutterLocalNotificationsPlugin>();
    if (ios == null) return false;
    final granted =
        await ios.requestPermissions(alert: true, badge: true, sound: true);
    return granted ?? false;
  }

  /// Replaces every scheduled reminder with [reminders].
  ///
  /// Cancel-and-rebuild rather than diffing: reminder ids are derived from the
  /// pre-order id and kind, so re-scheduling the same reminder replaces it
  /// instead of stacking a duplicate, and anything no longer in the list (an
  /// item collected, cancelled, or rescheduled) disappears.
  Future<void> sync(List<Reminder> reminders) async {
    await init();
    await _plugin.cancelAll();

    for (final r in reminders) {
      try {
        await _plugin.zonedSchedule(
          id: r.id,
          title: r.title,
          body: r.body,
          scheduledDate: tz.TZDateTime.from(r.fireAt, tz.local),
          notificationDetails: _details,
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        );
      } catch (e) {
        // One bad reminder shouldn't stop the rest from being scheduled.
        debugPrint('Failed to schedule reminder ${r.kind.name}: $e');
      }
    }
  }

  /// Drops every scheduled reminder — used when the user turns reminders off.
  Future<void> cancelAll() async {
    await init();
    await _plugin.cancelAll();
  }

  /// What is currently queued. Handy for verifying without waiting on a clock.
  Future<List<PendingNotificationRequest>> pending() async {
    await init();
    return _plugin.pendingNotificationRequests();
  }
}
