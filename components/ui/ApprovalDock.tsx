import { usePathname } from "expo-router";
import { Check, Sparkles, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, glow } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

export function ApprovalDock() {
  const pending = useAppStore((state) => state.pending);
  const drawerOpen = useAppStore((state) => state.drawerOpen);
  const approvePending = useAppStore((state) => state.approvePending);
  const cancelPending = useAppStore((state) => state.cancelPending);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  if (!pending || drawerOpen) return null;

  const onChat = pathname.includes("chat");
  const bottom = insets.bottom + (onChat ? 176 : 92);
  const count = pending.changedNodeIds.length + pending.changedScheduleIds.length;

  const approve = async () => {
    setBusy(true);
    try {
      await approvePending();
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    cancelPending();
  };

  return (
    <View style={{ position: "absolute", right: 16, bottom, width: 286, zIndex: 60, elevation: 60 }}>
      <View className="rounded-[22px] border border-mint/30 bg-[#101010]/95 p-3.5" style={glow}>
        <View className="flex-row items-center">
          <View className="h-7 w-7 items-center justify-center rounded-full border border-mint/30 bg-mint/10">
            <Sparkles size={13} color={colors.mint} />
          </View>
          <Text className="ml-2 flex-1 font-inter-bold text-[12px] text-primary">Pratinjau AI</Text>
          <View className="rounded-full border border-mint/25 bg-mint/10 px-2 py-0.5">
            <Text className="font-inter-semibold text-[8px] text-mint">{count} perubahan</Text>
          </View>
        </View>

        <Text numberOfLines={2} className="mt-2 font-sans text-[10px] leading-4 text-secondary">
          {pending.summary.replace(/\n/g, " · ")}
        </Text>

        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={cancel}
            disabled={busy}
            accessibilityRole="button"
            className="flex-1 flex-row items-center justify-center rounded-xl border border-subtle bg-[#1A1A1A] py-2.5"
            style={{ opacity: busy ? 0.65 : 1 }}
          >
            <X size={13} color={colors.secondary} />
            <Text className="ml-1.5 font-inter-medium text-[11px] text-secondary">Batal</Text>
          </Pressable>
          <Pressable
            onPress={approve}
            disabled={busy}
            accessibilityRole="button"
            className="flex-row items-center justify-center rounded-xl bg-mint py-2.5"
            style={{ flex: 1.3, opacity: busy ? 0.7 : 1 }}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#04140E" />
            ) : (
              <>
                <Check size={13} color="#04140E" strokeWidth={2.6} />
                <Text className="ml-1.5 font-inter-bold text-[11px] text-[#04140E]">Setuju</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}