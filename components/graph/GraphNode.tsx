import { File, FileImage, FileText, FileType2 } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { PanResponder, Text, View } from "react-native";

import { colors, glow, glowStrong } from "@/constants/theme";
import type { GraphNode as GraphNodeModel } from "@/types/models";

const BUBBLE = 60;

interface GraphNodeProps {
  node: GraphNodeModel;
  screenX: number;
  screenY: number;
  scale: number;
  preview?: boolean;
  /** Centre of the graph on screen, used to keep dragged nodes inside the canvas. */
  center: { x: number; y: number };
  /** Maximum distance (screen px) from the centre a node may be dragged. */
  limitRadius: number;
  onPress: (node: GraphNodeModel) => void;
  onMove: (id: string, x: number, y: number) => void;
}

export function GraphNode({
  node,
  screenX,
  screenY,
  scale,
  preview = false,
  center,
  limitRadius,
  onPress,
  onMove,
}: GraphNodeProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

  const responder = useMemo(() => {
    /**
     * Keeps the dragged bubble inside the visible canvas so it can never be
     * dropped underneath the tab bar or past the screen edge where it would be
     * impossible to grab again.
     */
    const clampOffset = (dx: number, dy: number) => {
      const startDistance = Math.hypot(screenX - center.x, screenY - center.y);
      // A node parked outside the canvas (huge vault, or zoomed out) must stay
      // grabbable: do not snap it towards the middle when the drag starts.
      if (startDistance > limitRadius + 1) return { x: dx, y: dy };

      const relativeX = screenX + dx - center.x;
      const relativeY = screenY + dy - center.y;
      const distance = Math.hypot(relativeX, relativeY);
      if (distance <= limitRadius || distance === 0) return { x: dx, y: dy };
      const ratio = limitRadius / distance;
      return {
        x: relativeX * ratio + center.x - screenX,
        y: relativeY * ratio + center.y - screenY,
      };
    };

    const applyOffset = (next: { x: number; y: number }) => {
      offsetRef.current = next;
      setOffset(next);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        dragging.current = false;
        applyOffset({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6) dragging.current = true;
        if (dragging.current) applyOffset(clampOffset(gesture.dx, gesture.dy));
      },
      onPanResponderRelease: () => {
        if (dragging.current) {
          const applied = offsetRef.current;
          onMove(node.id, node.x + applied.x / scale, node.y + applied.y / scale);
        } else {
          onPress(node);
        }
        applyOffset({ x: 0, y: 0 });
        dragging.current = false;
      },
      onPanResponderTerminate: () => {
        applyOffset({ x: 0, y: 0 });
        dragging.current = false;
      },
    });
  }, [center.x, center.y, limitRadius, node, onMove, onPress, scale, screenX, screenY]);

  const Icon = node.type === "pdf" ? FileType2 : node.type === "image" ? FileImage : node.type === "file" ? File : FileText;

  return (
    <View
      {...responder.panHandlers}
      className="absolute items-center"
      style={{ left: screenX + offset.x - 50, top: screenY + offset.y - BUBBLE / 2, width: 100, zIndex: preview ? 5 : 1 }}
    >
      <View
        className="items-center justify-center rounded-full border bg-[#141414]"
        style={[
          {
            width: BUBBLE,
            height: BUBBLE,
            borderColor: preview ? "rgba(16,185,129,0.9)" : "rgba(255,255,255,0.25)",
          },
          preview && glowStrong,
        ]}
      >
        <Icon size={20} color={preview ? colors.mint : colors.primary} strokeWidth={1.6} />
        <View className="mt-1 h-1 w-1 rounded-full" style={{ backgroundColor: preview ? colors.mint : "rgba(16,185,129,0.8)" }} />
      </View>
      {preview && (
        <View className="absolute right-1 top-0 rounded-full bg-mint px-1.5 py-0.5" style={glow}>
          <Text className="font-inter-bold text-[7px] tracking-wide text-[#04140E]">AI</Text>
        </View>
      )}
      <Text
        numberOfLines={1}
        className="mt-1.5 max-w-[92px] text-center font-inter-medium text-[10px] text-primary/85"
      >
        {node.title}
      </Text>
    </View>
  );
}
