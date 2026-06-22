import { select, execute } from "@/lib/db";
import { initAllStores } from "@/lib/init-stores";

// ── Tables to backup (order matters for FK constraints) ──

const TABLES = [
  "brands",
  "categories",
  "customers",
  "proveedores",
  "products",
  "stock_movements",
  "shifts",
  "cash_closings",
  "sales",
  "sale_items",
  "invoices",
  "invoice_items",
  "pedidos",
  "pedido_items",
  "expenses",
  "sync_queue",
  "sync_logs",
] as const;

type BackupData = Record<string, Record<string, unknown>[]>;

// ──────────────────────────────────────────────
// Export
// ──────────────────────────────────────────────

export async function exportBackup(): Promise<BackupData> {
  const data: BackupData = {};

  for (const table of TABLES) {
    try {
      const rows = await select<any>(`SELECT * FROM ${table}`);
      data[table] = rows;
    } catch {
      data[table] = [];
    }
  }

  return data;
}

export function downloadBackup(data: BackupData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bazar-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────
// Import
// ──────────────────────────────────────────────

export async function importBackup(file: File): Promise<{ tables: number; rows: number }> {
  const text = await file.text();
  const data: BackupData = JSON.parse(text);

  // Validate
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("El archivo no tiene el formato de respaldo válido");
  }

  let tableCount = 0;
  let rowCount = 0;

  // Disable foreign keys during import
  try {
    await execute("PRAGMA foreign_keys = OFF");
  } catch { /* ignore */ }

  for (const table of TABLES) {
    const rows = data[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    try {
      // Clear table
      await execute(`DELETE FROM ${table}`);
    } catch { /* table might not exist, skip */ }

    tableCount++;
    for (const row of rows) {
      const keys = Object.keys(row);
      const values = Object.values(row);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

      try {
        await execute(
          `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
          values,
        );
        rowCount++;
      } catch {
        // skip rows that fail (e.g. FK constraint)
      }
    }
  }

  // Re-enable foreign keys
  try {
    await execute("PRAGMA foreign_keys = ON");
  } catch { /* ignore */ }

  // Reload all stores from DB
  await initAllStores();

  return { tables: tableCount, rows: rowCount };
}
