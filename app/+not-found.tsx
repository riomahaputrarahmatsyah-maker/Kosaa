import { Link } from "expo-router";
import { Compass } from "lucide-react-native";
import { Text, View } from "react-native";

import { colors, glowStrong } from "@/constants/theme";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <View
        className="h-16 w-16 items-center justify-center rounded-full border border-mint/30 bg-mint/5"
        style={glowStrong}
      >
        <Compass size={26} color={colors.mint} />
      </View>
      <Text className="mt-5 font-inter-bold text-[18px] text-primary">Halaman tidak ditemukan</Text>
      <Text className="mt-2 text-center font-sans text-[12px] leading-5 text-secondary">
        Tautan ini tidak ada di dalam Kosaa.
      </Text>
      <Link
        href="/"
        style={{
          marginTop: 24,
          borderRadius: 999,
          backgroundColor: colors.mint,
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <Text className="font-inter-bold text-[12px] text-[#04140E]">Kembali ke Graph</Text>
      </Link>
    </View>
  );
}
