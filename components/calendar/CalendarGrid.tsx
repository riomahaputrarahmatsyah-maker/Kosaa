import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { colors, glow } from "@/constants/theme";
import type { Schedule } from "@/types/models";
import { buildMonthGrid, dateKeysBetween, monthLabel, scheduleOverlapsMonth, weekdayLabels } from "@/utils/date";

interface CalendarGridProps {
  year: number;
  month: number;
  selected: string;
  schedules: Schedule[];
  onSelect: (key: string) => void;
  onChangeMonth: (delta: number) => void;
}

export function CalendarGrid({
  year,
  month,
  selected,
  schedules,
  onSelect,
  onChangeMonth,
}: CalendarGridProps) {
  const cells = buildMonthGrid(year, month);
  const weeks: (typeof cells)[] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  const schedulesByDate = new Map<string, Schedule[]>();
  for (const schedule of schedules) {
    for (const key of dateKeysBetween(schedule.date, schedule.end_date)) {
      const existing = schedulesByDate.get(key) ?? [];
      existing.push(schedule);
      schedulesByDate.set(key, existing);
    }
  }

  return (
    <View className="rounded-[26px] border border-subtle bg-[#0E0E0E] px-3 pb-4 pt-3">
      <View className="mb-3 flex-row items-center justify-between px-1">
        <Pressable
          onPress={() => onChangeMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="Bulan sebelumnya"
          className="h-9 w-9 items-center justify-center rounded-full border border-subtle bg-white/5"
        >
          <ChevronLeft size={17} color={colors.primary} />
        </Pressable>
        <View className="items-center">
          <Text className="font-inter-semibold text-[14px] text-primary">{monthLabel(year, month)}</Text>
          <Text className="mt-0.5 font-sans text-[9px] tracking-[1.5px] text-secondary">
            {schedules.filter((item) => scheduleOverlapsMonth(item, year, month)).length} JADWAL
          </Text>
        </View>
        <Pressable
          onPress={() => onChangeMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="Bulan berikutnya"
          className="h-9 w-9 items-center justify-center rounded-full border border-subtle bg-white/5"
        >
          <ChevronRight size={17} color={colors.primary} />
        </Pressable>
      </View>

      <View className="mb-1 flex-row">
        {weekdayLabels().map((label) => (
          <Text
            key={label}
            className="flex-1 text-center font-inter-medium text-[9px] tracking-wide text-secondary/70"
          >
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} className="flex-row">
          {week.map((cell) => {
            const isSelected = cell.key === selected;
            const daySchedules = schedulesByDate.get(cell.key) ?? [];
            return (
              <Pressable
                key={cell.key}
                onPress={() => onSelect(cell.key)}
                accessibilityRole="button"
                accessibilityLabel={"Pilih " + cell.key}
                className="flex-1 items-center pb-1.5 pt-1"
              >
                <View
                  className={
                    isSelected
                      ? "h-9 w-9 items-center justify-center rounded-full border border-mint bg-mint/15"
                      : cell.isToday
                        ? "h-9 w-9 items-center justify-center rounded-full border border-mint/30"
                        : "h-9 w-9 items-center justify-center rounded-full"
                  }
                  style={isSelected ? glow : undefined}
                >
                  <Text
                    className={
                      isSelected
                        ? "font-inter-bold text-[13px] text-primary"
                        : cell.inMonth
                          ? "font-inter-medium text-[13px] text-primary/80"
                          : "font-sans text-[13px] text-primary/20"
                    }
                  >
                    {cell.day}
                  </Text>
                </View>
                <View className="mt-0.5 h-1.5 flex-row items-center gap-0.5">
                  {daySchedules.slice(0, 3).map((item, index) => (
                    <View
                      key={item.id + index}
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: item.is_completed ? "rgba(16,185,129,0.9)" : "rgba(255,255,255,0.65)" }}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
