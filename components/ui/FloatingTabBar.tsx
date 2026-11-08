import type { BottomTabBarProps } from "expo-router/build/layouts/Tabs";
import { CalendarDays, MessageSquare, Network, Settings } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, glow } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

const TABS = [
  { name: "index", label: "Graph", icon: Network },
  { name: "chat", label: "Chat", icon: MessageSquare },
  { name: "calendar", label: "Kalender", icon: CalendarDays },
  { name: "settings", label: "Setelan", icon: Settings },
] as const;

export function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const drawerOpen = useAppStore((state) => state.drawerOpen);

  if (drawerOpen) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}
    >
      <View
        className="flex-row items-center justify-between rounded-full border border-subtle bg-[#101010] px-1.5 py-1.5"
        style={{
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.55,
          shadowRadius: 24,
          elevation: 20,
        }}
      >
        {TABS.map((tab) => {
          const routeIndex = state.routes.findIndex((route) => route.name === tab.name);
          const route = state.routes[routeIndex];
          if (!route) return null;

          const isFocused = state.index === routeIndex;
          const options = descriptors[route.key]?.options;
          const Icon = tab.icon;

          const onPress = () => {
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? tab.label}
              onPress={onPress}
              hitSlop={4}
              className="flex-1 items-center justify-center"
              style={{ minHeight: 54 }}
            >
              <View
                className="items-center justify-center rounded-full px-3 py-1"
                style={
                  isFocused
                    ? [{ backgroundColor: "rgba(16,185,129,0.12)" }, glow]
                    : undefined
                }
              >
                <Icon
                  size={20}
                  color={isFocused ? colors.mint : colors.secondary}
                  strokeWidth={isFocused ? 2.1 : 1.8}
                />
                <Text
                  className={
                    isFocused
                      ? "mt-1 font-inter-semibold text-[10px] text-mint"
                      : "mt-1 font-inter-medium text-[10px] text-secondary/90"
                  }
                >
                  {tab.label}
                </Text>
              </View>
              <View
                className="mt-1 h-[2px] w-4 rounded-full"
                style={{ backgroundColor: isFocused ? colors.mint : "transparent" }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}