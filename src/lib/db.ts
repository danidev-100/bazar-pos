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
  const tables = [
    // ── Sales ──
    `CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY,
      total REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL,
      cash_amount REAL,
      card_amount REAL,
      change REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed',
      customer_name TEXT,
      shift_id INTEGER,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    `CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    // ── Invoices ──
    `CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY,
      invoice_number INTEGER NOT NULL,
      sale_id INTEGER,
      customer_name TEXT NOT NULL DEFAULT 'Consumidor Final',
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    `CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY,
      invoice_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    // ── Brands ──
    `CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    // ── Categories ──
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id INTEGER,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    // ── Products ──
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      barcode TEXT,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      cost_price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER,
      brand_id INTEGER,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    // ── Stock movements ──
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      delta INTEGER NOT NULL,
      reference_id TEXT,
      user_id TEXT,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    // ── Shifts ──
    `CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY,
      employee_name TEXT NOT NULL,
      open_time TEXT NOT NULL DEFAULT (datetime('now')),
      close_time TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      opening_balance REAL NOT NULL DEFAULT 0,
      declared_cash REAL,
      variance REAL,
      reconciliation_status TEXT,
      reconciled_at TEXT,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    // ── Cash closings ──
    `CREATE TABLE IF NOT EXISTS cash_closings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER NOT NULL,
      expected_cash REAL NOT NULL,
      declared_cash REAL NOT NULL,
      card_total REAL NOT NULL DEFAULT 0,
      variance REAL NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    // ── Customers ──
    `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      cuit TEXT,
      credit_balance REAL NOT NULL DEFAULT 0,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    `CREATE TABLE IF NOT EXISTS credit_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT,
      sale_id INTEGER,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    // ── Expenses ──
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
    `CREATE TABLE IF NOT EXISTS proveedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      cuit TEXT,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    `CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proveedor_id INTEGER NOT NULL,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','received','cancelled')),
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    `CREATE TABLE IF NOT EXISTS comprobantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      numero TEXT NOT NULL,
      cliente_nombre TEXT NOT NULL DEFAULT 'Consumidor Final',
      cliente_cuit TEXT,
      cliente_direccion TEXT,
      fecha TEXT NOT NULL DEFAULT (datetime('now')),
      subtotal REAL NOT NULL DEFAULT 0,
      iva REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      sale_id INTEGER,
      notes TEXT,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    `CREATE TABLE IF NOT EXISTS comprobante_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comprobante_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
    )`,
    `CREATE TABLE IF NOT EXISTS pedido_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      store_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending'
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
  const result = await db.execute(sql, bind) as { rowsAffected: number };
  return { rowsAffected: result.rowsAffected };
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
