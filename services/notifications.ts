import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let configured = false;

export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(): Promise<string | undefined> {
  if (Platform.OS !== "android") return undefined;
  const channelId = "kosaa-reminders";
  try {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: "Pengingat Kosaa",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    return channelId;
  } catch {
    // Some Expo Go/Android combinations crash on channel creation. The
    // notification builder will fall back to its own default channel.
    return undefined;
  }
}

async function ensurePermission(): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return;
  const requested = await Notifications.requestPermissionsAsync();
  if (!requested.granted) {
    throw new Error("Izin notifikasi ditolak. Aktifkan lewat pengaturan perangkat.");
  }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<string> {
  configureNotifications();
  await ensurePermission();
  const channelId = await ensureChannel();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Kosaa",
      body: "Luangkan lima menit untuk merapikan Second Brain-mu hari ini.",
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(channelId ? { channelId } : {}),
    },
  });
}

export async function cancelReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // The notification may already have been removed by the OS.
  }
}
export async function sendTestNotification(): Promise<string> {
  configureNotifications();
  await ensurePermission();
  const channelId = await ensureChannel();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Kosaa",
      body: "Notifikasi tes berhasil. Pengingat harian siap dipakai.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
      ...(channelId ? { channelId } : {}),
    },
  });
}

export async function getScheduledNotificationCount(): Promise<number> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch {
    return 0;
  }
}