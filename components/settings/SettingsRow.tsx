import { ChevronRight } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/theme";

interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  caption?: string;
  onPress: () => void;
  last?: boolean;
  tone?: "mint" | "danger";
}

export function SettingsRow({ icon: Icon, label, caption, onPress, last = false, tone = "mint" }: SettingsRowProps) {
  const accent = tone === "danger" ? colors.danger : colors.mint;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={last ? "flex-row items-center px-4 py-3.5" : "flex-row items-center border-b border-subtle px-4 py-3.5"}
      style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-xl border"
        style={{
          backgroundColor: tone === "danger" ? "rgba(248,113,113,0.10)" : "rgba(16,185,129,0.10)",
          borderColor: tone === "danger" ? "rgba(248,113,113,0.22)" : "rgba(16,185,129,0.22)",
        }}
      >
        <Icon size={16} color={accent} strokeWidth={1.8} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-inter-medium text-[13px] text-primary">{label}</Text>
        {caption ? (
          <Text className="mt-0.5 font-sans text-[10px] text-secondary">{caption}</Text>
        ) : null}
      </View>
      <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
    </Pressable>
  );
}
