import { LinearGradient } from "expo-linear-gradient";
import { Menu, Plus, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GraphCanvas } from "@/components/graph/GraphCanvas";
import {
  LinkNodesSheet,
  NodeActionSheet,
  NodeEditorSheet,
  NodeViewerSheet,
} from "@/components/graph/NodeSheets";
import { GlowIconButton } from "@/components/ui/GlowIconButton";
import { VaultDrawer } from "@/components/vault/VaultDrawer";
import { colors } from "@/constants/theme";
import { useAppStore, type AttachmentInput } from "@/store/useAppStore";
import type { GraphNode } from "@/types/models";

type Sheet = "actions" | "edit" | "view" | "link" | "create" | null;

export default function GraphScreen() {
  const nodes = useAppStore((state) => state.nodes);
  const edges = useAppStore((state) => state.edges);
  const drawerOpen = useAppStore((state) => state.drawerOpen);
  const setDrawerOpen = useAppStore((state) => state.setDrawerOpen);
  const pending = useAppStore((state) => state.pending);
  const createNote = useAppStore((state) => state.createNote);
  const createNoteWithAttachment = useAppStore((state) => state.createNoteWithAttachment);
  const updateNote = useAppStore((state) => state.updateNote);
  const deleteNote = useAppStore((state) => state.deleteNote);
  const moveNode = useAppStore((state) => state.moveNode);

  const [activeNode, setActiveNode] = useState<GraphNode | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);

  const openActions = (node: GraphNode) => {
    setActiveNode(node);
    setSheet("actions");
  };

  const openCreate = () => {
    setDrawerOpen(false);
    setActiveNode(null);
    setSheet("create");
  };

  const closeAll = () => {
    setSheet(null);
    setActiveNode(null);
  };

  const saveNote = async (
    title: string,
    content: string,
    parentId: string | null,
    attachment: AttachmentInput | null,
  ) => {
    try {
      if (sheet === "create") {
        if (attachment) {
          await createNoteWithAttachment(title, content, parentId, attachment);
        } else {
          await createNote(title, content, parentId);
        }
      } else if (activeNode) {
        await updateNote(activeNode.id, title, content, parentId);
      }
      closeAll();
    } catch (error) {
      Alert.alert("Gagal menyimpan", error instanceof Error ? error.message : "Coba lagi.");
    }
  };

  const confirmDelete = () => {
    if (!activeNode) return;
    const target = activeNode;
    Alert.alert(
      "Hapus catatan?",
      '"' + target.title + '" akan dihilangkan dari graph. File fisik dan lampiran tetap tersimpan di perangkat, dan subnode akan menjadi node utama.',
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNote(target.id);
              closeAll();
            } catch (error) {
              Alert.alert("Gagal menghapus", error instanceof Error ? error.message : "Coba lagi.");
            }
          },
        },
      ],
    );
  };

  const linkCount = activeNode
    ? edges.filter((edge) => edge.source_id === activeNode.id || edge.target_id === activeNode.id).length
    : 0;

  return (
    <View className="flex-1 bg-background">
      <LinearGradient
        colors={["rgba(16,185,129,0.14)", "rgba(10,10,10,0.02)", "rgba(10,10,10,0)"]}
        locations={[0, 0.55, 1]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, height: 300 }}
        pointerEvents="none"
      />

      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center px-5 pb-1 pt-2">
          <GlowIconButton
            icon={Menu}
            onPress={() => setDrawerOpen(true)}
            accessibilityLabel="Buka vault"
          />
          <View className="ml-3 flex-1">
            <Text className="font-inter-bold text-[21px] tracking-tight text-primary">Kosaa</Text>
            <Text className="mt-0.5 font-inter-medium text-[8px] tracking-[2.6px] text-mint/70">
              SECOND BRAIN
            </Text>
          </View>
          <View className="mr-2.5 flex-row items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-mint" />
            <Text className="font-inter-medium text-[10px] text-primary/70">{nodes.length} catatan</Text>
          </View>
          <GlowIconButton
            icon={Plus}
            onPress={openCreate}
            accessibilityLabel="Tambah catatan"
            active
            glowEffect
          />
        </View>

        {pending && pending.changedScreens.includes("graph") && (
          <View className="mx-5 mb-1 flex-row items-center rounded-2xl border border-mint/25 bg-mint/5 px-3 py-2">
            <Sparkles size={13} color={colors.mint} />
            <Text className="ml-2 flex-1 font-inter-semibold text-[10px] text-primary">
              Pratinjau AI · {pending.changedNodeIds.length} catatan berubah
            </Text>
            <Text className="font-sans text-[9px] text-mint">periksa node bertanda AI</Text>
          </View>
        )}

        <GraphCanvas
          nodes={nodes}
          edges={edges}
          highlightedNodeIds={pending?.changedNodeIds}
          previewMode={Boolean(pending)}
          onPressNode={openActions}
          onMoveNode={moveNode}
        />
      </SafeAreaView>

      <VaultDrawer
        visible={drawerOpen}
        nodes={nodes}
        onClose={() => setDrawerOpen(false)}
        onAdd={openCreate}
        onOpenNode={(node) => {
          setDrawerOpen(false);
          setActiveNode(node);
          setSheet("view");
        }}
        onManageNode={(node) => {
          setDrawerOpen(false);
          openActions(node);
        }}
      />

      <NodeActionSheet
        node={sheet === "actions" ? activeNode : null}
        linkCount={linkCount}
        onClose={closeAll}
        onView={() => setSheet("view")}
        onEdit={() => setSheet("edit")}
        onLink={() => setSheet("link")}
        onDelete={confirmDelete}
      />

      <NodeViewerSheet
        visible={sheet === "view"}
        node={activeNode}
        nodes={nodes}
        onClose={closeAll}
        onEdit={() => setSheet("edit")}
      />

      <NodeEditorSheet
        visible={sheet === "edit" || sheet === "create"}
        node={sheet === "edit" ? activeNode : null}
        nodes={nodes}
        onClose={closeAll}
        onSave={saveNote}
      />

      <LinkNodesSheet
        visible={sheet === "link"}
        node={activeNode}
        nodes={nodes}
        edges={edges}
        onClose={closeAll}
      />

      {!pending && (
        <View pointerEvents="none" className="absolute bottom-[100px] left-0 right-0 items-center">
          <Text className="font-sans text-[9px] tracking-[1.5px] text-white/20">
            {nodes.length > 0 ? "GESER UNTUK MENJELAJAH · TAP UNTUK MEMBUKA" : "LOCAL-FIRST · PRIVATE BY DESIGN"}
          </Text>
        </View>
      )}
    </View>
  );
}