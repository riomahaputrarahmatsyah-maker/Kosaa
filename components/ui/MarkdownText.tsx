import { Text, View } from "react-native";

function inline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    const key = keyPrefix + "-" + index;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <Text key={key} className="font-inter-semibold text-primary">
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <Text key={key} className="font-mono text-[13px] text-mint">
          {part.slice(1, -1)}
        </Text>
      );
    }
    return <Text key={key}>{part}</Text>;
  });
}

export function MarkdownText({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  let inCode = false;

  return (
    <View>
      {lines.map((line, index) => {
        const key = "md-" + index;

        if (line.trim().startsWith("```")) {
          inCode = !inCode;
          return null;
        }

        if (inCode) {
          return (
            <View key={key} className="my-0.5 rounded-lg bg-[#0B0B0B] px-3 py-1.5">
              <Text className="font-mono text-[12px] leading-5 text-mint/90">{line || " "}</Text>
            </View>
          );
        }

        if (!line.trim()) return <View key={key} className="h-2.5" />;

        if (line.startsWith("# ")) {
          return (
            <Text key={key} className="mb-2 mt-3 font-inter-bold text-[20px] leading-7 text-primary">
              {inline(line.slice(2), key)}
            </Text>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <Text key={key} className="mb-1.5 mt-3 font-inter-semibold text-[17px] leading-6 text-primary">
              {inline(line.slice(3), key)}
            </Text>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <Text key={key} className="mb-1 mt-2 font-inter-semibold text-[15px] leading-6 text-primary">
              {inline(line.slice(4), key)}
            </Text>
          );
        }
        if (line.trim() === "---") {
          return <View key={key} className="my-3 h-px bg-subtle" />;
        }
        if (/^\s*[-*]\s+/.test(line)) {
          const body = line.replace(/^\s*[-*]\s+/, "");
          return (
            <View key={key} className="mb-1 flex-row items-start pl-1">
              <View className="mt-[9px] h-1 w-1 rounded-full bg-mint" />
              <Text className="ml-2.5 flex-1 font-sans text-[14px] leading-6 text-primary/90">
                {inline(body, key)}
              </Text>
            </View>
          );
        }
        if (line.startsWith("> ")) {
          return (
            <View key={key} className="my-1 border-l-2 border-mint/40 pl-3">
              <Text className="font-sans text-[13px] italic leading-5 text-secondary">
                {inline(line.slice(2), key)}
              </Text>
            </View>
          );
        }

        return (
          <Text key={key} className="mb-1 font-sans text-[14px] leading-6 text-primary/90">
            {inline(line, key)}
          </Text>
        );
      })}
    </View>
  );
}
