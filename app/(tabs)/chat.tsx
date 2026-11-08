import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { Brain, KeyRound, Lock, MoreHorizontal, Paperclip, Send, Sparkles } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatBubble } from "@/components/chat/ChatBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { GlowIconButton } from "@/components/ui/GlowIconButton";
import { colors, glowStrong } from "@/constants/theme";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { runKosaaAgent } from "@/services/ai/agent";
import { DEFAULT_MODEL, getApiKey, getModel } from "@/services/settings/secureStore";
import { useAppStore } from "@/store/useAppStore";
import type { ChatMessage } from "@/types/models";

const SUGGESTIONS = [
  "Catat ide aplikasi untuk akhir pekan",
  "Jadwalkan olahraga besok jam 7 pagi",
  "Tautkan catatan proyek dan catatan ide",
];

/** Room kept under the composer for the floating tab bar. */
const TAB_BAR_ROOM = 96;

export default function ChatScreen() {
  const messages = useAppStore((state) => state.messages);
  const pending = useAppStore((state) => state.pending);
  const addMessage = useAppStore((state) => state.addMessage);
  const clearChat = useAppStore((state) => state.clearChat);
  const stageAiChange = useAppStore((state) => state.stageAiChange);
  const createNoteWithAttachment = useAppStore((state) => state.createNoteWithAttachment);
  const profile = useAppStore((state) => state.profile);
  const showNotice = useAppStore((state) => state.showNotice);

  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const router = useRouter();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [apiKey, setApiKey] = useState("");
  const [keyReady, setKeyReady] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachPressed, setAttachPressed] = useState(false);
  const [sendPressed, setSendPressed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getApiKey(), getModel()])
        .then(([key, currentModel]) => {
          if (!active) return;
          setApiKey(key);
          setModel(currentModel);
        })
        .finally(() => {
          if (active) setKeyReady(true);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(timer);
  }, [messages.length, sending]);

  // Keep the newest reply in view while the composer moves above the keyboard.
  useEffect(() => {
    if (!keyboard.keyboardVisible) return;
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 180);
    return () => clearTimeout(timer);
  }, [keyboard.keyboardVisible]);

  const openApiSettings = () => router.navigate("/settings/api");
  const openProfileSettings = () => router.navigate("/settings/profile");

  const send = async (raw: string) => {
    const content = raw.trim();
    if (!content || sending || pending) return;
    if (!profile.agentEnabled) {
      Alert.alert("Agent dinonaktifkan", "Aktifkan agent dulu di Profil & Personality.", [
        { text: "Nanti", style: "cancel" },
        { text: "Buka pengaturan", onPress: openProfileSettings },
      ]);
      return;
    }
    if (!apiKey) {
      Alert.alert("API key belum diatur", "Hubungkan DeepSeek dulu agar Kosaa bisa membalas dan mengubah data.", [
        { text: "Nanti", style: "cancel" },
        { text: "Atur sekarang", onPress: openApiSettings },
      ]);
      return;
    }

    setInput("");
    setSending(true);
    try {
      await addMessage("user", content);
      const state = useAppStore.getState();
      const result = await runKosaaAgent({
        apiKey,
        model,
        history: state.messages,
        snapshot: { nodes: state.nodes, edges: state.edges, schedules: state.schedules },
        profile: state.profile,
      });
      await addMessage("assistant", result.reply);

      if (result.draft) {
        stageAiChange(result.draft);
        if (result.draft.changedScreens.includes("graph")) {
          router.navigate("/");
        } else if (result.draft.changedScreens.includes("calendar")) {
          router.navigate("/calendar");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan tak terduga.";
      await addMessage("assistant", "Maaf, " + message);
    } finally {
      setSending(false);
    }
  };

  const confirmClear = () => {
    Alert.alert("Bersihkan riwayat?", "Semua percakapan di history.md akan dihapus. Catatan dan jadwal tetap aman.", [
      { text: "Batal", style: "cancel" },
      { text: "Bersihkan", style: "destructive", onPress: () => clearChat() },
    ]);
  };

  const openMenu = () => {
    Alert.alert("Kosaa", "Sekretaris AI untuk Second Brain-mu.", [
      { text: "Bersihkan riwayat", style: "destructive", onPress: confirmClear },
      { text: "API & Models", onPress: openApiSettings },
      { text: "Batal", style: "cancel" },
    ]);
  };

  const pickAttachment = async () => {
    if (attaching || sending) return;
    if (!profile.agentEnabled) {
      Alert.alert("Agent dinonaktifkan", "Aktifkan agent untuk menambahkan data dari chat.");
      return;
    }
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        // Keep the original content:// URI; copying it through the legacy
        // ContentResolver path avoids Expo Go's unreadable cache files.
        copyToCacheDirectory: false,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];
      if ((asset.mimeType ?? "").startsWith("audio/")) {
        Alert.alert("Audio belum didukung", "Pilih PDF, gambar, atau file dokumen lain.");
        return;
      }

      setAttaching(true);
      const fallbackTitle = asset.name.replace(/\.[^.]+$/, "").trim() || "Lampiran baru";
      const created = await createNoteWithAttachment(fallbackTitle, "", null, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      });

      let note = '"' + created.node.title + '" tersimpan di Knowledge Graph.';
      if (created.conversionPending) {
        note += " Konversi PDF ke .md masih coming soon, jadi teks PDF belum diekstrak.";
      } else {
        note += " Catatan pendamping .md juga dibuat.";
      }
      await addMessage("assistant", note);
      showNotice(
        created.conversionPending
          ? "PDF tersimpan. Konversi PDF ke .md segera hadir."
          : "Lampiran ditambahkan ke Knowledge Graph.",
        "success",
      );
    } catch (error) {
      Alert.alert(
        "Gagal mengimpor lampiran",
        error instanceof Error ? error.message : "Coba lagi dengan file lain.",
      );
    } finally {
      setAttaching(false);
    }
  };

  const subtitle = profile.agentEnabled ? "Sekretaris AI · " + model : "Agent nonaktif";
  const canSend = Boolean(input.trim()) && !sending && !pending;
  // The send arrow keeps a dark ink colour only while the button is mint.
  const sendIconColor = canSend ? "#04140E" : colors.mint;

  return (
    <View className="flex-1 bg-background" onLayout={keyboard.onLayout}>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center px-5 pb-2 pt-2">
          <View
            className="h-11 w-11 items-center justify-center rounded-full border border-mint/40 bg-[#0B2A20]"
            style={glowStrong}
          >
            <Brain size={21} color={colors.mint} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-inter-bold text-[19px] text-primary">Kosaa</Text>
            <View className="mt-0.5 flex-row items-center">
              <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-mint" />
              <Text numberOfLines={1} className="font-sans text-[10px] text-secondary">
                {subtitle}
              </Text>
            </View>
          </View>
          <GlowIconButton icon={MoreHorizontal} onPress={openMenu} accessibilityLabel="Opsi chat" />
        </View>

        {profile.agentEnabled && keyReady && !apiKey && !keyboard.keyboardVisible && (
          <Pressable
            onPress={openApiSettings}
            className="mx-5 mb-1 flex-row items-center rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3"
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <KeyRound size={17} color={colors.warning} />
            <View className="ml-3 flex-1">
              <Text className="font-inter-semibold text-[12px] text-primary">
                API key DeepSeek belum diatur
              </Text>
              <Text className="mt-0.5 font-sans text-[10px] text-secondary">
                Tambahkan key agar Kosaa bisa menjawab dan menjalankan tools.
              </Text>
            </View>
            <Text className="font-inter-semibold text-[11px] text-warning">Atur</Text>
          </Pressable>
        )}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-4 pb-10">
              <View
                className="h-20 w-20 items-center justify-center rounded-full border border-mint/40 bg-[#0B2A20]"
                style={glowStrong}
              >
                <Brain size={34} color={colors.mint} strokeWidth={1.5} />
              </View>
              <Text className="mt-5 font-inter-bold text-[22px] text-primary">
                Halo, {profile.name.split(" ")[0]}.
              </Text>
              <Text className="mt-2 max-w-[280px] text-center font-sans text-[13px] leading-5 text-secondary">
                {profile.agentEnabled
                  ? "Ceritakan ide, minta catatan, atau atur jadwal. Perubahan akan tampil sebagai pratinjau sebelum kamu setujui."
                  : "Agent sedang dinonaktifkan. Aktifkan kembali lewat Profil & Personality untuk mulai chat."}
              </Text>
              <View className="mt-6 w-full gap-2">
                {profile.agentEnabled && SUGGESTIONS.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => send(suggestion)}
                    className="flex-row items-center rounded-2xl border border-subtle bg-surface-light px-4 py-3"
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Sparkles size={14} color={colors.mint} />
                    <Text className="ml-3 flex-1 font-sans text-[12px] text-primary/85">{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={sending ? <TypingIndicator /> : undefined}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <View
          className="px-4"
          style={{
            paddingBottom: keyboard.keyboardVisible
              ? keyboard.bottomInset + 10
              : insets.bottom + TAB_BAR_ROOM,
          }}
        >
          {!profile.agentEnabled ? (
            <Pressable
              onPress={openProfileSettings}
              className="flex-row items-center rounded-[22px] border border-warning/25 bg-[#141414] px-4 py-3.5"
            >
              <Lock size={16} color={colors.warning} />
              <View className="ml-3 flex-1">
                <Text className="font-inter-semibold text-[12px] text-primary">Agent dinonaktifkan</Text>
                <Text className="mt-0.5 font-sans text-[10px] text-secondary">
                  Ketuk untuk mengaktifkan kembali di Profil & Personality.
                </Text>
              </View>
            </Pressable>
          ) : (
            <>
              <View className="flex-row items-end rounded-[22px] border border-subtle bg-[#141414] px-2 py-1.5">
                <Pressable
                  onPress={pickAttachment}
                  onPressIn={() => setAttachPressed(true)}
                  onPressOut={() => setAttachPressed(false)}
                  disabled={attaching || sending}
                  accessibilityRole="button"
                  accessibilityLabel="Lampirkan file"
                  hitSlop={4}
                  style={[
                    {
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      borderRadius: 20,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.09)",
                      backgroundColor: "rgba(255,255,255,0.06)",
                    },
                    (attachPressed || attaching) && { opacity: 0.6 },
                  ]}
                >
                  {attaching ? (
                    <ActivityIndicator size="small" color={colors.mint} />
                  ) : (
                    <Paperclip size={19} color={colors.secondary} />
                  )}
                </Pressable>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Tanya atau minta..."
                  placeholderTextColor="#5A5A61"
                  multiline
                  className="mx-2 max-h-[104px] px-1 font-sans text-[14px] leading-5 text-primary"
                  style={{ flex: 1, minWidth: 0, minHeight: 40, paddingVertical: 10 }}
                  selectionColor={colors.mint}
                />
                <Pressable
                  onPress={() => send(input)}
                  onPressIn={() => setSendPressed(true)}
                  onPressOut={() => setSendPressed(false)}
                  disabled={!canSend}
                  accessibilityRole="button"
                  accessibilityLabel="Kirim pesan"
                  hitSlop={4}
                  style={[
                    {
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      borderRadius: 20,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      backgroundColor: canSend ? colors.mint : "rgba(16,185,129,0.16)",
                      borderColor: canSend ? colors.mint : "rgba(16,185,129,0.55)",
                    },
                    sendPressed && canSend && { opacity: 0.75 },
                  ]}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={sendIconColor} />
                  ) : (
                    <Send size={19} color={sendIconColor} strokeWidth={2} />
                  )}
                </Pressable>
              </View>
              {!keyboard.keyboardVisible && (
                <Text className="mt-2 text-center font-sans text-[8px] tracking-wide text-white/20">
                  PERIKSA PRATINJAU SEBELUM MENYETUJUI · KOSAA BISA SALAH
                </Text>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
