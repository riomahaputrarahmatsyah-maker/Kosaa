import "react-native-gesture-handler";
import "../global.css";

import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Brain, RefreshCw, ShieldAlert } from "lucide-react-native";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { NoticeToast } from "@/components/ui/NoticeToast";
import { colors, glowStrong } from "@/constants/theme";
import { configureNotifications } from "@/services/notifications";
import { useAppStore } from "@/store/useAppStore";

SplashScreen.preventAutoHideAsync().catch(() => {
  // The splash screen may already be hidden during fast refresh.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const hydrated = useAppStore((state) => state.hydrated);
  const bootError = useAppStore((state) => state.bootError);
  const initialize = useAppStore((state) => state.initialize);

  useEffect(() => {
    initialize();
    configureNotifications();
  }, [initialize]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore: splash may already be hidden.
      });
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (bootError) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <StatusBar style="light" />
        <View
          className="h-16 w-16 items-center justify-center rounded-full border border-danger/30 bg-danger/5"
          style={glowStrong}
        >
          <ShieldAlert size={26} color={colors.danger} />
        </View>
        <Text className="mt-5 text-center font-inter-bold text-[18px] text-primary">
          Vault gagal dibuka
        </Text>
        <Text className="mt-2 text-center font-sans text-[12px] leading-5 text-secondary">
          {bootError}
        </Text>
        <Pressable
          onPress={() => initialize()}
          className="mt-6 flex-row items-center rounded-full bg-mint px-5 py-3"
        >
          <RefreshCw size={15} color="#04140E" />
          <Text className="ml-2 font-inter-bold text-[12px] text-[#04140E]">Coba lagi</Text>
        </Pressable>
      </View>
    );
  }

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <StatusBar style="light" />
        <View
          className="h-20 w-20 items-center justify-center rounded-full border border-mint/40 bg-[#0B2A20]"
          style={glowStrong}
        >
          <Brain size={32} color={colors.mint} strokeWidth={1.5} />
        </View>
        <Text className="mt-5 font-inter-bold text-[22px] tracking-tight text-primary">Kosaa</Text>
        <Text className="mt-1 font-inter-medium text-[8px] tracking-[2.4px] text-mint/70">
          SECOND BRAIN
        </Text>
        <ActivityIndicator color={colors.mint} style={{ marginTop: 24 }} />
        <Text className="mt-3 font-sans text-[11px] text-secondary">Menyiapkan vault lokal...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ErrorBoundary>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
            <Stack.Screen name="settings/profile" />
            <Stack.Screen name="settings/api" />
            <Stack.Screen name="settings/reminder" />
            <Stack.Screen name="settings/history" />
            <Stack.Screen name="settings/zip" />
            <Stack.Screen name="settings/about" />
          </Stack>
          <NoticeToast />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}