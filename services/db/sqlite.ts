import * as SQLite from "expo-sqlite";

const DB_NAME = "kosaa.db";
const SCHEMA_VERSION = 2;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const NODES_TABLE = `
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('md', 'pdf', 'image', 'file')),
  file_path TEXT NOT NULL,
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  parent_id TEXT,
  mime_type TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);
`;

const FULL_SCHEMA = `
${NODES_TABLE}

CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (source_id) REFERENCES nodes (id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES nodes (id) ON DELETE CASCADE,
  UNIQUE (source_id, target_id)
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  end_date TEXT NOT NULL DEFAULT '',
  start_time TEXT NOT NULL DEFAULT '',
  end_time TEXT NOT NULL DEFAULT '',
  is_completed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes (parent_id);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges (source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges (target_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules (date, end_date);
`;

async function migrate(db: SQLite.SQLiteDatabase, version: number): Promise<void> {
  if (version < 1) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(FULL_SCHEMA);
      await txn.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
    });
    return;
  }

  if (version < 2) {
    // Rebuild nodes to add parent_id/mime_type and allow generic "file" nodes.
    // Foreign keys must be disabled outside the transaction.
    await db.execAsync("PRAGMA foreign_keys = OFF;");
    try {
      await db.withExclusiveTransactionAsync(async (txn) => {
        await txn.execAsync(`
          CREATE TABLE nodes_v2 (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('md', 'pdf', 'image', 'file')),
            file_path TEXT NOT NULL,
            x REAL NOT NULL DEFAULT 0,
            y REAL NOT NULL DEFAULT 0,
            parent_id TEXT,
            mime_type TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL DEFAULT 0
          );

          INSERT INTO nodes_v2 (id, title, type, file_path, x, y, parent_id, mime_type, created_at, updated_at)
          SELECT id, title, type, file_path, x, y, NULL, '', created_at, updated_at FROM nodes;

          DROP TABLE nodes;
          ALTER TABLE nodes_v2 RENAME TO nodes;

          CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes (parent_id);
          CREATE INDEX IF NOT EXISTS idx_edges_source ON edges (source_id);
          CREATE INDEX IF NOT EXISTS idx_edges_target ON edges (target_id);

          ALTER TABLE schedules ADD COLUMN end_date TEXT NOT NULL DEFAULT '';
          CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules (date, end_date);

          PRAGMA user_version = ${SCHEMA_VERSION};
        `);
      });
    } finally {
      await db.execAsync("PRAGMA foreign_keys = ON;");
    }
  }
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const versionRow = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const version = versionRow?.user_version ?? 0;

  if (version < SCHEMA_VERSION) {
    await migrate(db, version);
  }

  return db;
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabase().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  return getDatabase();
}
