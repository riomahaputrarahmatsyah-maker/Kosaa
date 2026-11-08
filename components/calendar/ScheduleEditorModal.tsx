import { Clock, Trash2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, glow } from "@/constants/theme";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { GlowIconButton } from "@/components/ui/GlowIconButton";
import type { Schedule } from "@/types/models";
import { addDays, dateRangeLabel, isDateKey, isTimeValue, shortDateLabel, todayKey, toDateKey } from "@/utils/date";

interface ScheduleEditorModalProps {
  visible: boolean;
  schedule: Schedule | null;
  defaultDate: string;
  onClose: () => void;
  onSave: (values: {
    title: string;
    date: string;
    end_date: string;
    start_time: string;
    end_time: string;
  }) => Promise<void>;
  onDelete?: () => void;
}

const TIME_PRESETS = ["08:00", "10:00", "13:00", "16:00", "19:00"];

function tomorrowKey(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toDateKey(date);
}

export function ScheduleEditorModal({
  visible,
  schedule,
  defaultDate,
  onClose,
  onSave,
  onDelete,
}: ScheduleEditorModalProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(schedule?.title ?? "");
    setDate(schedule?.date ?? defaultDate);
    setEndDate(schedule?.end_date ?? "");
    setStart(schedule?.start_time ?? "");
    setEnd(schedule?.end_time ?? "");
    setError(null);
    setSaving(false);
  }, [visible, schedule, defaultDate]);

  const applyPreset = (value: string) => {
    setStart(value);
    const [hour, minute] = value.split(":").map(Number);
    const endHour = Math.min(23, hour + 1);
    setEnd(String(endHour).padStart(2, "0") + ":" + String(minute).padStart(2, "0"));
  };

  const save = async () => {
    if (!title.trim()) {
      setError("Nama kegiatan wajib diisi.");
      return;
    }
    if (!isDateKey(date)) {
      setError("Tanggal harus berformat YYYY-MM-DD.");
      return;
    }
    if (endDate && !isDateKey(endDate)) {
      setError("Tanggal selesai harus berformat YYYY-MM-DD.");
      return;
    }
    if (endDate && endDate < date) {
      setError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    if (start && !isTimeValue(start)) {
      setError("Jam mulai harus berformat HH:mm.");
      return;
    }
    if (end && !isTimeValue(end)) {
      setError("Jam selesai harus berformat HH:mm.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), date, end_date: endDate, start_time: start, end_time: end });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan jadwal.");
    } finally {
      setSaving(false);
    }
  };

  const rangeLabel =
    isDateKey(date) && (!endDate || !isDateKey(endDate))
      ? shortDateLabel(date)
      : isDateKey(date) && isDateKey(endDate)
        ? dateRangeLabel(date, endDate)
        : "Tanggal belum valid";

  // Lift the sheet above the keyboard and let the field list shrink so the
  // Simpan/Batal row stays reachable while typing.
  const sheetMaxHeight =
    keyboard.layoutHeight > 0
      ? Math.max(
          260,
          Math.min(
            Math.round(keyboard.layoutHeight * 0.92),
            keyboard.layoutHeight - keyboard.bottomInset - 8,
          ),
        )
      : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end bg-black/65" onLayout={keyboard.onLayout}>
        <View
          className="rounded-t-[30px] border-t border-subtle bg-[#111111] px-5 pt-3"
          style={{
            maxHeight: sheetMaxHeight,
            marginBottom: keyboard.bottomInset,
            paddingBottom: keyboard.keyboardVisible ? 14 : Math.max(insets.bottom, 18),
          }}
        >
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-white/15" />
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-inter-bold text-[18px] text-primary">
                {schedule ? "Edit jadwal" : "Jadwal baru"}
              </Text>
              <Text numberOfLines={1} className="mt-0.5 font-sans text-[11px] text-secondary">
                {rangeLabel}
              </Text>
            </View>
            <GlowIconButton icon={X} onPress={onClose} accessibilityLabel="Tutup" size={36} iconSize={16} />
          </View>

          <ScrollView
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text className="mb-1.5 font-inter-medium text-[11px] tracking-wide text-secondary">KEGIATAN</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Misal: Review desain Kosaa"
              placeholderTextColor="#5A5A61"
              className="mb-4 rounded-2xl border border-subtle bg-[#0B0B0B] px-4 py-3 font-inter-medium text-[14px] text-primary"
              selectionColor={colors.mint}
              maxLength={140}
            />

            <Text className="mb-1.5 font-inter-medium text-[11px] tracking-wide text-secondary">TANGGAL MULAI</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#5A5A61"
              autoCapitalize="none"
              className="rounded-2xl border border-subtle bg-[#0B0B0B] px-4 py-3 font-sans text-[13px] text-primary"
              selectionColor={colors.mint}
              maxLength={10}
            />
            <View className="mb-4 mt-2 flex-row flex-wrap gap-2">
              <Pressable onPress={() => setDate(todayKey())} className="rounded-full border border-subtle bg-white/5 px-3 py-1.5">
                <Text className="font-inter-medium text-[10px] text-secondary">Hari ini</Text>
              </Pressable>
              <Pressable onPress={() => setDate(tomorrowKey())} className="rounded-full border border-subtle bg-white/5 px-3 py-1.5">
                <Text className="font-inter-medium text-[10px] text-secondary">Besok</Text>
              </Pressable>
            </View>

            <Text className="mb-1.5 font-inter-medium text-[11px] tracking-wide text-secondary">
              TANGGAL SELESAI (OPSIONAL)
            </Text>
            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              placeholder="Kosongkan jika satu hari"
              placeholderTextColor="#5A5A61"
              autoCapitalize="none"
              className="rounded-2xl border border-subtle bg-[#0B0B0B] px-4 py-3 font-sans text-[13px] text-primary"
              selectionColor={colors.mint}
              maxLength={10}
            />
            <View className="mb-4 mt-2 flex-row flex-wrap gap-2">
              <Pressable onPress={() => setEndDate("")} className="rounded-full border border-subtle bg-white/5 px-3 py-1.5">
                <Text className="font-inter-medium text-[10px] text-secondary">Satu hari</Text>
              </Pressable>
              <Pressable
                onPress={() => setEndDate(isDateKey(date) ? addDays(date, 1) : "")}
                className="rounded-full border border-subtle bg-white/5 px-3 py-1.5"
              >
                <Text className="font-inter-medium text-[10px] text-secondary">+1 hari</Text>
              </Pressable>
              <Pressable
                onPress={() => setEndDate(isDateKey(date) ? addDays(date, 6) : "")}
                className="rounded-full border border-subtle bg-white/5 px-3 py-1.5"
              >
                <Text className="font-inter-medium text-[10px] text-secondary">7 hari</Text>
              </Pressable>
            </View>

            <View className="mb-1.5 flex-row items-center">
              <Text className="font-inter-medium text-[11px] tracking-wide text-secondary">WAKTU</Text>
              <Clock size={11} color={colors.secondary} style={{ marginLeft: 6 }} />
            </View>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={start}
                onChangeText={setStart}
                placeholder="09:00"
                placeholderTextColor="#5A5A61"
                keyboardType="numbers-and-punctuation"
                className="flex-1 rounded-2xl border border-subtle bg-[#0B0B0B] px-4 py-3 text-center font-sans text-[14px] text-primary"
                selectionColor={colors.mint}
                maxLength={5}
              />
              <Text className="font-sans text-[12px] text-secondary">sampai</Text>
              <TextInput
                value={end}
                onChangeText={setEnd}
                placeholder="10:00"
                placeholderTextColor="#5A5A61"
                keyboardType="numbers-and-punctuation"
                className="flex-1 rounded-2xl border border-subtle bg-[#0B0B0B] px-4 py-3 text-center font-sans text-[14px] text-primary"
                selectionColor={colors.mint}
                maxLength={5}
              />
            </View>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {TIME_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => applyPreset(preset)}
                  className={
                    start === preset
                      ? "rounded-full border border-mint/40 bg-mint/10 px-3 py-1.5"
                      : "rounded-full border border-subtle bg-white/5 px-3 py-1.5"
                  }
                >
                  <Text
                    className={
                      start === preset
                        ? "font-inter-semibold text-[10px] text-mint"
                        : "font-inter-medium text-[10px] text-secondary"
                    }
                  >
                    {preset}
                  </Text>
                </Pressable>
              ))}
            </View>

            {error && <Text className="mt-3 font-sans text-[11px] text-danger">{error}</Text>}
          </ScrollView>

          <View className="mt-4 flex-row gap-2">
            {schedule && onDelete && (
              <Pressable
                onPress={onDelete}
                accessibilityLabel="Hapus jadwal"
                className="h-[46px] w-[46px] items-center justify-center rounded-2xl border border-danger/30 bg-danger/10"
              >
                <Trash2 size={17} color={colors.danger} />
              </Pressable>
            )}
            <Pressable
              onPress={onClose}
              className="flex-1 items-center justify-center rounded-2xl border border-subtle bg-[#1A1A1A] py-3.5"
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text className="font-inter-medium text-[13px] text-secondary">Batal</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={saving}
              className="flex-1 items-center justify-center rounded-2xl bg-mint py-3.5"
              style={[glow, { opacity: saving ? 0.7 : 1 }]}
            >
              <Text className="font-inter-bold text-[13px] text-[#04140E]">
                {saving ? "Menyimpan..." : "Simpan"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}