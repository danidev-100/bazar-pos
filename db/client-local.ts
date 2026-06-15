import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { SqliteQueryResult } from "drizzle-orm/sqlite-proxy";
import Database from "@tauri-apps/plugin-sql";
import * as schema from "./schema";

let dbInstance: Database | null = null;

/**
 * Opens (or returns) the local SQLite database connection managed by Tauri.
 * Uses `@tauri-apps/plugin-sql` under the hood. Drizzle queries are proxied
 * through the `sqlite-proxy` adapter because the Tauri plugin does not expose
 * a native libSQL client.
 */
async function getTauriDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load("sqlite:pos.db");
  }
  return dbInstance;
}

/**
 * Drizzle client targeting the local SQLite database.
 *
 * Usage:
 * ```ts
 * import { localDb } from "@/db/client-local";
 * const rows = await localDb.select().from(products).where(eq(products.store_id, storeId));
 * ```
 */
export const localDb = drizzle<typeof schema>(
  async (sql: string, params: any[], method: "all" | "run" | "values") => {
    const db = await getTauriDb();

    if (method === "run") {
      const result = await db.execute(sql, params);
      return {
        rows: [],
        rowsAffected: result.rowsAffected ?? 0,
      } satisfies SqliteQueryResult;
    }

    // method === "all" or "values"
    const rows = await db.select<Record<string, unknown>[]>(sql, params);
    return {
      rows,
      rowsAffected: rows.length,
    } satisfies SqliteQueryResult;
  },
  { schema },
);

/**
 * Closes the local database connection. Call during app teardown if needed.
 */
export async function closeLocalDb(): Promise<void> {
  if (dbInstance) {
    // Tauri v2 plugin-sql does not expose a close() at the JS layer.
    // Connection lifecycle is managed by the Tauri runtime.
    dbInstance = null;
  }
}
