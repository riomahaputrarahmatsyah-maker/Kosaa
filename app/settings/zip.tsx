import { Archive, Clock, Lock } from "lucide-react-native";
import { Text, View } from "react-native";

import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { colors, glow } from "@/constants/theme";

export default function ZipScreen() {
  return (
    <SettingsScaffold title="Zip Brain" subtitle="Segera hadir">
      <View className="items-center rounded-[26px] border border-mint/20 bg-[#0B1F18] px-5 py-9" style={glow}>
        <View
          className="h-20 w-20 items-center justify-center rounded-full border border-mint/40 bg-[#071F17]"
          style={glow}
        >
          <Archive size={32} color={colors.mint} />
        </View>
        <View className="mt-4 flex-row items-center rounded-full border border-mint/30 bg-mint/10 px-3 py-1">
          <Clock size={11} color={colors.mint} />
          <Text className="ml-1.5 font-inter-bold text-[9px] tracking-wide text-mint">COMING SOON</Text>
        </View>
        <Text className="mt-3 font-inter-bold text-[17px] text-primary">Ekspor & pindahkan otak</Text>
        <Text className="mt-2 max-w-[280px] text-center font-sans text-[11px] leading-5 text-secondary">
          Fitur untuk membungkus vault, database, dan riwayat menjadi satu ZIP portabel sedang disiapkan.
          Nantinya kamu bisa memindahkannya ke perangkat lain.
        </Text>
      </View>

      <View className="mt-5 flex-row items-start rounded-2xl border border-subtle bg-[#0E0E0E] px-4 py-3">
        <Lock size={13} color={colors.secondary} />
        <Text className="ml-2 flex-1 font-sans text-[10px] leading-4 text-secondary">
          Sementara ini data tetap aman di perangkat. API key tidak pernah ikut diekspor.
        </Text>
      </View>
    </SettingsScaffold>
  );
}
