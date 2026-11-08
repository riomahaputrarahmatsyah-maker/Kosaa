import type { GraphNode } from "@/types/models";

/** Smallest distance between two node centres so bubbles and labels never stack. */
export const NODE_MIN_DISTANCE = 108;

/** Radius around the central Kosaa brain (and its label) that always stays clear. */
export const BRAIN_CLEARANCE = 110;

/** Radius (graph units) that still fits on a phone screen without panning. */
export const GRAPH_SAFE_RADIUS = 148;

export interface NodePosition {
  x: number;
  y: number;
}

type Point = Pick<GraphNode, "x" | "y">;

function round(position: NodePosition): NodePosition {
  return { x: Math.round(position.x), y: Math.round(position.y) };
}

/** A spot is usable when it is clear of the brain, of every other node, and in range. */
function isFree(
  x: number,
  y: number,
  others: Point[],
  minDistance: number,
  maxRadius?: number,
): boolean {
  if (Math.hypot(x, y) < BRAIN_CLEARANCE) return false;
  if (maxRadius !== undefined && Math.hypot(x, y) > maxRadius) return false;
  return others.every((other) => Math.hypot(other.x - x, other.y - y) >= minDistance);
}

/**
 * Finds a free spot on concentric rings: first around `origin`, then growing
 * outwards until `searchRadius`. Returns null when nothing is free.
 */
function searchAround(
  origin: NodePosition,
  others: Point[],
  minDistance: number,
  searchRadius: number,
  maxRadius?: number,
): NodePosition | null {
  const step = Math.max(8, Math.round(minDistance / 6));
  for (let radius = minDistance; radius <= searchRadius; radius += step) {
    // floor() keeps the angular gap between slots at least one node wide.
    const slots = Math.max(6, Math.floor((2 * Math.PI * radius) / minDistance));
    const offset = radius * 0.11;
    for (let slot = 0; slot < slots; slot += 1) {
      const angle = (slot * 2 * Math.PI) / slots + offset;
      const x = origin.x + Math.cos(angle) * radius;
      const y = origin.y + Math.sin(angle) * radius;
      if (isFree(x, y, others, minDistance, maxRadius)) return { x, y };
    }
  }
  return null;
}

/**
 * Moves a dragged (or generated) position to the nearest free spot instead of
 * letting it sit on top of another node. Bounded by `maxRadius` when the caller
 * knows the visible canvas.
 */
export function resolveNodePosition(
  candidate: NodePosition,
  others: Point[],
  maxRadius?: number,
  minDistance: number = NODE_MIN_DISTANCE,
): NodePosition {
  let startX = candidate.x;
  let startY = candidate.y;

  // Pull an out-of-range drop back inside the visible canvas first, otherwise
  // the ring search would look for free space where the node cannot be seen.
  const distance = Math.hypot(startX, startY);
  if (maxRadius !== undefined && distance > maxRadius) {
    startX = (startX / distance) * maxRadius;
    startY = (startY / distance) * maxRadius;
  } else if (distance < BRAIN_CLEARANCE) {
    const angle = distance < 0.01 ? -Math.PI / 2 : Math.atan2(startY, startX);
    startX = Math.cos(angle) * BRAIN_CLEARANCE;
    startY = Math.sin(angle) * BRAIN_CLEARANCE;
  }

  if (isFree(candidate.x, candidate.y, others, minDistance, maxRadius)) return round(candidate);
  if (isFree(startX, startY, others, minDistance, maxRadius)) return round({ x: startX, y: startY });

  const searchRadius = maxRadius === undefined ? 620 : maxRadius * 2;
  const spot = searchAround({ x: startX, y: startY }, others, minDistance, searchRadius, maxRadius);
  return round(spot ?? { x: startX, y: startY });
}

/** Golden-angle placement used when the visible rings are all taken. */
export function nodePositionForIndex(existingCount: number): NodePosition {
  const angle = -Math.PI / 2 + existingCount * 2.399963;
  const ring = Math.floor(existingCount / 7);
  const radius = 118 + ring * 30;
  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius),
  };
}

export function childPositionForParent(parent: Point, siblingCount: number): NodePosition {
  const angle = -Math.PI / 2 + siblingCount * 1.15;
  const radius = 112;
  return {
    x: Math.round(parent.x + Math.cos(angle) * radius),
    y: Math.round(parent.y + Math.sin(angle) * radius),
  };
}

export function positionForNewNode(nodes: GraphNode[], parentId: string | null): NodePosition {
  if (parentId) {
    const parent = nodes.find((node) => node.id === parentId);
    if (parent) {
      const siblings = nodes.filter((node) => node.parentId === parentId).length;
      return resolveNodePosition(childPositionForParent(parent, siblings), nodes);
    }
  }

  // Keep new top-level notes where they can be seen and tapped.
  const spot =
    searchAround({ x: 0, y: 0 }, nodes, NODE_MIN_DISTANCE, GRAPH_SAFE_RADIUS) ??
    searchAround({ x: 0, y: 0 }, nodes, NODE_MIN_DISTANCE, 620);

  if (spot) return round(spot);

  const topLevel = nodes.filter((node) => !node.parentId).length;
  return resolveNodePosition(nodePositionForIndex(topLevel), nodes);
}
