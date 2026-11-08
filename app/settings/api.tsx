import { Eye, EyeOff, KeyRound, ShieldCheck, Sparkles, Wifi } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from "react-native";

import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { colors, glow } from "@/constants/theme";
import { testApiKey } from "@/services/ai/deepseek";
import {
  DEFAULT_MODEL,
  MODEL_OPTIONS,
  getApiKey,
  getModel,
  maskApiKey,
  saveApiKey,
  saveModel,
} from "@/services/settings/secureStore";
import { useAppStore } from "@/store/useAppStore";

type Status = { tone: "success" | "error"; message: string } | null;

export default function ApiSettingsScreen() {
  const showNotice = useAppStore((state) => state.showNotice);
  const [key, setKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getApiKey(), getModel()])
      .then(([storedKey, storedModel]) => {
        if (!active) return;
        setKey(storedKey);
        setModel(storedModel);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await saveApiKey(key);
      await saveModel(model);
      setKey(key.trim());
      showNotice("Pengaturan AI disimpan.", "success");
      setStatus({ tone: "success", message: "API key dan model tersimpan aman di SecureStore." });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Gagal menyimpan." });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setStatus(null);
    try {
      await testApiKey(key);
      setStatus({ tone: "success", message: "Koneksi berhasil. DeepSeek siap dipakai." });
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Koneksi gagal." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <SettingsScaffold title="API & Models" subtitle="Hubungkan Kosaa ke otak DeepSeek.">
      <View className="rounded-[22px] border border-mint/20 bg-[#0B1F18] p-4" style={glow}>
        <View className="flex-row items-center">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-mint/15">
            <KeyRound size={16} color={colors.mint} />
          </View>
          <Text className="ml-2.5 font-inter-semibold text-[13px] text-primary">DeepSeek API Key</Text>
        </View>

        <View className="mt-3 flex-row items-center rounded-2xl border border-subtle bg-[#0A0A0A] px-3">
          <TextInput
            value={key}
            onChangeText={setKey}
            placeholder="sk-..."
            placeholderTextColor="#4A4A52"
            secureTextEntry={!visible}
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 py-3 font-mono text-[12px] text-primary"
            selectionColor={colors.mint}
          />
          <Pressable onPress={() => setVisible((value) => !value)} hitSlop={10} accessibilityLabel="Tampilkan API key">
            {visible ? <EyeOff size={17} color={colors.secondary} /> : <Eye size={17} color={colors.secondary} />}
          </Pressable>
        </View>

        <Pressable
          onPress={() => Linking.openURL("https://platform.deepseek.com/api_keys")}
          className="mt-2 self-start"
        >
          <Text className="font-inter-medium text-[10px] text-mint underline">
            Dapatkan API key di platform.deepseek.com
          </Text>
        </Pressable>

        <Text className="mt-3 font-sans text-[10px] leading-4 text-primary/45">
          Key disimpan di SecureStore perangkat. Kosaa tidak pernah mengirim data ke server selain DeepSeek.
        </Text>
      </View>

      <Text className="mb-2 mt-6 font-inter-medium text-[9px] tracking-[2px] text-secondary">MODEL</Text>
      <View className="rounded-[20px] border border-subtle bg-[#101010] p-4">
        <TextInput
          value={model}
          onChangeText={setModel}
          placeholder="deepseek-flash"
          placeholderTextColor="#4A4A52"
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-2xl border border-subtle bg-[#0A0A0A] px-3 py-3 font-mono text-[12px] text-primary"
          selectionColor={colors.mint}
        />
        <View className="mt-2 flex-row flex-wrap gap-2">
          {MODEL_OPTIONS.map((preset) => {
            const active = model.trim() === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => setModel(preset)}
                className={
                  active
                    ? "rounded-full border border-mint/40 bg-mint/10 px-3 py-1.5"
                    : "rounded-full border border-subtle bg-white/5 px-3 py-1.5"
                }
              >
                <Text
                  className={
                    active
                      ? "font-inter-semibold text-[10px] text-mint"
                      : "font-inter-medium text-[10px] text-secondary"
                  }
                >
                  {preset}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="mt-2 font-sans text-[10px] leading-4 text-secondary/70">
          {model.trim() === "deepseek-v4-pro"
            ? "v4-pro: penalaran lebih dalam (lebih lambat dan lebih mahal), tool calling tetap didukung."
            : "deepseek-flash: cepat dan mendukung tool calling untuk membuat catatan dan jadwal."}
        </Text>
        {!MODEL_OPTIONS.includes(model.trim() as (typeof MODEL_OPTIONS)[number]) && (
          <Text className="mt-2 font-sans text-[10px] leading-4 text-warning/80">
            Model di luar daftar resmi bisa ditolak API ({"deepseek-flash"} / {"deepseek-v4-pro"}).
          </Text>
        )}
      </View>

      {status && (
        <View
          className={
            status.tone === "success"
              ? "mt-4 flex-row items-start rounded-2xl border border-mint/30 bg-mint/5 px-4 py-3"
              : "mt-4 flex-row items-start rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3"
          }
        >
          {status.tone === "success" ? (
            <ShieldCheck size={15} color={colors.mint} />
          ) : (
            <Wifi size={15} color={colors.danger} />
          )}
          <Text
            className={
              status.tone === "success"
                ? "ml-2 flex-1 font-sans text-[11px] leading-4 text-primary/80"
                : "ml-2 flex-1 font-sans text-[11px] leading-4 text-primary/80"
            }
          >
            {status.message}
          </Text>
        </View>
      )}

      <View className="mt-5 flex-row gap-2">
        <Pressable
          onPress={test}
          disabled={testing || !key.trim()}
          className="flex-1 flex-row items-center justify-center rounded-2xl border border-subtle bg-[#161616] py-3.5"
          style={({ pressed }) => [{ opacity: pressed || testing ? 0.65 : 1 }]}
        >
          {testing ? (
            <ActivityIndicator size="small" color={colors.mint} />
          ) : (
            <Sparkles size={14} color={colors.mint} />
          )}
          <Text className="ml-2 font-inter-semibold text-[12px] text-primary">Tes koneksi</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={saving || loading}
          className="flex-1 items-center justify-center rounded-2xl bg-mint py-3.5"
          style={({ pressed }) => [{ opacity: pressed || saving ? 0.7 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#04140E" />
          ) : (
            <Text className="font-inter-bold text-[12px] text-[#04140E]">Simpan</Text>
          )}
        </Pressable>
      </View>

      {!loading && key.trim().length > 0 && (
        <Text className="mt-3 text-center font-sans text-[9px] text-secondary/60">
          Tersimpan: {maskApiKey(key)}
        </Text>
      )}
    </SettingsScaffold>
  );
}
