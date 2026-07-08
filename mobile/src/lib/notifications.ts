import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ANDROID_CHANNEL = 'workout-reminders';

// Schedule (or cancel) a daily 6pm workout reminder. Returns whether a reminder
// is now active. Local notifications aren't supported on web, and require the
// user to grant permission on native — both handled gracefully.
export async function setWorkoutReminder(enabled: boolean): Promise<boolean> {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch { /* ignore */ }
  if (!enabled) return false;
  if (Platform.OS === 'web') return false;

  const existing = await Notifications.getPermissionsAsync();
  const granted = existing.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Workout reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: { title: 'Time to train 💪', body: "You've got a session waiting — keep the streak alive." },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 18,
      minute: 0,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
    } as any,
  });
  return true;
}
