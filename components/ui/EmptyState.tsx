import type { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

import { colors, glow } from "@/constants/theme";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, compact = false }: EmptyStateProps) {
  return (
    <View className={compact ? "items-center px-6 py-8" : "flex-1 items-center justify-center px-8"}>
      <View
        className="h-16 w-16 items-center justify-center rounded-full border border-mint/30 bg-mint/5"
        style={glow}
      >
        <Icon size={26} color={colors.mint} strokeWidth={1.7} />
      </View>
      <Text className="mt-5 text-center font-inter-semibold text-base text-primary">{title}</Text>
      <Text className="mt-2 max-w-[280px] text-center font-sans text-[13px] leading-5 text-secondary">
        {description}
      </Text>
    </View>
  );
}
