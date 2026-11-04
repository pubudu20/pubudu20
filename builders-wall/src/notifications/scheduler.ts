/**
 * Applies the notification plan using expo-notifications (local only — no
 * push server, no internet). Called after every data change and on app open.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { planNotifications } from '../core/notificationPlan';
import type { GameState } from '../core/engine';
import type { AppData } from '../core/types';

export const CHANNEL_ID = 'builder-reminders';

let channelReady = false;

export async function ensureChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Habit reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#FFB000',
  });
  channelReady = true;
}

/** Shows the Android "Allow notifications?" prompt if needed. Returns true when allowed. */
export async function requestPermission(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

export async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Show notifications even while the app is open. */
export function configureForegroundHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let running: Promise<void> | null = null;
let pending: { data: AppData; game: GameState } | null = null;

/**
 * Cancels everything and schedules the fresh plan. Calls that arrive while a
 * reschedule is running are merged, so rapid ticking doesn't pile up work.
 */
export function rescheduleAll(data: AppData, game: GameState): Promise<void> {
  pending = { data, game };
  if (!running) {
    running = (async () => {
      while (pending) {
        const job = pending;
        pending = null;
        try {
          await applyPlan(job.data, job.game);
        } catch (e) {
          console.warn('Could not schedule notifications', e);
        }
      }
      running = null;
    })();
  }
  return running;
}

async function applyPlan(data: AppData, game: GameState) {
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await hasPermission())) return;
  const plan = planNotifications(data, game, new Date());
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: n.date,
        channelId: CHANNEL_ID,
      },
    });
  }
}
