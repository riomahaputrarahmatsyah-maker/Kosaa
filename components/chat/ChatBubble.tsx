import { Brain } from "lucide-react-native";
import { Text, View } from "react-native";

import { colors, glow } from "@/constants/theme";
import type { ChatMessage } from "@/types/models";
import { formatClock } from "@/utils/date";

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <View className={isUser ? "mb-4 items-end" : "mb-4 flex-row items-start"}>
      {!isUser && (
        <View
          className="mr-2 mt-1 h-7 w-7 items-center justify-center rounded-full border border-mint/30 bg-[#0B2A20]"
          style={glow}
        >
          <Brain size={13} color={colors.mint} />
        </View>
      )}
      <View
        className={
          isUser
            ? "max-w-[82%] rounded-2xl rounded-br-md border border-mint/15 bg-surface px-4 py-2.5"
            : "max-w-[82%] rounded-2xl rounded-bl-md border border-subtle bg-surface-light px-4 py-2.5"
        }
      >
        <Text className="font-sans text-[14px] leading-[21px] text-primary">{message.content}</Text>
        <Text className="mt-1 self-end font-sans text-[9px] text-primary/35">
          {formatClock(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}
