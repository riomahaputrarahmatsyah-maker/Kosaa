export type NodeType = "md" | "pdf" | "image" | "file";

export type ChatRole = "user" | "assistant";

export interface GraphNode {
  id: string;
  title: string;
  type: NodeType;
  filePath: string;
  mimeType: string;
  parentId: string | null;
  x: number;
  y: number;
  /** In-memory markdown body. Persisted to the vault on approval or manual save. */
  content?: string;
  createdAt: number;
  updatedAt: number;
}

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  createdAt: number;
}

export interface Schedule {
  id: string;
  title: string;
  date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_completed: number;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

export interface Snapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  schedules: Schedule[];
}

export type ChangedScreen = "graph" | "calendar";

export interface PendingChange {
  snapshot: Snapshot;
  summary: string;
  changedScreens: ChangedScreen[];
  changedNodeIds: string[];
  changedScheduleIds: string[];
}

export interface AiDraft {
  nodes: GraphNode[];
  edges: GraphEdge[];
  schedules: Schedule[];
  summaries: string[];
  changedScreens: ChangedScreen[];
  changedNodeIds: string[];
  changedScheduleIds: string[];
}

export interface UserProfile {
  name: string;
  personality: string;
  agentEnabled: boolean;
}
