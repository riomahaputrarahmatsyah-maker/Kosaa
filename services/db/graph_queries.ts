import type { GraphEdge, GraphNode, NodeType } from "@/types/models";
import { getDatabase } from "./sqlite";

interface NodeRow {
  id: string;
  title: string;
  type: string;
  file_path: string;
  x: number;
  y: number;
  parent_id: string | null;
  mime_type: string;
  created_at: number;
  updated_at: number;
}

interface EdgeRow {
  id: string;
  source_id: string;
  target_id: string;
  created_at: number;
}

function mapNode(row: NodeRow): GraphNode {
  return {
    id: row.id,
    title: row.title,
    type: row.type as NodeType,
    filePath: row.file_path,
    x: row.x,
    y: row.y,
    parentId: row.parent_id ?? null,
    mimeType: row.mime_type ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEdge(row: EdgeRow): GraphEdge {
  return {
    id: row.id,
    source_id: row.source_id,
    target_id: row.target_id,
    createdAt: row.created_at,
  };
}

export async function fetchGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const db = await getDatabase();
  const [nodeRows, edgeRows] = await Promise.all([
    db.getAllAsync<NodeRow>("SELECT * FROM nodes ORDER BY created_at ASC"),
    db.getAllAsync<EdgeRow>("SELECT * FROM edges ORDER BY created_at ASC"),
  ]);
  return { nodes: nodeRows.map(mapNode), edges: edgeRows.map(mapEdge) };
}

export async function insertNode(node: GraphNode): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO nodes (id, title, type, file_path, x, y, parent_id, mime_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      node.id,
      node.title,
      node.type,
      node.filePath,
      node.x,
      node.y,
      node.parentId,
      node.mimeType,
      node.createdAt,
      node.updatedAt,
    ],
  );
}

export async function updateNodeRow(node: GraphNode): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE nodes
     SET title = ?, type = ?, file_path = ?, x = ?, y = ?, parent_id = ?, mime_type = ?, updated_at = ?
     WHERE id = ?`,
    [
      node.title,
      node.type,
      node.filePath,
      node.x,
      node.y,
      node.parentId,
      node.mimeType,
      node.updatedAt,
      node.id,
    ],
  );
}

export async function updateNodePositionRow(id: string, x: number, y: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE nodes SET x = ?, y = ?, updated_at = ? WHERE id = ?", [x, y, Date.now(), id]);
}

export async function promoteChildrenRow(parentId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE nodes SET parent_id = NULL, updated_at = ? WHERE parent_id = ?", [
    Date.now(),
    parentId,
  ]);
}

export async function deleteNodeRow(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM nodes WHERE id = ?", [id]);
}

export async function insertEdge(edge: GraphEdge): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT OR IGNORE INTO edges (id, source_id, target_id, created_at) VALUES (?, ?, ?, ?)",
    [edge.id, edge.source_id, edge.target_id, edge.createdAt],
  );
}

export async function deleteEdgeRow(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM edges WHERE id = ?", [id]);
}

/** Atomically mirrors the in-memory working copy into SQLite after user approval. */
export async function replaceGraph(nodes: GraphNode[], edges: GraphEdge[]): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync("DELETE FROM edges; DELETE FROM nodes;");
    for (const node of nodes) {
      await txn.runAsync(
        `INSERT INTO nodes (id, title, type, file_path, x, y, parent_id, mime_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          node.id,
          node.title,
          node.type,
          node.filePath,
          node.x,
          node.y,
          node.parentId,
          node.mimeType,
          node.createdAt,
          node.updatedAt,
        ],
      );
    }
    for (const edge of edges) {
      await txn.runAsync(
        "INSERT OR IGNORE INTO edges (id, source_id, target_id, created_at) VALUES (?, ?, ?, ?)",
        [edge.id, edge.source_id, edge.target_id, edge.createdAt],
      );
    }
  });
}
