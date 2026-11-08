import { Check, Sparkles, UserRound } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from "react-native";

import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { colors, glow } from "@/constants/theme";
import { PERSONALITY_PRESETS } from "@/services/settings/profile";
import { useAppStore } from "@/store/useAppStore";

export default function ProfileSettingsScreen() {
  const profile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);
  const showNotice = useAppStore((state) => state.showNotice);
  const [name, setName] = useState(profile.name);
  const [personality, setPersonality] = useState(profile.personality);
  const [agentEnabled, setAgentEnabled] = useState(profile.agentEnabled);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await setProfile({
        name: name.trim() || profile.name,
        personality: personality.trim() || profile.personality,
        agentEnabled,
      });
      showNotice("Profil dan personality disimpan.", "success");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsScaffold title="Profil & Personality" subtitle="Siapa Kosaa di matamu.">
      <View className="items-center rounded-[24px] border border-mint/20 bg-[#0B1F18] py-6" style={glow}>
        <View
          className="h-16 w-16 items-center justify-center rounded-full border border-mint/40 bg-[#071F17]"
          style={glow}
        >
          <UserRound size={26} color={colors.mint} />
        </View>
        <Text className="mt-3 font-inter-bold text-[16px] text-primary">{name.trim() || "Tanpa nama"}</Text>
        <Text className="mt-1 font-sans text-[10px] text-secondary">Local-first · private</Text>
      </View>

      <Text className="mb-2 mt-6 font-inter-medium text-[9px] tracking-[2px] text-secondary">NAMA</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Namamu"
        placeholderTextColor="#4A4A52"
        maxLength={60}
        className="rounded-2xl border border-subtle bg-[#0B0B0B] px-4 py-3 font-inter-medium text-[14px] text-primary"
        selectionColor={colors.mint}
      />
      <Text className="mt-1.5 font-sans text-[10px] text-secondary/60">
        Nama ini dipakai Kosaa saat menyapa dan masuk ke konteks AI.
      </Text>

      <Text className="mb-2 mt-6 font-inter-medium text-[9px] tracking-[2px] text-secondary">PERSONALITY</Text>
      <View className="mb-2 flex-row flex-wrap gap-2">
        {PERSONALITY_PRESETS.map((preset) => {
          const active = personality === preset.value;
          return (
            <Pressable
              key={preset.label}
              onPress={() => setPersonality(preset.value)}
              className={
                active
                  ? "flex-row items-center rounded-full border border-mint/40 bg-mint/10 px-3 py-1.5"
                  : "rounded-full border border-subtle bg-white/5 px-3 py-1.5"
              }
            >
              {active && <Check size={10} color={colors.mint} />}
              <Text
                className={
                  active
                    ? "ml-1 font-inter-semibold text-[10px] text-mint"
                    : "font-inter-medium text-[10px] text-secondary"
                }
              >
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={personality}
        onChangeText={setPersonality}
        placeholder="Tulis gaya bicara yang kamu mau..."
        placeholderTextColor="#4A4A52"
        multiline
        maxLength={240}
        className="min-h-[86px] rounded-2xl border border-subtle bg-[#0B0B0B] px-4 py-3 font-sans text-[13px] leading-5 text-primary"
        selectionColor={colors.mint}
        textAlignVertical="top"
      />
      <Text className="mt-1.5 font-sans text-[10px] text-secondary/60">
        Contoh: "Ringkas, hangat, sedikit jenaka, dan tidak bertele-tele."
      </Text>

      <View className="mt-6 flex-row items-center rounded-2xl border border-subtle bg-[#101010] px-4 py-3.5">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-mint/10">
          <Sparkles size={16} color={colors.mint} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-inter-medium text-[13px] text-primary">Aktifkan agent</Text>
          <Text className="mt-0.5 font-sans text-[10px] text-secondary">
            Mematikan chat dan semua tool DeepSeek.
          </Text>
        </View>
        <Switch
          value={agentEnabled}
          onValueChange={setAgentEnabled}
          trackColor={{ false: "#27272A", true: "rgba(16,185,129,0.55)" }}
          thumbColor={agentEnabled ? colors.mint : "#A1A1AA"}
          ios_backgroundColor="#27272A"
        />
      </View>

      <Pressable
        onPress={save}
        disabled={saving}
        className="mt-5 items-center justify-center rounded-2xl bg-mint py-4"
        style={[glow, { opacity: saving ? 0.7 : 1 }]}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#04140E" />
        ) : (
          <Text className="font-inter-bold text-[13px] text-[#04140E]">Simpan profil</Text>
        )}
      </Pressable>

      <View className="mt-4 rounded-2xl border border-subtle bg-[#0E0E0E] px-4 py-3">
        <Text className="font-sans text-[10px] leading-4 text-secondary">
          Nama dan personality dikirim ke DeepSeek hanya saat kamu memakai chat. Data tetap tersimpan lokal di
          perangkat.
        </Text>
      </View>
    </SettingsScaffold>
  );
}
