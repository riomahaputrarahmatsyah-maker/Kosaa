import { Bell, BellOff, Clock, ShieldAlert } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Switch, Text, TextInput, View } from "react-native";

import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { colors, glow } from "@/constants/theme";
import { cancelReminder, getScheduledNotificationCount, scheduleDailyReminder, sendTestNotification } from "@/services/notifications";
import { getReminder, saveReminder, type ReminderSettings } from "@/services/settings/secureStore";
import { useAppStore } from "@/store/useAppStore";

const PRESETS = ["07:00", "12:00", "17:00", "20:00"];

function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export default function ReminderScreen() {
  const showNotice = useAppStore((state) => state.showNotice);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState("20:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getReminder()
      .then((value) => {
        if (!active) return;
        setSettings(value);
        setEnabled(value.enabled);
        setTime(String(value.hour).padStart(2, "0") + ":" + String(value.minute).padStart(2, "0"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    getScheduledNotificationCount().then((count) => {
      if (active) setScheduledCount(count);
    });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    const parsed = parseTime(time);
    if (!parsed) {
      setError("Format jam harus HH:mm, misal 20:00.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await cancelReminder(settings?.notificationId ?? null);
      let notificationId: string | null = null;
      if (enabled) {
        notificationId = await scheduleDailyReminder(parsed.hour, parsed.minute);
      }
      const next: ReminderSettings = {
        enabled,
        hour: parsed.hour,
        minute: parsed.minute,
        notificationId,
      };
      await saveReminder(next);
      setSettings(next);
      setScheduledCount(await getScheduledNotificationCount());
      showNotice(enabled ? "Pengingat harian aktif pukul " + time + "." : "Pengingat dimatikan.", "success");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal mengatur pengingat.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SettingsScaffold title="Pengingat" subtitle="Notifikasi harian lokal">
        <View className="items-center py-20">
          <ActivityIndicator color={colors.mint} />
        </View>
      </SettingsScaffold>
    );
  }

  return (
    <SettingsScaffold title="Pengingat" subtitle="Notifikasi harian lokal">
      <View className="rounded-[24px] border border-mint/20 bg-[#0B1F18] p-5" style={glow}>
        <View className="flex-row items-center">
          <View
            className="h-12 w-12 items-center justify-center rounded-full border border-mint/40 bg-[#071F17]"
            style={glow}
          >
            {enabled ? <Bell size={20} color={colors.mint} /> : <BellOff size={20} color={colors.secondary} />}
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-inter-bold text-[14px] text-primary">Pengingat harian</Text>
            <Text className="mt-0.5 font-sans text-[10px] leading-4 text-secondary">
              Satu dorongan kecil untuk menjaga Second Brain tetap hidup.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: "#27272A", true: "rgba(16,185,129,0.55)" }}
            thumbColor={enabled ? colors.mint : "#A1A1AA"}
            ios_backgroundColor="#27272A"
          />
        </View>
      </View>

      <Text className="mb-2 mt-6 font-inter-medium text-[9px] tracking-[2px] text-secondary">WAKTU</Text>
      <View className="rounded-[20px] border border-subtle bg-[#101010] p-4">
        <View className="flex-row items-center rounded-2xl border border-subtle bg-[#0A0A0A] px-3 py-2">
          <Clock size={15} color={colors.secondary} />
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="20:00"
            placeholderTextColor="#4A4A52"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            className="ml-2 flex-1 py-1.5 text-center font-inter-semibold text-[18px] tracking-widest text-primary"
            selectionColor={colors.mint}
          />
        </View>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const active = time === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => setTime(preset)}
                className={
                  active
                    ? "rounded-full border border-mint/40 bg-mint/10 px-3 py-1.5"
                    : "rounded-full border border-subtle bg-white/5 px-3 py-1.5"
                }
              >
                <Text
                  className={
                    active
                      ? "font-inter-semibold text-[10px] text-mint"
                      : "font-inter-medium text-[10px] text-secondary"
                  }
                >
                  {preset}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error && (
        <View className="mt-4 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3">
          <View className="flex-row items-start">
            <ShieldAlert size={15} color={colors.danger} />
            <Text className="ml-2 flex-1 font-sans text-[11px] leading-4 text-primary/80">{error}</Text>
          </View>
          <Pressable onPress={() => Linking.openSettings()} className="mt-2 self-start">
            <Text className="font-inter-semibold text-[10px] text-mint underline">Buka pengaturan perangkat</Text>
          </Pressable>
        </View>
      )}


      <Pressable
        onPress={async () => {
          setTesting(true);
          setError(null);
          try {
            await sendTestNotification();
            setScheduledCount(await getScheduledNotificationCount());
            showNotice("Tes notifikasi dijadwalkan 5 detik lagi.", "success");
          } catch (testError) {
            setError(testError instanceof Error ? testError.message : "Gagal mengirim tes notifikasi.");
          } finally {
            setTesting(false);
          }
        }}
        disabled={testing}
        className="mt-3 flex-row items-center justify-center rounded-2xl border border-mint/25 bg-mint/5 py-3.5"
        style={({ pressed }) => [{ opacity: pressed || testing ? 0.65 : 1 }]}
      >
        {testing ? (
          <ActivityIndicator size="small" color={colors.mint} />
        ) : (
          <Bell size={15} color={colors.mint} />
        )}
        <Text className="ml-2 font-inter-semibold text-[12px] text-mint">
          {testing ? "Menjadwalkan tes..." : "Kirim tes notifikasi (5 detik)"}
        </Text>
      </Pressable>

      <View className="mt-3 flex-row items-center rounded-2xl border border-subtle bg-[#0E0E0E] px-4 py-3">
        <Bell size={13} color={colors.mint} />
        <View className="ml-2 flex-1">
          <Text className="font-sans text-[10px] text-secondary">
            {scheduledCount} notifikasi terjadwal di perangkat.
          </Text>
          <Text className="mt-0.5 font-sans text-[9px] leading-4 text-secondary/60">
            {enabled
              ? "Pengingat harian berbunyi pada pukul " + time + " berikutnya. Gunakan tes untuk memastikan izin."
              : "Aktifkan toggle lalu simpan untuk menjadwalkan pengingat."}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={save}
        disabled={saving}
        className="mt-5 items-center justify-center rounded-2xl bg-mint py-4"
        style={[glow, { opacity: saving ? 0.7 : 1 }]}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#04140E" />
        ) : (
          <Text className="font-inter-bold text-[13px] text-[#04140E]">Simpan pengingat</Text>
        )}
      </Pressable>

      <View className="mt-4 flex-row items-start rounded-2xl border border-subtle bg-[#0E0E0E] px-4 py-3">
        <Clock size={13} color={colors.secondary} />
        <Text className="ml-2 flex-1 font-sans text-[10px] leading-4 text-secondary">
          Notifikasi dijadwalkan langsung oleh perangkat. Tidak ada server yang mengingatkanmu, dan tidak ada data
          yang dikirim.
        </Text>
      </View>
    </SettingsScaffold>
  );
}