import { CalendarDays, Plus, Sparkles } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { ScheduleCard } from "@/components/calendar/ScheduleCard";
import { ScheduleEditorModal } from "@/components/calendar/ScheduleEditorModal";
import { GlowIconButton } from "@/components/ui/GlowIconButton";
import { colors, glow } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";
import type { Schedule } from "@/types/models";
import {
  buildMonthGrid,
  fromDateKey,
  scheduleCoversDate,
  scheduleOverlapsMonth,
  shortDateLabel,
  shiftMonth,
  todayKey,
  toDateKey,
} from "@/utils/date";

export default function CalendarScreen() {
  const schedules = useAppStore((state) => state.schedules);
  const createSchedule = useAppStore((state) => state.createSchedule);
  const updateSchedule = useAppStore((state) => state.updateSchedule);
  const toggleSchedule = useAppStore((state) => state.toggleSchedule);
  const deleteSchedule = useAppStore((state) => state.deleteSchedule);
  const focusDate = useAppStore((state) => state.focusDate);
  const consumeFocusDate = useAppStore((state) => state.consumeFocusDate);
  const pending = useAppStore((state) => state.pending);

  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(todayKey());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!focusDate) return;
      setSelected(focusDate);
      const date = fromDateKey(focusDate);
      setCursor({ year: date.getFullYear(), month: date.getMonth() });
      consumeFocusDate();
    }, [consumeFocusDate, focusDate]),
  );

  const monthSchedules = schedules.filter((schedule) =>
    scheduleOverlapsMonth(schedule, cursor.year, cursor.month),
  );
  const daySchedules = schedules
    .filter((schedule) => scheduleCoversDate(schedule, selected))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const changeMonth = (delta: number) => {
    const next = shiftMonth(cursor.year, cursor.month, delta);
    setCursor(next);
    const current = fromDateKey(selected);
    if (current.getFullYear() !== next.year || current.getMonth() !== next.month) {
      setSelected(toDateKey(new Date(next.year, next.month, 1, 12)));
    }
  };

  const selectDay = (key: string) => {
    setSelected(key);
    const date = fromDateKey(key);
    if (date.getFullYear() !== cursor.year || date.getMonth() !== cursor.month) {
      setCursor({ year: date.getFullYear(), month: date.getMonth() });
    }
  };

  const goToday = () => {
    const today = new Date();
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelected(todayKey());
  };

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (schedule: Schedule) => {
    setEditing(schedule);
    setEditorOpen(true);
  };

  const save = async (values: {
    title: string;
    date: string;
    end_date: string;
    start_time: string;
    end_time: string;
  }) => {
    if (editing) {
      await updateSchedule({ ...editing, ...values });
    } else {
      await createSchedule(values);
    }
    setEditorOpen(false);
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!editing) return;
    const target = editing;
    Alert.alert("Hapus jadwal?", '"' + target.title + '" akan dihapus dari kalender.', [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSchedule(target.id);
            setEditorOpen(false);
            setEditing(null);
          } catch (error) {
            Alert.alert("Gagal menghapus", error instanceof Error ? error.message : "Coba lagi.");
          }
        },
      },
    ]);
  };

  const incomplete = daySchedules.filter((schedule) => schedule.is_completed === 0).length;
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const daysInMonth = buildMonthGrid(cursor.year, cursor.month).filter((cell) => cell.inMonth).length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-5 pb-3 pt-2">
        <View className="flex-1">
          <Text className="font-inter-bold text-[22px] tracking-tight text-primary">Kalender</Text>
          <Text className="mt-0.5 font-sans text-[11px] text-secondary">
            {monthSchedules.length} jadwal · {incomplete} belum selesai di tanggal ini
          </Text>
        </View>
        {!isCurrentMonth && (
          <Pressable
            onPress={goToday}
            className="mr-2 rounded-full border border-subtle bg-white/5 px-3 py-1.5"
            accessibilityRole="button"
          >
            <Text className="font-inter-medium text-[10px] text-secondary">Hari ini</Text>
          </Pressable>
        )}
        <GlowIconButton
          icon={Plus}
          onPress={openCreate}
          accessibilityLabel="Tambah jadwal"
          active
          glowEffect
        />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 190 }}
        showsVerticalScrollIndicator={false}
      >
        {pending && pending.changedScreens.includes("calendar") && (
          <View className="mb-3 flex-row items-center rounded-2xl border border-mint/25 bg-mint/5 px-3 py-2">
            <Sparkles size={13} color={colors.mint} />
            <Text className="ml-2 flex-1 font-inter-semibold text-[10px] text-primary">
              Pratinjau AI · {pending.changedScheduleIds.length} jadwal berubah
            </Text>
            <Text className="font-sans text-[9px] text-mint">periksa kartu bertanda AI</Text>
          </View>
        )}

        <CalendarGrid
          year={cursor.year}
          month={cursor.month}
          selected={selected}
          schedules={schedules}
          onSelect={selectDay}
          onChangeMonth={changeMonth}
        />

        <View className="mt-5 flex-row items-end justify-between px-1">
          <View>
            <Text className="font-inter-bold text-[16px] text-primary">Tugas</Text>
            <Text className="mt-0.5 font-sans text-[11px] text-secondary">
              {shortDateLabel(selected)}
            </Text>
          </View>
          <Pressable
            onPress={openCreate}
            className="flex-row items-center rounded-full border border-mint/25 bg-mint/10 px-3 py-1.5"
            accessibilityRole="button"
          >
            <Plus size={12} color={colors.mint} />
            <Text className="ml-1 font-inter-semibold text-[10px] text-mint">Tambah</Text>
          </Pressable>
        </View>

        <View className="mt-3">
          {daySchedules.length === 0 ? (
            <View className="items-center rounded-[22px] border border-dashed border-white/15 bg-white/[0.02] px-6 py-9">
              <View
                className="h-12 w-12 items-center justify-center rounded-full border border-mint/25 bg-mint/5"
                style={glow}
              >
                <CalendarDays size={20} color={colors.mint} />
              </View>
              <Text className="mt-3 font-inter-semibold text-[13px] text-primary">Tanggal ini masih lapang</Text>
              <Text className="mt-1 max-w-[250px] text-center font-sans text-[11px] leading-4 text-secondary">
                Tambahkan satu kegiatan kecil, atau minta Kosaa menjadwalkan untukmu.
              </Text>
              <Pressable onPress={openCreate} className="mt-3 rounded-full bg-mint px-4 py-2">
                <Text className="font-inter-bold text-[11px] text-[#04140E]">Tambah jadwal</Text>
              </Pressable>
            </View>
          ) : (
            daySchedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                preview={Boolean(pending?.changedScheduleIds.includes(schedule.id))}
                onToggle={async () => {
                  try {
                    await toggleSchedule(schedule.id);
                  } catch (error) {
                    Alert.alert("Gagal memperbarui", error instanceof Error ? error.message : "Coba lagi.");
                  }
                }}
                onEdit={() => openEdit(schedule)}
              />
            ))
          )}
        </View>

        <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-subtle bg-[#0E0E0E] px-4 py-3">
          <View>
            <Text className="font-sans text-[9px] tracking-[1.5px] text-secondary">BULAN INI</Text>
            <Text className="mt-0.5 font-inter-semibold text-[12px] text-primary">
              {formattedRange(cursor.year, cursor.month, daysInMonth)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-inter-bold text-[18px] text-mint">{monthSchedules.length}</Text>
            <Text className="font-sans text-[9px] text-secondary">total jadwal</Text>
          </View>
        </View>
      </ScrollView>

      <ScheduleEditorModal
        visible={editorOpen}
        schedule={editing}
        defaultDate={selected}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={save}
        onDelete={editing ? confirmDelete : undefined}
      />
    </SafeAreaView>
  );
}

function formattedRange(year: number, month: number, daysInMonth: number): string {
  const start = new Date(year, month, 1, 12);
  const end = new Date(year, month, daysInMonth, 12);
  return start.getDate() + " – " + end.getDate() + " " + start.toLocaleDateString("id-ID", { month: "long" });
}