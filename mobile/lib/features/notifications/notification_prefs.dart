import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../settings/settings_store.dart';
import 'reminder_scheduler.dart';

const _enabledKey = 'reminders_enabled';
String _categoryKey(ReminderCategory c) => 'reminders_${c.name}';

/// Which reminders the user wants. The master switch gates everything; the
/// per-category switches default to on so enabling reminders Just Works.
class NotificationPrefs {
  const NotificationPrefs({required this.enabled, required this.categories});

  final bool enabled;
  final Set<ReminderCategory> categories;

  /// The categories actually in effect — empty when the master switch is off.
  Set<ReminderCategory> get activeCategories => enabled ? categories : const {};

  NotificationPrefs copyWith({bool? enabled, Set<ReminderCategory>? categories}) =>
      NotificationPrefs(
        enabled: enabled ?? this.enabled,
        categories: categories ?? this.categories,
      );
}

class NotificationPrefsController extends Notifier<NotificationPrefs> {
  @override
  NotificationPrefs build() {
    final prefs = ref.read(sharedPreferencesProvider);
    return NotificationPrefs(
      enabled: prefs.getBool(_enabledKey) ?? false,
      categories: {
        for (final c in ReminderCategory.values)
          if (prefs.getBool(_categoryKey(c)) ?? true) c,
      },
    );
  }

  Future<void> setEnabled(bool value) async {
    state = state.copyWith(enabled: value);
    await ref.read(sharedPreferencesProvider).setBool(_enabledKey, value);
  }

  Future<void> setCategory(ReminderCategory category, bool value) async {
    final next = {...state.categories};
    value ? next.add(category) : next.remove(category);
    state = state.copyWith(categories: next);
    await ref.read(sharedPreferencesProvider).setBool(_categoryKey(category), value);
  }
}

final notificationPrefsProvider =
    NotifierProvider<NotificationPrefsController, NotificationPrefs>(
        NotificationPrefsController.new);
