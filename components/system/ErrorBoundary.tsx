import { RefreshCw, ShieldAlert } from "lucide-react-native";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { colors, glowStrong } from "@/constants/theme";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error("Kosaa crashed:", error, info.componentStack);
    }
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <View
          className="h-16 w-16 items-center justify-center rounded-full border border-danger/30 bg-danger/5"
          style={glowStrong}
        >
          <ShieldAlert size={26} color={colors.danger} />
        </View>
        <Text className="mt-5 font-inter-bold text-[18px] text-primary">Ada yang tidak beres</Text>
        <Text className="mt-2 text-center font-sans text-[12px] leading-5 text-secondary">
          Kosaa mengalami gangguan di layar ini. Datamu tetap aman di perangkat.
        </Text>
        <Pressable
          onPress={this.reset}
          className="mt-6 flex-row items-center rounded-full bg-mint px-5 py-3"
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <RefreshCw size={15} color="#04140E" />
          <Text className="ml-2 font-inter-bold text-[12px] text-[#04140E]">Coba lagi</Text>
        </Pressable>
      </View>
    );
  }
}
