import type { LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";

import { colors, glow } from "@/constants/theme";

interface GlowIconButtonProps {
  icon: LucideIcon;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  active?: boolean;
  glowEffect?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Circular icon button used in every header.
 *
 * The style is a plain array on purpose: NativeWind's cssInterop drops
 * function-valued `style` props, so `style={({ pressed }) => ...}` used to be
 * discarded entirely and the button lost its 44px box, border and glow.
 * Pressed feedback is tracked with local state instead.
 */
export function GlowIconButton({
  icon: Icon,
  onPress,
  size = 44,
  iconSize = 20,
  active = false,
  glowEffect = false,
  disabled = false,
  accessibilityLabel,
  style,
}: GlowIconButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={6}
      className="items-center justify-center rounded-full border border-subtle bg-surface-light/80"
      style={[
        { width: size, height: size, flexShrink: 0 },
        active && { backgroundColor: "rgba(16,185,129,0.14)", borderColor: "rgba(16,185,129,0.45)" },
        glowEffect && glow,
        pressed && { opacity: 0.65 },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Icon size={iconSize} color={active ? colors.mint : colors.primary} strokeWidth={1.8} />
    </Pressable>
  );
}
