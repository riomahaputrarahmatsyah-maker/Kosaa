import { Brain } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

import { colors, glow } from "@/constants/theme";

export function TypingIndicator() {
  const first = useRef(new Animated.Value(0.25)).current;
  const second = useRef(new Animated.Value(0.25)).current;
  const third = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.stagger(150, [first, second, third].map((dot) =>
        Animated.sequence([
          Animated.timing(dot, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.25, duration: 320, useNativeDriver: true }),
        ]),
      )),
    );
    animation.start();
    return () => animation.stop();
  }, [first, second, third]);

  return (
    <View className="mb-4 flex-row items-start">
      <View
        className="mr-2 mt-1 h-7 w-7 items-center justify-center rounded-full border border-mint/30 bg-[#0B2A20]"
        style={glow}
      >
        <Brain size={13} color={colors.mint} />
      </View>
      <View className="flex-row items-center rounded-2xl rounded-bl-md border border-subtle bg-surface-light px-4 py-3.5">
        {[first, second, third].map((dot, index) => (
          <Animated.View
            key={index}
            style={{
              opacity: dot,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.mint,
              marginHorizontal: 2,
            }}
          />
        ))}
        <Text className="ml-2 font-sans text-[10px] text-secondary">Kosaa sedang berpikir</Text>
      </View>
    </View>
  );
}