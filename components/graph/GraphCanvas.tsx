import { Brain, Minus, Plus, RotateCcw } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

import { colors, glowStrong } from "@/constants/theme";
import type { GraphEdge, GraphNode } from "@/types/models";
import { resolveNodePosition } from "@/utils/graphLayout";
import { GraphEdges } from "./GraphEdges";
import { GraphNode as GraphNodeBubble } from "./GraphNode";

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedNodeIds?: string[];
  previewMode?: boolean;
  onPressNode: (node: GraphNode) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
}

export function GraphCanvas({
  nodes,
  edges,
  highlightedNodeIds = [],
  previewMode = false,
  onPressNode,
  onMoveNode,
}: GraphCanvasProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const panRef = useRef(pan);
  panRef.current = pan;
  const panStart = useRef({ x: 0, y: 0 });

  const backgroundResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
        onPanResponderGrant: () => {
          panStart.current = panRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          setPan({
            x: panStart.current.x + gesture.dx,
            y: panStart.current.y + gesture.dy,
          });
        },
      }),
    [],
  );

  const centerX = size.width / 2;
  const centerY = size.height / 2;

  // Nodes must stay inside the visible canvas: keep clear of the floating tab
  // bar at the bottom and of the screen edges (bubble is 60px wide, labels up
  // to 100px), otherwise a node can be dropped somewhere impossible to tap.
  const limitRadius = Math.max(96, Math.min(size.width / 2 - 56, size.height / 2 - 104));

  const handleMove = (id: string, x: number, y: number) => {
    const others = nodes.filter((node) => node.id !== id);
    const resolved = resolveNodePosition({ x, y }, others, limitRadius / scale);
    onMoveNode(id, resolved.x, resolved.y);
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setScale(1);
  };

  return (
    <View
      className="flex-1 overflow-hidden"
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      {...backgroundResponder.panHandlers}
    >
      {size.width > 0 && (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none" width={size.width} height={size.height}>
          <Defs>
            <Pattern id="dot-grid" width={44} height={44} patternUnits="userSpaceOnUse">
              <Circle cx={2} cy={2} r={1} fill="rgba(255,255,255,0.09)" />
            </Pattern>
          </Defs>
          <Rect width={size.width} height={size.height} fill="url(#dot-grid)" />
        </Svg>
      )}

      <View
        className="absolute rounded-full bg-mint/5"
        style={{ left: centerX - 165 + pan.x, top: centerY - 165 + pan.y, width: 330, height: 330 }}
      />

      {size.width > 0 && (
        <GraphEdges
          nodes={nodes}
          edges={edges}
          centerX={centerX}
          centerY={centerY}
          pan={pan}
          scale={scale}
        />
      )}

      <View
        className="absolute items-center justify-center rounded-full border border-mint/50 bg-[#071F17]"
        style={[
          {
            left: centerX + pan.x - 46,
            top: centerY + pan.y - 46,
            width: 92,
            height: 92,
            transform: [{ scale }],
          },
          glowStrong,
        ]}
        pointerEvents="none"
      >
        <View className="h-[68px] w-[68px] items-center justify-center rounded-full border border-mint/25 bg-[#0B2A20]">
          <Brain size={30} color={colors.mint} strokeWidth={1.6} />
        </View>
      </View>

      <View
        className="absolute items-center"
        style={{ left: centerX + pan.x - 70, top: centerY + pan.y + 46 * scale + 4, width: 140 }}
        pointerEvents="none"
      >
        <Text className="font-inter-bold text-[13px] tracking-wide text-primary">Kosaa</Text>
        <Text className="mt-0.5 font-inter-medium text-[8px] tracking-[2px] text-mint/70">
          SECOND BRAIN
        </Text>
      </View>

      {nodes.map((node) => (
        <GraphNodeBubble
          key={node.id}
          node={node}
          scale={scale}
          preview={highlightedNodeIds.includes(node.id)}
          screenX={centerX + pan.x + node.x * scale}
          screenY={centerY + pan.y + node.y * scale}
          center={{ x: centerX + pan.x, y: centerY + pan.y }}
          limitRadius={limitRadius}
          onPress={onPressNode}
          onMove={handleMove}
        />
      ))}

      {nodes.length === 0 && size.width > 0 && (
        <View
          className="absolute items-center px-8"
          style={{ left: 0, right: 0, top: centerY + 110 }}
          pointerEvents="none"
        >
          <Text className="text-center font-inter-medium text-[12px] text-secondary">
            Belum ada catatan. Ketuk + untuk mulai membangun Second Brain-mu.
          </Text>
        </View>
      )}

      <View
        className="absolute"
        style={{ bottom: 116, left: previewMode ? 16 : undefined, right: previewMode ? undefined : 20 }}
      >
        <View className="items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Perbesar graph"
            onPress={() => setScale((value) => Math.min(1.8, Math.round((value + 0.1) * 10) / 10))}
            className="h-9 w-9 items-center justify-center rounded-full border border-subtle bg-[#121212]/90"
          >
            <Plus size={17} color={colors.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Perkecil graph"
            onPress={() => setScale((value) => Math.max(0.6, Math.round((value - 0.1) * 10) / 10))}
            className="h-9 w-9 items-center justify-center rounded-full border border-subtle bg-[#121212]/90"
          >
            <Minus size={17} color={colors.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset tampilan graph"
            onPress={resetView}
            className="h-9 w-9 items-center justify-center rounded-full border border-subtle bg-[#121212]/90"
          >
            <RotateCcw size={15} color={colors.secondary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}