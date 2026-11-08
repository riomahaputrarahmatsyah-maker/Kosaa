import { Brain, Share2, Trash2, User } from "lucide-react-native";
import { Alert, Pressable, Text, View } from "react-native";
import * as Sharing from "expo-sharing";

import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { colors, glow } from "@/constants/theme";
import { getHistoryFile } from "@/services/file/fileManager";
import { useAppStore } from "@/store/useAppStore";
import { formatDateTime } from "@/utils/date";

export default function HistoryScreen() {
  const messages = useAppStore((state) => state.messages);
  const clearChat = useAppStore((state) => state.clearChat);
  const showNotice = useAppStore((state) => state.showNotice);

  const share = async () => {
    try {
      const file = getHistoryFile();
      if (!file.exists) {
        showNotice("Belum ada riwayat untuk dibagikan.", "info");
        return;
      }
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showNotice("Berbagi file tidak tersedia di perangkat ini.", "error");
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: "text/markdown",
        dialogTitle: "Bagikan riwayat Kosaa",
      });
    } catch (error) {
      showNotice("Gagal membagikan riwayat.", "error");
    }
  };

  const confirmClear = () => {
    Alert.alert("Bersihkan riwayat?", "history.md akan dihapus. Catatan dan jadwal tetap aman.", [
      { text: "Batal", style: "cancel" },
      { text: "Bersihkan", style: "destructive", onPress: () => clearChat() },
    ]);
  };

  const visible = messages.slice(-80).reverse();

  return (
    <SettingsScaffold title="Riwayat" subtitle={messages.length + " pesan tersimpan di history.md"}>
      <View className="flex-row gap-2">
        <Pressable
          onPress={share}
          className="flex-1 flex-row items-center justify-center rounded-2xl border border-subtle bg-[#161616] py-3"
          style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
        >
          <Share2 size={14} color={colors.mint} />
          <Text className="ml-2 font-inter-medium text-[11px] text-primary">Bagikan</Text>
        </Pressable>
        <Pressable
          onPress={confirmClear}
          className="flex-1 flex-row items-center justify-center rounded-2xl border border-danger/30 bg-danger/5 py-3"
          style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
        >
          <Trash2 size={14} color={colors.danger} />
          <Text className="ml-2 font-inter-medium text-[11px] text-danger">Bersihkan</Text>
        </Pressable>
      </View>

      <View className="mt-4 rounded-2xl border border-subtle bg-[#0E0E0E] px-4 py-3">
        <Text className="font-sans text-[10px] leading-4 text-secondary">
          Kosaa hanya mengirim 20 pesan terakhir ke DeepSeek sebagai konteks. Riwayat lengkap tetap di perangkat.
        </Text>
      </View>

      <View className="mt-4">
        {visible.length === 0 ? (
          <View className="items-center rounded-[22px] border border-dashed border-white/15 bg-white/[0.02] py-12">
            <Brain size={24} color={colors.secondary} />
            <Text className="mt-3 font-inter-medium text-[12px] text-primary/70">Belum ada percakapan</Text>
            <Text className="mt-1 font-sans text-[10px] text-secondary">Mulai chat dengan Kosaa dari tab Chat.</Text>
          </View>
        ) : (
          visible.map((message) => {
            const isUser = message.role === "user";
            return (
              <View
                key={message.id}
                className="mb-2.5 flex-row items-start rounded-2xl border border-subtle bg-[#101010] px-3.5 py-3"
              >
                <View
                  className="h-8 w-8 items-center justify-center rounded-full border"
                  style={{
                    borderColor: isUser ? "rgba(255,255,255,0.18)" : "rgba(16,185,129,0.35)",
                    backgroundColor: isUser ? "rgba(255,255,255,0.05)" : "rgba(16,185,129,0.10)",
                    ...(isUser ? {} : glow),
                  }}
                >
                  {isUser ? <User size={14} color={colors.primary} /> : <Brain size={14} color={colors.mint} />}
                </View>
                <View className="ml-2.5 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-inter-semibold text-[10px] text-primary/80">
                      {isUser ? "Kamu" : "Kosaa"}
                    </Text>
                    <Text className="font-sans text-[8px] text-secondary/60">
                      {formatDateTime(message.createdAt)}
                    </Text>
                  </View>
                  <Text numberOfLines={4} className="mt-1 font-sans text-[12px] leading-5 text-primary/80">
                    {message.content}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </SettingsScaffold>
  );
}
