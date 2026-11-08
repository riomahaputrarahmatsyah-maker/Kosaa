import { Brain, ChevronRight, File, FileImage, FileText, FileType2, Folder, Moon, MoreVertical, Plus, Search, Settings, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, glow } from "@/constants/theme";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import type { GraphNode, NodeType } from "@/types/models";

type Filter = "all" | NodeType;

interface VaultDrawerProps {
  visible: boolean;
  nodes: GraphNode[];
  onClose: () => void;
  onAdd: () => void;
  onOpenNode: (node: GraphNode) => void;
  onManageNode: (node: GraphNode) => void;
}

function nodeIcon(node: GraphNode) {
  if (node.type === "pdf") return FileType2;
  if (node.type === "image") return FileImage;
  if (node.type === "file") return File;
  return FileText;
}

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "Semua catatan" },
  { key: "md", label: "Markdown" },
  { key: "pdf", label: "PDF" },
  { key: "image", label: "Gambar" },
  { key: "file", label: "File lain" },
];

export function VaultDrawer({ visible, nodes, onClose, onAdd, onOpenNode, onManageNode }: VaultDrawerProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(348, width * 0.86);
  const progress = useRef(new Animated.Value(0)).current;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose, visible]);

  const counts = useMemo(
    () => ({
      all: nodes.length,
      md: nodes.filter((node) => node.type === "md").length,
      pdf: nodes.filter((node) => node.type === "pdf").length,
      image: nodes.filter((node) => node.type === "image").length,
      file: nodes.filter((node) => node.type === "file").length,
    }),
    [nodes],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return nodes.filter((node) => {
      if (filter !== "all" && node.type !== filter) return false;
      if (!needle) return true;
      return node.title.toLowerCase().includes(needle);
    });
  }, [filter, nodes, query]);

  const openSettings = () => {
    onClose();
    router.navigate("/settings");
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? "auto" : "none"}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#000000", opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.68] }) },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Tutup vault" />
      </Animated.View>

      <Animated.View
        onLayout={keyboard.onLayout}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: panelWidth,
          borderTopRightRadius: 30,
          borderBottomRightRadius: 30,
          borderRightWidth: 1,
          borderRightColor: "#27272A",
          backgroundColor: "#0F3D2E",
          paddingTop: insets.top + 14,
          // Keep the folder list and the footer (Pengaturan + chevron) above the
          // keyboard while the search field is focused.
          paddingBottom: Math.max(insets.bottom, 16) + keyboard.bottomInset,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-panelWidth, 0],
              }),
            },
          ],
          shadowColor: "#000000",
          shadowOffset: { width: 16, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 30,
          elevation: 24,
        }}
      >
        <View className="flex-row items-center px-5">
          <View
            className="h-11 w-11 items-center justify-center rounded-full border border-mint/40 bg-[#0A2A20]"
            style={glow}
          >
            <Brain size={18} color={colors.mint} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-inter-bold text-[19px] text-primary">Vault</Text>
            <Text className="mt-0.5 font-sans text-[10px] tracking-[1.5px] text-primary/50">
              {nodes.length} CATATAN TERSIMPAN
            </Text>
          </View>
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel="Tambah catatan"
            className="h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5"
          >
            <Plus size={17} color={colors.primary} />
          </Pressable>
        </View>

        <View className="mx-5 mt-4 flex-row items-center rounded-full border border-white/10 bg-black/25 px-3.5 py-2.5">
          <Search size={15} color={colors.secondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari catatan..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            className="ml-2 flex-1 font-sans text-[13px] text-primary"
            selectionColor={colors.mint}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Hapus pencarian">
              <X size={14} color={colors.secondary} />
            </Pressable>
          )}
        </View>

        <ScrollView
          className="mt-4 flex-1 px-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text className="mb-2 font-inter-medium text-[9px] tracking-[2px] text-primary/40">FOLDER</Text>
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                className={
                  active
                    ? "mb-1.5 flex-row items-center rounded-xl border border-mint/30 bg-mint/10 px-3 py-2.5"
                    : "mb-1.5 flex-row items-center rounded-xl border border-transparent px-3 py-2.5"
                }
              >
                <Folder size={16} color={active ? colors.mint : "rgba(255,255,255,0.65)"} />
                <Text
                  className={
                    active
                      ? "ml-2.5 flex-1 font-inter-semibold text-[12px] text-primary"
                      : "ml-2.5 flex-1 font-inter-medium text-[12px] text-primary/75"
                  }
                >
                  {item.label}
                </Text>
                <Text className="font-inter-medium text-[10px] text-primary/40">{counts[item.key]}</Text>
              </Pressable>
            );
          })}

          <View className="mb-2 mt-4 flex-row items-center justify-between">
            <Text className="font-inter-medium text-[9px] tracking-[2px] text-primary/40">FILE</Text>
            <Text className="font-sans text-[9px] text-primary/30">{filtered.length} item</Text>
          </View>

          {filtered.length === 0 ? (
            <View className="items-center rounded-2xl border border-white/10 bg-black/20 py-8">
              <FileText size={20} color="rgba(255,255,255,0.4)" />
              <Text className="mt-2 font-sans text-[11px] text-primary/50">
                {nodes.length === 0 ? "Vault masih kosong." : "Tidak ada catatan yang cocok."}
              </Text>
            </View>
          ) : (
            filtered.map((node) => {
              const Icon = nodeIcon(node);
              return (
                <View key={node.id} className="mb-1.5 flex-row items-center">
                  <Pressable
                    onPress={() => onOpenNode(node)}
                    className="flex-1 flex-row items-center rounded-xl px-2.5 py-2.5"
                    style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={"Buka " + node.title}
                  >
                    <View className="h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                      <Icon size={14} color={colors.primary} />
                    </View>
                    <View className="ml-2.5 flex-1">
                      <Text numberOfLines={1} className="font-inter-medium text-[12px] text-primary/90">
                        {node.title}
                      </Text>
                      <Text className="mt-0.5 font-sans text-[9px] uppercase tracking-wide text-primary/35">
                        {node.type}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => onManageNode(node)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={"Kelola " + node.title}
                    className="h-8 w-8 items-center justify-center rounded-lg"
                  >
                    <MoreVertical size={15} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                </View>
              );
            })
          )}
          <View className="h-6" />
        </ScrollView>

        <View className="border-t border-white/10 px-5 pt-3">
          <Pressable
            onPress={openSettings}
            className="flex-row items-center rounded-xl py-2.5"
            accessibilityRole="button"
          >
            <View className="h-8 w-8 items-center justify-center rounded-lg bg-white/5">
              <Settings size={15} color={colors.primary} />
            </View>
            <Text className="ml-3 flex-1 font-inter-medium text-[12px] text-primary/85">Pengaturan</Text>
            <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
          </Pressable>
          <View className="mt-1 flex-row items-center rounded-xl px-1 py-2">
            <Moon size={14} color={colors.mint} />
            <Text className="ml-3 flex-1 font-sans text-[11px] text-primary/60">Dark mode</Text>
            <View className="rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5">
              <Text className="font-inter-semibold text-[8px] tracking-wide text-mint">AKTIF</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}