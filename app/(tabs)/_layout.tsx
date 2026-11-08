import { Tabs } from "expo-router";
import { View } from "react-native";

import { ApprovalDock } from "@/components/ui/ApprovalDock";
import { FloatingTabBar } from "@/components/ui/FloatingTabBar";
import { colors } from "@/constants/theme";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";

export default function TabsLayout() {
  // The floating bar lives above the content, so on devices where the window
  // does resize for the keyboard it would collide with the chat composer.
  const keyboard = useKeyboardInset();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        tabBar={(props) => (keyboard.keyboardVisible ? null : <FloatingTabBar {...props} />)}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Graph" }} />
        <Tabs.Screen name="chat" options={{ title: "Chat" }} />
        <Tabs.Screen name="calendar" options={{ title: "Kalender" }} />
        <Tabs.Screen name="settings" options={{ title: "Setelan" }} />
      </Tabs>
      <ApprovalDock />
    </View>
  );
}
