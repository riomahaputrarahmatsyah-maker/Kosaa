import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Bell, Brain, History, Info, KeyRound, Lock, Package, Settings, Sparkles, Network, UserRound } from "lucide-react-native";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SettingsRow } from "@/components/settings/SettingsRow";
import { GlowIconButton } from "@/components/ui/GlowIconButton";
import { colors, glow, glowStrong } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

export default function SettingsScreen() {
  const router = useRouter();
  const nodes = useAppStore((state) => state.nodes);
  const edges = useAppStore((state) => state.edges);
  const schedules = useAppStore((state) => state.schedules);
  const profile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);
  const showNotice = useAppStore((state) => state.showNotice);

  const toggleAgent = async (enabled: boolean) => {
    await setProfile({ ...profile, agentEnabled: enabled });
    showNotice(enabled ? "Agent diaktifkan." : "Agent dinonaktifkan.", enabled ? "success" : "info");
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-5 pb-2 pt-2">
        <View className="flex-1">
          <Text className="font-inter-bold text-[22px] tracking-tight text-primary">Pengaturan</Text>
          <Text className="mt-0.5 font-sans text-[11px] text-secondary">Kendali penuh atas Second Brain-mu.</Text>
        </View>
        <GlowIconButton
          icon={Settings}
          onPress={() => router.navigate("/settings/about")}
          accessibilityLabel="Tentang Kosaa"
        />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 170 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#0B2A20", "#0F3D2E", "#0A1A14"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 26,
            borderWidth: 1,
            borderColor: "rgba(16,185,129,0.2)",
            padding: 20,
            overflow: "hidden",
          }}
        >
          <View className="flex-row items-center">
            <View
              className="h-14 w-14 items-center justify-center rounded-full border border-mint/50 bg-[#071F17]"
              style={glowStrong}
            >
              <Brain size={25} color={colors.mint} />
            </View>
            <View className="ml-3.5 flex-1">
              <Text numberOfLines={1} className="font-inter-bold text-[18px] text-primary">{profile.name}</Text>
              <Text numberOfLines={1} className="mt-0.5 font-sans text-[11px] text-primary/60">
                Local-first Second Brain
              </Text>
            </View>
            <View className="flex-row items-center rounded-full border border-mint/25 bg-black/20 px-2.5 py-1">
              <Lock size={10} color={colors.mint} />
              <Text className="ml-1 font-inter-semibold text-[8px] tracking-wide text-mint">PRIVATE</Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-center rounded-2xl border border-white/10 bg-black/20 px-2 py-3">
            <Stat icon={Network} value={nodes.length} label="Catatan" />
            <View className="h-8 w-px bg-white/10" />
            <Stat icon={Sparkles} value={edges.length} label="Tautan" />
            <View className="h-8 w-px bg-white/10" />
            <Stat icon={Bell} value={schedules.length} label="Jadwal" />
          </View>

          <Text className="mt-4 font-sans text-[10px] leading-4 text-primary/50">
            Semua catatan disimpan sebagai file fisik di perangkat. Tidak ada cloud, tidak ada sinkronisasi paksa.
          </Text>
        </LinearGradient>

        <Text className="mb-2 mt-6 font-inter-medium text-[9px] tracking-[2px] text-secondary">AI & PREFERENSI</Text>
        <View className="overflow-hidden rounded-[20px] border border-subtle bg-[#101010]">
          <SettingsRow
            icon={UserRound}
            label="Profil & Personality"
            caption={profile.name + " · " + (profile.agentEnabled ? "agent aktif" : "agent nonaktif")}
            onPress={() => router.navigate("/settings/profile")}
          />
          <SettingsRow
            icon={KeyRound}
            label="API & Models"
            caption="DeepSeek API key dan model"
            onPress={() => router.navigate("/settings/api")}
          />
          <SettingsRow
            icon={Bell}
            label="Pengingat"
            caption="Notifikasi harian untuk merapikan catatan"
            onPress={() => router.navigate("/settings/reminder")}
          />
          <View className="flex-row items-center px-4 py-3.5">
            <View className="h-9 w-9 items-center justify-center rounded-xl border border-mint/20 bg-mint/10">
              <Brain size={16} color={colors.mint} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-inter-medium text-[13px] text-primary">Aktifkan Agent</Text>
              <Text className="mt-0.5 font-sans text-[10px] text-secondary">
                {profile.agentEnabled ? "Chat dan tools DeepSeek aktif" : "Chat dan tools dinonaktifkan"}
              </Text>
            </View>
            <Switch
              value={profile.agentEnabled}
              onValueChange={toggleAgent}
              trackColor={{ false: "#27272A", true: "rgba(16,185,129,0.55)" }}
              thumbColor={profile.agentEnabled ? colors.mint : "#A1A1AA"}
              ios_backgroundColor="#27272A"
            />
          </View>
        </View>

        <Text className="mb-2 mt-6 font-inter-medium text-[9px] tracking-[2px] text-secondary">DATA & APLIKASI</Text>
        <View className="overflow-hidden rounded-[20px] border border-subtle bg-[#101010]">
          <SettingsRow
            icon={History}
            label="Riwayat"
            caption="Percakapan tersimpan di history.md"
            onPress={() => router.navigate("/settings/history")}
          />
          <SettingsRow
            icon={Package}
            label="Zip Brain"
            caption="Segera hadir · ekspor vault portabel"
            onPress={() => router.navigate("/settings/zip")}
          />
          <SettingsRow
            icon={Info}
            label="Tentang Kosaa"
            caption="Versi, kredit, dan filosofi local-first"
            onPress={() => router.navigate("/settings/about")}
            last
          />
        </View>

        <Pressable
          onPress={() => router.navigate("/settings/about")}
          className="mt-6 items-center"
          accessibilityRole="button"
        >
          <Text className="font-sans text-[10px] text-secondary/70">
            Kosaa v{Constants.expoConfig?.version ?? "1.0.2"}
          </Text>
          <Text className="mt-1 font-sans text-[9px] text-white/20">Untuk data perbendaharaan yang lebih baik</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Network;
  value: number;
  label: string;
}) {
  return (
    <View className="flex-1 items-center">
      <Icon size={14} color={colors.mint} />
      <Text className="mt-1 font-inter-bold text-[16px] text-primary">{value}</Text>
      <Text className="font-sans text-[9px] text-primary/50">{label}</Text>
    </View>
  );
}