/**
 * SQLite database singleton for Tauri plugin-sql.
 *
 * Auto-creates required tables on first connection.
 * Each write operation also inserts a sync_queue entry.
 */

import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;
let _ready = false;

async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:pos.db");
    await ensureTables(_db);
    _ready = true;
  }
  return _db;
}

async function ensureTables(db: Database): Promise<void> {
  // Tables needed by the app but not in the Drizzle schema yet
  const tables = [
    `CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    // sync_queue might already exist, but IF NOT EXISTS is safe
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      operation TEXT NOT NULL,
      store_id TEXT NOT NULL,
      payload TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      store_id TEXT NOT NULL,
      local_updated_at TEXT,
      cloud_updated_at TEXT,
      verdict TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ];

  for (const sql of tables) {
    await db.execute(sql);
  }
}

/** Execute a SQL statement with optional bind parameters. */
export async function execute(
  sql: string,
  bind?: unknown[],
): Promise<{ rowsAffected: number }> {
  const db = await getDb();
  const rowsAffected = await db.execute(sql, bind);
  return { rowsAffected };
}

/** Select rows from the database. */
export async function select<T>(
  sql: string,
  bind?: unknown[],
): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(sql, bind);
}

/**
 * Enqueue a sync entry so the Rust sync engine picks it up.
 */
export async function enqueueSync(
  entity: string,
  entityId: number,
  operation: "insert" | "update" | "delete",
  storeId: string,
): Promise<void> {
  try {
    await execute(
      `INSERT INTO sync_queue (entity, entity_id, operation, store_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', datetime('now'), datetime('now'))`,
      [entity, entityId, operation, storeId],
    );
  } catch (err) {
    console.warn("Failed to enqueue sync item:", err);
  }
}
