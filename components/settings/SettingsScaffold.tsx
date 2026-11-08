import { ArrowLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { GlowIconButton } from "@/components/ui/GlowIconButton";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";

interface SettingsScaffoldProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function SettingsScaffold({ title, subtitle, children }: SettingsScaffoldProps) {
  const router = useRouter();
  const keyboard = useKeyboardInset();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]} onLayout={keyboard.onLayout}>
      <View className="flex-row items-center px-5 pb-3 pt-2">
        <GlowIconButton
          icon={ArrowLeft}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/settings"))}
          accessibilityLabel="Kembali"
        />
        <View className="ml-3 flex-1">
          <Text className="font-inter-bold text-[19px] text-primary">{title}</Text>
          {subtitle ? (
            <Text className="mt-0.5 font-sans text-[11px] text-secondary">{subtitle}</Text>
          ) : null}
        </View>
      </View>
      <ScrollView
        className="flex-1 px-5"
        style={{ marginBottom: keyboard.bottomInset }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
