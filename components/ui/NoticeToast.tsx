import { AlertCircle, CheckCircle2, Info, X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

export function NoticeToast() {
  const notice = useAppStore((state) => state.notice);
  const dismissNotice = useAppStore((state) => state.dismissNotice);
  const insets = useSafeAreaInsets();

  if (!notice) return null;

  const Icon =
    notice.tone === "success" ? CheckCircle2 : notice.tone === "error" ? AlertCircle : Info;
  const accent =
    notice.tone === "success" ? colors.mint : notice.tone === "error" ? colors.danger : "#60A5FA";

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, zIndex: 100, elevation: 100 }}
    >
      <View
        className="flex-row items-center rounded-2xl border border-subtle bg-[#141414]/95 px-4 py-3"
        style={{
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 18,
        }}
      >
        <Icon size={18} color={accent} />
        <Text className="ml-3 flex-1 font-inter-medium text-[13px] leading-5 text-primary">
          {notice.message}
        </Text>
        <Pressable onPress={dismissNotice} hitSlop={10} accessibilityLabel="Tutup notifikasi">
          <X size={16} color={colors.secondary} />
        </Pressable>
      </View>
    </View>
  );
}
