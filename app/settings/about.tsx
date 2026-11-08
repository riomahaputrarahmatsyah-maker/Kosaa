import Constants from "expo-constants";
import { Brain, ExternalLink, Heart, Lock, Sparkles, WifiOff } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";

import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { colors, glowStrong } from "@/constants/theme";

const version = Constants.expoConfig?.version ?? "1.0.2";

export default function AboutScreen() {
  return (
    <SettingsScaffold title="Tentang Kosaa" subtitle={"Versi " + version}>
      <View className="items-center rounded-[26px] border border-mint/20 bg-[#0B1F18] px-5 py-8" style={glowStrong}>
        <View
          className="h-20 w-20 items-center justify-center rounded-full border border-mint/50 bg-[#071F17]"
          style={glowStrong}
        >
          <Brain size={34} color={colors.mint} strokeWidth={1.5} />
        </View>
        <Text className="mt-4 font-inter-bold text-[22px] tracking-tight text-primary">Kosaa</Text>
        <Text className="mt-1 font-inter-medium text-[9px] tracking-[2px] text-mint/70">
          LOCAL-FIRST SECOND BRAIN
        </Text>
        <Text className="mt-4 max-w-[300px] text-center font-sans text-[11px] leading-5 text-secondary">
          Sekretaris pribadi yang menyimpan catatanmu sebagai file fisik di perangkat, ditemani DeepSeek untuk
          berpikir dan merapikan.
        </Text>
      </View>

      <View className="mt-5 gap-2">
        <Pillar icon={WifiOff} title="Offline dulu" text="Catatan dan jadwal tetap utuh tanpa internet." />
        <Pillar icon={Lock} title="Privat" text="Tanpa akun, tanpa cloud, tanpa pelacakan." />
        <Pillar icon={Sparkles} title="Dibantu AI" text="DeepSeek hanya menerima konteks yang kamu izinkan." />
      </View>

      <Text className="mb-2 mt-6 font-inter-medium text-[9px] tracking-[2px] text-secondary">TEKNOLOGI</Text>
      <View className="flex-row flex-wrap gap-2">
        {["Expo", "React Native", "SQLite", "NativeWind", "Zustand", "DeepSeek"].map((item) => (
          <View key={item} className="rounded-full border border-subtle bg-white/5 px-3 py-1.5">
            <Text className="font-inter-medium text-[10px] text-primary/70">{item}</Text>
          </View>
        ))}
      </View>

      <Text className="mb-2 mt-6 font-inter-medium text-[9px] tracking-[2px] text-secondary">TAUTAN</Text>
      <View className="overflow-hidden rounded-[20px] border border-subtle bg-[#101010]">
        <LinkRow
          icon={Sparkles}
          label="DeepSeek Platform"
          onPress={() => Linking.openURL("https://platform.deepseek.com")}
        />
        <LinkRow
          icon={ExternalLink}
          label="Expo Documentation"
          onPress={() => Linking.openURL("https://docs.expo.dev")}
          last
        />
      </View>

      <View className="mt-8 items-center">
        <View className="flex-row items-center">
          <Heart size={11} color={colors.mint} />
          <Text className="ml-1.5 font-sans text-[10px] text-secondary">Untuk data perbendaharaan yang lebih baik</Text>
        </View>
        <Text className="mt-2 font-sans text-[9px] text-white/20">
          © 2026 Kosaa · by @m.r.rio_
        </Text>
      </View>
    </SettingsScaffold>
  );
}

function Pillar({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof WifiOff;
  title: string;
  text: string;
}) {
  return (
    <View className="flex-row items-center rounded-2xl border border-subtle bg-[#101010] px-4 py-3">
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-mint/10">
        <Icon size={14} color={colors.mint} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-inter-semibold text-[11px] text-primary">{title}</Text>
        <Text className="mt-0.5 font-sans text-[10px] leading-4 text-secondary">{text}</Text>
      </View>
    </View>
  );
}

function LinkRow({
  icon: Icon,
  label,
  onPress,
  last = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={last ? "flex-row items-center px-4 py-3.5" : "flex-row items-center border-b border-subtle px-4 py-3.5"}
      accessibilityRole="link"
      style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
    >
      <Icon size={15} color={colors.mint} />
      <Text className="ml-3 flex-1 font-inter-medium text-[12px] text-primary">{label}</Text>
      <ExternalLink size={13} color="rgba(255,255,255,0.35)" />
    </Pressable>
  );
}
