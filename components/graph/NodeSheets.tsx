import * as DocumentPicker from "expo-document-picker";
import {
  BookOpen,
  Check,
  ExternalLink,
  File,
  FileImage,
  FileText,
  FileType2,
  Link2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, glow } from "@/constants/theme";
import { attachmentFileName, openNodeAttachment } from "@/services/file/fileManager";
import type { AttachmentInput } from "@/store/useAppStore";
import { useAppStore } from "@/store/useAppStore";
import type { GraphEdge, GraphNode } from "@/types/models";
import { shortDateLabel, toDateKey } from "@/utils/date";
import { attachmentTitle } from "@/utils/text";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { GlowIconButton } from "@/components/ui/GlowIconButton";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";

function nodeIcon(node: GraphNode) {
  if (node.type === "pdf") return FileType2;
  if (node.type === "image") return FileImage;
  if (node.type === "file") return File;
  return FileText;
}

function typeLabel(node: GraphNode): string {
  if (node.type === "pdf") return "PDF";
  if (node.type === "image") return "Gambar";
  if (node.type === "file") return "File";
  return "Markdown";
}

function parentLabel(node: GraphNode, nodes: GraphNode[]): string {
  if (!node.parentId) return "Node utama";
  return "Subnode dari " + (nodes.find((item) => item.id === node.parentId)?.title ?? "node utama");
}

/* ------------------------------- Action sheet ------------------------------ */

interface ActionSheetProps {
  node: GraphNode | null;
  linkCount: number;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onLink: () => void;
  onDelete: () => void;
}

export function NodeActionSheet({ node, linkCount, onClose, onView, onEdit, onLink, onDelete }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  if (!node) return null;
  const Icon = nodeIcon(node);

  const action = (
    label: string,
    caption: string,
    icon: typeof BookOpen,
    onPress: () => void,
    danger = false,
  ) => {
    const ItemIcon = icon;
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className="mb-2 flex-row items-center rounded-2xl border border-subtle bg-[#171717] px-4 py-3.5"
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        <View
          className={
            danger
              ? "h-9 w-9 items-center justify-center rounded-full bg-danger/10"
              : "h-9 w-9 items-center justify-center rounded-full bg-mint/10"
          }
        >
          <ItemIcon size={17} color={danger ? colors.danger : colors.mint} />
        </View>
        <View className="ml-3 flex-1">
          <Text className={danger ? "font-inter-semibold text-[14px] text-danger" : "font-inter-semibold text-[14px] text-primary"}>
            {label}
          </Text>
          <Text className="mt-0.5 font-sans text-[11px] text-secondary">{caption}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end bg-black/65">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Tutup menu catatan" />
        <View
          className="rounded-t-[30px] border-t border-subtle bg-[#111111] px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          <View className="mb-5 h-1 w-10 self-center rounded-full bg-white/15" />
          <View className="mb-4 flex-row items-center">
            <View
              className="h-12 w-12 items-center justify-center rounded-full border border-mint/30 bg-mint/10"
              style={glow}
            >
              <Icon size={20} color={colors.mint} />
            </View>
            <View className="ml-3 flex-1">
              <Text numberOfLines={1} className="font-inter-bold text-[17px] text-primary">
                {node.title}
              </Text>
              <Text className="mt-0.5 font-sans text-[11px] text-secondary">
                {typeLabel(node)} · {linkCount} tautan · {shortDateLabel(toDateKey(new Date(node.updatedAt)))}
              </Text>
            </View>
            <GlowIconButton icon={X} onPress={onClose} accessibilityLabel="Tutup" size={36} iconSize={16} />
          </View>

          {action("Buka catatan", "Baca isi catatan dan lampiran", BookOpen, onView)}
          {action("Edit catatan", "Ubah judul, isi, atau posisi node", Pencil, onEdit)}
          {action("Tautkan", "Hubungkan ke catatan lain", Link2, onLink)}
          {action("Hapus", "Hilangkan dari graph, file tetap aman", Trash2, onDelete, true)}
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------- Editor sheet ------------------------------ */

interface EditorProps {
  visible: boolean;
  node: GraphNode | null;
  nodes: GraphNode[];
  onClose: () => void;
  onSave: (
    title: string,
    content: string,
    parentId: string | null,
    attachment: AttachmentInput | null,
  ) => Promise<void>;
}

export function NodeEditorSheet({ visible, node, nodes, onClose, onSave }: EditorProps) {
  const getNodeContent = useAppStore((state) => state.getNodeContent);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [subnode, setSubnode] = useState(false);
  const [attachment, setAttachment] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const mainNodes = useMemo(
    () => nodes.filter((item) => !item.parentId && item.id !== node?.id),
    [node?.id, nodes],
  );
  const hasChildren = useMemo(
    () => (node ? nodes.some((item) => item.parentId === node.id) : false),
    [node, nodes],
  );

  useEffect(() => {
    if (!visible) return;
    setTitle(node?.title ?? "");
    setContent("");
    setAttachment(null);
    const initialParent = node?.parentId ?? null;
    setParentId(initialParent);
    setSubnode(Boolean(initialParent));
    if (!node) return;
    let active = true;
    setLoading(true);
    getNodeContent(node.id)
      .then((value) => {
        if (active) setContent(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [visible, node, getNodeContent]);

  const chooseMain = () => {
    setSubnode(false);
    setParentId(null);
  };

  const chooseSubnode = () => {
    if (hasChildren) return;
    setSubnode(true);
    setParentId((current) => current ?? mainNodes[0]?.id ?? null);
  };

  const pickAttachment = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        // Expo Go's DocumentPicker cache copy is unreadable on some Android
        // devices. Keep the content:// URI and copy it ourselves via the
        // ContentResolver-compatible legacy API.
        copyToCacheDirectory: false,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];
      if ((asset.mimeType ?? "").startsWith("audio/")) {
        Alert.alert("Audio belum didukung", "Saat ini lampiran yang didukung adalah PDF, gambar, dan file dokumen lain.");
        return;
      }
      setAttachment(asset);
      if (!title.trim()) {
        const mime = asset.mimeType ?? "";
        const kind = mime.startsWith("image/")
          ? "image"
          : mime === "application/pdf" || /\.pdf$/i.test(asset.name)
            ? "pdf"
            : "file";
        setTitle(attachmentTitle(asset.name, kind));
      }
    } catch (error) {
      Alert.alert("Gagal memilih file", error instanceof Error ? error.message : "Coba lagi.");
    }
  };

  const save = async () => {
    if (!title.trim() || saving) return;
    if (subnode && !parentId) {
      Alert.alert("Pilih node utama", "Subnode harus memiliki node utama sebagai induk.");
      return;
    }
    setSaving(true);
    try {
      await onSave(title.trim(), content, subnode ? parentId : null, attachment);
    } finally {
      setSaving(false);
    }
  };

  // The sheet is anchored to the bottom of the window, so it has to move up by
  // the keyboard height and shrink its scroll area; otherwise the save buttons
  // and the last fields end up behind the keyboard.
  const sheetMaxHeight =
    keyboard.layoutHeight > 0
      ? Math.max(
          260,
          Math.min(
            Math.round(keyboard.layoutHeight * 0.92),
            keyboard.layoutHeight - keyboard.bottomInset - 8,
          ),
        )
      : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end bg-black/65" onLayout={keyboard.onLayout}>
        <View
          className="rounded-t-[30px] border-t border-subtle bg-[#111111] px-5 pt-3"
          style={{
            maxHeight: sheetMaxHeight,
            marginBottom: keyboard.bottomInset,
            paddingBottom: keyboard.keyboardVisible ? 14 : Math.max(insets.bottom, 18),
          }}
        >
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-white/15" />
          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text className="font-inter-bold text-[18px] text-primary">
                {node ? "Edit catatan" : "Catatan baru"}
              </Text>
              <Text className="mt-0.5 font-sans text-[11px] text-secondary">
                {node ? "Perubahan langsung disimpan ke vault." : "Disimpan sebagai file .md di vault."}
              </Text>
            </View>
            <GlowIconButton icon={X} onPress={onClose} accessibilityLabel="Tutup editor" size={36} iconSize={16} />
          </View>

          <ScrollView
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text className="mb-1.5 font-inter-medium text-[11px] tracking-wide text-secondary">JUDUL</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Misal: Ide aplikasi es krim"
              placeholderTextColor="#5A5A61"
              className="mb-4 rounded-2xl border border-subtle bg-[#0B0B0B] px-4 py-3 font-inter-medium text-[14px] text-primary"
              selectionColor={colors.mint}
              maxLength={120}
            />

            <Text className="mb-1.5 font-inter-medium text-[11px] tracking-wide text-secondary">POSISI NODE</Text>
            <View className="mb-2 flex-row gap-2">
              <Pressable
                onPress={chooseMain}
                className={
                  !subnode
                    ? "flex-1 items-center rounded-xl border border-mint/40 bg-mint/10 py-2.5"
                    : "flex-1 items-center rounded-xl border border-subtle bg-[#0B0B0B] py-2.5"
                }
              >
                <Text className={!subnode ? "font-inter-semibold text-[11px] text-mint" : "font-inter-medium text-[11px] text-secondary"}>
                  Utama
                </Text>
              </Pressable>
              <Pressable
                onPress={chooseSubnode}
                disabled={hasChildren || mainNodes.length === 0}
                className={
                  subnode
                    ? "flex-1 items-center rounded-xl border border-mint/40 bg-mint/10 py-2.5"
                    : "flex-1 items-center rounded-xl border border-subtle bg-[#0B0B0B] py-2.5"
                }
                style={{ opacity: hasChildren || mainNodes.length === 0 ? 0.45 : 1 }}
              >
                <Text className={subnode ? "font-inter-semibold text-[11px] text-mint" : "font-inter-medium text-[11px] text-secondary"}>
                  Subnode
                </Text>
              </Pressable>
            </View>
            {hasChildren ? (
              <Text className="mb-3 font-sans text-[10px] text-warning">
                Catatan ini punya subnode, jadi tetap menjadi node utama.
              </Text>
            ) : subnode ? (
              mainNodes.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                  <View className="flex-row gap-2">
                    {mainNodes.map((main) => (
                      <Pressable
                        key={main.id}
                        onPress={() => setParentId(main.id)}
                        className={
                          parentId === main.id
                            ? "rounded-full border border-mint/40 bg-mint/10 px-3 py-1.5"
                            : "rounded-full border border-subtle bg-white/5 px-3 py-1.5"
                        }
                      >
                        <Text
                          numberOfLines={1}
                          className={
                            parentId === main.id
                              ? "max-w-[160px] font-inter-semibold text-[10px] text-mint"
                              : "max-w-[160px] font-inter-medium text-[10px] text-secondary"
                          }
                        >
                          {main.title}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <Text className="mb-3 font-sans text-[10px] text-warning">
                  Belum ada node utama. Buat node utama dulu.
                </Text>
              )
            ) : (
              <Text className="mb-3 font-sans text-[10px] text-secondary/70">
                Node utama terhubung langsung ke otak Kosaa.
              </Text>
            )}

            <View className="mb-1.5 flex-row items-center justify-between">
              <Text className="font-inter-medium text-[11px] tracking-wide text-secondary">ISI CATATAN</Text>
              {loading && <ActivityIndicator size="small" color={colors.mint} />}
            </View>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Tulis markdown di sini..."
              placeholderTextColor="#5A5A61"
              multiline
              textAlignVertical="top"
              className="min-h-[170px] rounded-2xl border border-subtle bg-[#0B0B0B] px-4 py-3 font-sans text-[14px] leading-6 text-primary"
              selectionColor={colors.mint}
            />

            {!node && (
              <View className="mt-4">
                <Text className="mb-1.5 font-inter-medium text-[11px] tracking-wide text-secondary">
                  LAMPIRAN (OPSIONAL)
                </Text>
                {attachment ? (
                  <View className="flex-row items-center rounded-2xl border border-mint/25 bg-mint/5 px-3 py-2.5">
                    <FileText size={16} color={colors.mint} />
                    <Text numberOfLines={1} className="ml-2 flex-1 font-inter-medium text-[11px] text-primary">
                      {attachment.name}
                    </Text>
                    <Pressable onPress={() => setAttachment(null)} hitSlop={8} accessibilityLabel="Hapus lampiran">
                      <X size={15} color={colors.secondary} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={pickAttachment}
                    className="flex-row items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.02] py-3"
                  >
                    <Plus size={14} color={colors.mint} />
                    <Text className="ml-2 font-inter-medium text-[11px] text-primary/80">
                      Pilih PDF, gambar, atau file lain
                    </Text>
                  </Pressable>
                )}
                <Text className="mt-1.5 font-sans text-[9px] leading-4 text-secondary/60">
                  Konversi PDF ke .md sedang disiapkan (coming soon). PDF, gambar, dan file lain tetap
                  tersimpan sebagai lampiran dan bisa dibuka dari catatan.
                </Text>
              </View>
            )}

            {node && node.type !== "md" && (
              <View className="mt-4 flex-row items-center rounded-2xl border border-subtle bg-[#0B0B0B] px-3 py-2.5">
                <FileText size={14} color={colors.secondary} />
                <Text className="ml-2 flex-1 font-sans text-[10px] text-secondary">
                  Lampiran {attachmentFileName(node)} tetap tersimpan.
                </Text>
              </View>
            )}
          </ScrollView>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="flex-1 items-center rounded-2xl border border-subtle bg-[#1A1A1A] py-3.5"
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text className="font-inter-medium text-[13px] text-secondary">Batal</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={!title.trim() || saving}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-mint py-3.5"
              style={({ pressed }) => [{ opacity: pressed || !title.trim() || saving ? 0.6 : 1 }]}
            >
              {saving && <ActivityIndicator size="small" color="#04140E" />}
              <Text className="ml-2 font-inter-bold text-[13px] text-[#04140E]">
                {saving ? "Menyimpan" : "Simpan"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------- Viewer sheet ------------------------------ */

interface ViewerProps {
  visible: boolean;
  node: GraphNode | null;
  nodes: GraphNode[];
  onClose: () => void;
  onEdit: () => void;
}

export function NodeViewerSheet({ visible, node, nodes, onClose, onEdit }: ViewerProps) {
  const getNodeContent = useAppStore((state) => state.getNodeContent);
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const MAX_PREVIEW = 6000;

  useEffect(() => {
    if (!visible || !node) return;
    let active = true;
    setContent("");
    setShowFull(false);
    setOpening(false);
    setLoading(true);
    getNodeContent(node.id)
      .then((value) => {
        if (active) setContent(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [visible, node, getNodeContent]);

  if (!node) return null;
  const Icon = nodeIcon(node);
  const hasAttachment = node.type !== "md";
  const isLong = content.length > MAX_PREVIEW;
  const visibleContent = isLong && !showFull ? content.slice(0, MAX_PREVIEW) : content;

  const openAttachment = async () => {
    setOpening(true);
    try {
      await openNodeAttachment(node);
    } catch (error) {
      Alert.alert("Gagal membuka lampiran", error instanceof Error ? error.message : "Coba lagi.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end bg-black/65">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Tutup catatan" />
        <View
          className="max-h-[88%] rounded-t-[30px] border-t border-subtle bg-[#111111] px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-white/15" />
          <View className="mb-3 flex-row items-center">
            <View
              className="h-11 w-11 items-center justify-center rounded-full border border-mint/30 bg-mint/10"
              style={glow}
            >
              <Icon size={19} color={colors.mint} />
            </View>
            <View className="ml-3 flex-1">
              <Text numberOfLines={2} className="font-inter-bold text-[18px] leading-6 text-primary">
                {node.title}
              </Text>
              <Text className="mt-0.5 font-sans text-[11px] text-secondary">
                {typeLabel(node)} · {parentLabel(node, nodes)}
              </Text>
            </View>
            <GlowIconButton icon={X} onPress={onClose} accessibilityLabel="Tutup" size={36} iconSize={16} />
          </View>

          <ScrollView className="max-h-[520px]" showsVerticalScrollIndicator={false}>
            {hasAttachment && (
              <View className="mb-3 overflow-hidden rounded-2xl border border-mint/20 bg-[#0B1F18]">
                {node.type === "image" ? (
                  <Image
                    source={{ uri: node.filePath }}
                    style={{ width: "100%", height: 170 }}
                    resizeMode="cover"
                    resizeMethod="resize"
                    resizeMultiplier={0.4}
                  />
                ) : (
                  <View className="items-center px-4 py-5">
                    <View className="h-12 w-12 items-center justify-center rounded-full border border-mint/25 bg-mint/5">
                      <Icon size={22} color={colors.mint} />
                    </View>
                  </View>
                )}
                <View className="flex-row items-center border-t border-white/10 px-4 py-3">
                  <FileText size={14} color={colors.secondary} />
                  <Text numberOfLines={1} className="ml-2 flex-1 font-inter-medium text-[10px] text-primary/80">
                    {attachmentFileName(node)}
                  </Text>
                  <Pressable
                    onPress={openAttachment}
                    disabled={opening}
                    className="flex-row items-center rounded-full border border-mint/30 bg-mint/10 px-3 py-1.5"
                  >
                    {opening ? (
                      <ActivityIndicator size="small" color={colors.mint} />
                    ) : (
                      <ExternalLink size={12} color={colors.mint} />
                    )}
                    <Text className="ml-1.5 font-inter-semibold text-[10px] text-mint">Buka</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {loading ? (
              <View className="items-center py-10">
                <ActivityIndicator color={colors.mint} />
              </View>
            ) : content.trim() ? (
              <View className="rounded-2xl border border-subtle bg-[#0C0C0C] px-4 py-4">
                <MarkdownText content={visibleContent} />
                {isLong && (
                  <View className="mt-3 border-t border-subtle pt-3">
                    <Text className="font-sans text-[10px] leading-4 text-secondary">
                      Pratinjau dipotong agar catatan lampiran tetap ringan.
                    </Text>
                    <Pressable
                      onPress={() => setShowFull((value) => !value)}
                      className="mt-2 self-start rounded-full border border-mint/30 bg-mint/10 px-3 py-1.5"
                    >
                      <Text className="font-inter-semibold text-[10px] text-mint">
                        {showFull ? "Tampilkan ringkas" : "Tampilkan semua (" + content.length + " karakter)"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              <View className="items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8">
                <Text className="font-inter-medium text-[13px] text-secondary">
                  {hasAttachment ? "Catatan pendamping masih kosong." : "Catatan ini masih kosong."}
                </Text>
              </View>
            )}
          </ScrollView>

          <Pressable
            onPress={onEdit}
            className="mt-4 flex-row items-center justify-center rounded-2xl border border-mint/30 bg-mint/10 py-3.5"
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Pencil size={15} color={colors.mint} />
            <Text className="ml-2 font-inter-semibold text-[13px] text-mint">Edit catatan</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------- Link sheet ------------------------------- */

interface LinkProps {
  visible: boolean;
  node: GraphNode | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onClose: () => void;
}

export function LinkNodesSheet({ visible, node, nodes, edges, onClose }: LinkProps) {
  const linkNodes = useAppStore((state) => state.linkNodes);
  const unlinkEdge = useAppStore((state) => state.unlinkEdge);
  const insets = useSafeAreaInsets();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!node) return null;
  const others = nodes.filter((item) => item.id !== node.id);

  const edgeFor = (otherId: string) =>
    edges.find(
      (edge) =>
        (edge.source_id === node.id && edge.target_id === otherId) ||
        (edge.target_id === node.id && edge.source_id === otherId),
    );

  const toggle = async (other: GraphNode) => {
    if (busyId) return;
    const edge = edgeFor(other.id);
    setBusyId(other.id);
    try {
      if (edge) {
        await unlinkEdge(edge.id);
      } else {
        await linkNodes(node.id, other.id);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end bg-black/65">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Tutup tautan" />
        <View
          className="max-h-[78%] rounded-t-[30px] border-t border-subtle bg-[#111111] px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 18) }}
        >
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-white/15" />
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="font-inter-bold text-[18px] text-primary">Tautkan catatan</Text>
            <GlowIconButton icon={X} onPress={onClose} accessibilityLabel="Tutup" size={36} iconSize={16} />
          </View>
          <Text numberOfLines={1} className="mb-4 font-sans text-[12px] text-secondary">
            Pilih catatan yang terhubung dengan “{node.title}”.
          </Text>

          {others.length === 0 ? (
            <View className="items-center rounded-2xl border border-subtle bg-[#0C0C0C] py-10">
              <Link2 size={22} color={colors.secondary} />
              <Text className="mt-2 font-sans text-[12px] text-secondary">
                Belum ada catatan lain untuk ditautkan.
              </Text>
            </View>
          ) : (
            <ScrollView className="max-h-[380px]" showsVerticalScrollIndicator={false}>
              {others.map((other) => {
                const edge = edgeFor(other.id);
                const Icon = nodeIcon(other);
                return (
                  <Pressable
                    key={other.id}
                    onPress={() => toggle(other)}
                    accessibilityRole="button"
                    className="mb-2 flex-row items-center rounded-2xl border border-subtle bg-[#171717] px-3.5 py-3"
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-white/5">
                      <Icon size={15} color={colors.primary} />
                    </View>
                    <Text numberOfLines={1} className="ml-3 flex-1 font-inter-medium text-[13px] text-primary">
                      {other.title}
                    </Text>
                    {busyId === other.id ? (
                      <ActivityIndicator size="small" color={colors.mint} />
                    ) : (
                      <View
                        className={
                          edge
                            ? "h-6 w-6 items-center justify-center rounded-full bg-mint"
                            : "h-6 w-6 items-center justify-center rounded-full border border-subtle bg-transparent"
                        }
                      >
                        {edge && <Check size={13} color="#04140E" strokeWidth={2.6} />}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}