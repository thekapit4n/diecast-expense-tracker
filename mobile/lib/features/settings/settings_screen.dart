import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/supabase.dart';
import '../auth/auth_providers.dart';
import '../notifications/notification_prefs.dart';
import '../notifications/notification_service.dart';
import '../notifications/reminder_scheduler.dart';
import '../notifications/reminder_sync.dart';
import 'theme_controller.dart';

/// Appearance, account and app info. Reached from the gear icon on Home.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    final email = ref.watch(userEmailProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          const _SectionHeader('Appearance'),
          RadioGroup<ThemeMode>(
            groupValue: mode,
            onChanged: (m) {
              if (m != null) ref.read(themeModeProvider.notifier).set(m);
            },
            child: const Column(
              children: [
                RadioListTile<ThemeMode>(
                  value: ThemeMode.system,
                  title: Text('System'),
                  subtitle: Text('Follow the device setting'),
                ),
                RadioListTile<ThemeMode>(
                  value: ThemeMode.light,
                  title: Text('Light'),
                ),
                RadioListTile<ThemeMode>(
                  value: ThemeMode.dark,
                  title: Text('Dark'),
                ),
              ],
            ),
          ),
          const Divider(height: 32),

          const _SectionHeader('Pre-order reminders'),
          const _ReminderSettings(),
          const Divider(height: 32),

          const _SectionHeader('Account'),
          ListTile(
            leading: const Icon(Icons.person_outline),
            title: Text(email ?? 'Not signed in'),
            subtitle: const Text('Signed in'),
          ),
          ListTile(
            leading: Icon(Icons.logout, color: Theme.of(context).colorScheme.error),
            title: Text('Sign out',
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
            onTap: () async {
              final navigator = Navigator.of(context);
              await supabase.auth.signOut();
              // The router redirect sends us to /login; pop the settings route
              // so it isn't left underneath.
              if (navigator.canPop()) navigator.pop();
            },
          ),
          const Divider(height: 32),

          const _SectionHeader('About'),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('ScaleVault'),
            subtitle: Text('Version 1.0.0'),
          ),
        ],
      ),
    );
  }
}

/// Master switch plus the three reminder categories.
///
/// Turning the master switch on is what triggers the iOS permission prompt —
/// deliberately here rather than at launch, so the ask has context.
class _ReminderSettings extends ConsumerWidget {
  const _ReminderSettings();

  static const _categoryLabels = {
    ReminderCategory.readiness: (
      'Ready to collect',
      'When an order is marked ready, or its ETA passes',
    ),
    ReminderCategory.deadlines: (
      'Pickup deadlines',
      'Three days before the deadline, and on the day',
    ),
    ReminderCategory.payments: (
      'Outstanding payments',
      'When a ready order still has a balance due',
    ),
  };

  Future<void> _toggleMaster(BuildContext context, WidgetRef ref, bool on) async {
    final messenger = ScaffoldMessenger.of(context);
    final prefsController = ref.read(notificationPrefsProvider.notifier);

    if (on) {
      final granted = await NotificationService.instance.requestPermission();
      if (!granted) {
        messenger.showSnackBar(const SnackBar(
          content: Text(
              'Notifications are turned off for ScaleVault. Enable them in '
              'iOS Settings > Notifications to get reminders.'),
        ));
        return;
      }
    }

    await prefsController.setEnabled(on);
    await ref.read(reminderSyncProvider).refresh();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prefs = ref.watch(notificationPrefsProvider);
    final theme = Theme.of(context);

    return Column(
      children: [
        SwitchListTile(
          value: prefs.enabled,
          onChanged: (v) => _toggleMaster(context, ref, v),
          title: const Text('Remind me about pre-orders'),
          subtitle: const Text('Scheduled on this device'),
        ),
        for (final entry in _categoryLabels.entries)
          SwitchListTile(
            value: prefs.categories.contains(entry.key),
            onChanged: prefs.enabled
                ? (v) async {
                    await ref
                        .read(notificationPrefsProvider.notifier)
                        .setCategory(entry.key, v);
                    await ref.read(reminderSyncProvider).refresh();
                  }
                : null,
            title: Text(entry.value.$1),
            subtitle: Text(entry.value.$2),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Text(
            'Reminders are scheduled on this device, so they only refresh when '
            'you open the app. A pre-order updated on the web is picked up the '
            'next time ScaleVault runs.',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.outline),
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Text(
        title.toUpperCase(),
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}
