import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/supabase.dart';
import '../preorders/preorder_providers.dart';
import 'notification_prefs.dart';
import 'notification_service.dart';
import 'reminder_scheduler.dart';

/// Recomputes and reschedules every pre-order reminder.
///
/// Called on app resume, after a pre-order changes, and when the notification
/// settings change. Because reminder ids are deterministic, running this more
/// often than strictly necessary is harmless.
class ReminderSync {
  ReminderSync(this._ref);

  final Ref _ref;

  Future<void> refresh() async {
    final prefs = _ref.read(notificationPrefsProvider);

    // Nothing to schedule when reminders are off, every category is off, or
    // there's no signed-in user whose pre-orders we could read.
    if (prefs.activeCategories.isEmpty || supabase.auth.currentSession == null) {
      await NotificationService.instance.cancelAll();
      return;
    }

    try {
      final items = await _ref.read(purchaseRepositoryProvider).fetchPoItems();
      final reminders = buildReminders(
        items,
        DateTime.now(),
        enabled: prefs.activeCategories,
      );
      await NotificationService.instance.sync(reminders);
    } catch (e) {
      // Offline or a failed fetch: keep whatever is already scheduled rather
      // than wiping the user's reminders over a transient error.
      debugPrint('Reminder sync skipped: $e');
    }
  }
}

final reminderSyncProvider = Provider<ReminderSync>(ReminderSync.new);

/// Re-syncs reminders whenever the app comes back to the foreground, so a
/// pre-order updated on the web is picked up next time the phone is opened.
class ReminderSyncScope extends ConsumerStatefulWidget {
  const ReminderSyncScope({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<ReminderSyncScope> createState() => _ReminderSyncScopeState();
}

class _ReminderSyncScopeState extends ConsumerState<ReminderSyncScope>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(reminderSyncProvider).refresh();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(reminderSyncProvider).refresh();
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
