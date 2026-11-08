import type { GraphEdge, GraphNode, Schedule } from "@/types/models";
import { getDatabase } from "./sqlite";

/** One transaction for approval: graph and calendar are saved together or not at all. */
export async function replaceBrain(
  nodes: GraphNode[],
  edges: GraphEdge[],
  schedules: Schedule[],
): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync("DELETE FROM edges; DELETE FROM nodes; DELETE FROM schedules;");

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

    for (const schedule of schedules) {
      await txn.runAsync(
        `INSERT INTO schedules (id, title, date, end_date, start_time, end_time, is_completed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schedule.id,
          schedule.title,
          schedule.date,
          schedule.end_date,
          schedule.start_time,
          schedule.end_time,
          schedule.is_completed,
          schedule.createdAt,
        ],
      );
    }
  });
}
