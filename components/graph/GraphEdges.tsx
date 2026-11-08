import { StyleSheet } from "react-native";
import Svg, { Line } from "react-native-svg";

import type { GraphEdge, GraphNode } from "@/types/models";

interface GraphEdgesProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerX: number;
  centerY: number;
  pan: { x: number; y: number };
  scale: number;
}

export function GraphEdges({ nodes, edges, centerX, centerY, pan, scale }: GraphEdgesProps) {
  const positions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    positions.set(node.id, {
      x: centerX + pan.x + node.x * scale,
      y: centerY + pan.y + node.y * scale,
    });
  }
  const byId = new Map(nodes.map((node) => [node.id, node]));

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      {nodes.map((node) => {
        const position = positions.get(node.id);
        if (!position) return null;

        const parent = node.parentId ? byId.get(node.parentId) : undefined;
        const parentPosition = parent ? positions.get(parent.id) : undefined;
        const from = parentPosition ?? { x: centerX + pan.x, y: centerY + pan.y };

        return (
          <Line
            key={"hierarchy-" + node.id}
            x1={from.x}
            y1={from.y}
            x2={position.x}
            y2={position.y}
            stroke={parent ? "rgba(16,185,129,0.42)" : "rgba(16,185,129,0.18)"}
            strokeWidth={parent ? 1.4 : 1}
          />
        );
      })}
      {edges.map((edge) => {
        const source = positions.get(edge.source_id);
        const target = positions.get(edge.target_id);
        if (!source || !target) return null;
        return (
          <Line
            key={edge.id}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke="rgba(255,255,255,0.36)"
            strokeWidth={1.2}
          />
        );
      })}
    </Svg>
  );
}
