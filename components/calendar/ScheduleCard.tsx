import { Check, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { colors, glow, glowStrong } from "@/constants/theme";
import type { Schedule } from "@/types/models";
import { dateRangeLabel, timeRange } from "@/utils/date";

interface ScheduleCardProps {
  schedule: Schedule;
  preview?: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

export function ScheduleCard({ schedule, preview = false, onToggle, onEdit }: ScheduleCardProps) {
  const completed = schedule.is_completed === 1;

  return (
    <View
      className="mb-2.5 flex-row items-center rounded-2xl border px-3.5 py-3"
      style={[
        {
          backgroundColor: "#0F3D2E",
          borderColor: preview ? "rgba(16,185,129,0.85)" : "rgba(255,255,255,0.10)",
        },
        preview && glowStrong,
      ]}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={"Tandai " + schedule.title}
        className={
          completed
            ? "h-6 w-6 items-center justify-center rounded-lg bg-mint"
            : "h-6 w-6 items-center justify-center rounded-lg border border-white/25 bg-black/20"
        }
        style={completed ? glow : undefined}
      >
        {completed && <Check size={13} color="#04140E" strokeWidth={3} />}
      </Pressable>

      <Pressable onPress={onEdit} className="ml-3 flex-1" accessibilityRole="button">
        <View className="flex-row items-center">
          <Text
            numberOfLines={1}
            className={
              completed
                ? "flex-1 font-inter-medium text-[13px] text-primary/45 line-through"
                : "flex-1 font-inter-medium text-[13px] text-primary"
            }
          >
            {schedule.title}
          </Text>
          {preview && (
            <View className="ml-2 rounded-full bg-mint px-1.5 py-0.5">
              <Text className="font-inter-bold text-[7px] text-[#04140E]">AI</Text>
            </View>
          )}
        </View>
        <Text className="mt-1 font-sans text-[10px] text-white/50">
          {timeRange(schedule.start_time, schedule.end_time)} · {dateRangeLabel(schedule.date, schedule.end_date)}
        </Text>
      </Pressable>

      <Pressable onPress={onEdit} hitSlop={8} accessibilityLabel={"Edit " + schedule.title}>
        <ChevronRight size={16} color="rgba(255,255,255,0.45)" />
      </Pressable>
    </View>
  );
}
