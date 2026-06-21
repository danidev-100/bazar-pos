import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ──────────────────────────────────────────────
// Helper: common sync columns for syncable entities
// ──────────────────────────────────────────────

export const syncColumns = {
  store_id: text("store_id").notNull(),
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  sync_status: text("sync_status", {
    enum: ["pending", "synced", "conflict"],
  })
    .notNull()
    .default("pending"),
} as const;

// ──────────────────────────────────────────────
// Stores (reference table, not syncable)
// ──────────────────────────────────────────────

export const stores = sqliteTable(
  "stores",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({ nameIdx: index("idx_stores_name").on(table.name) }),
);

// ──────────────────────────────────────────────
// Categories (syncable)
// ──────────────────────────────────────────────

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    parent_id: integer("parent_id").references((): any => categories.id),
    ...syncColumns,
  },
  (table) => ({
    storeNameIdx: uniqueIndex("idx_categories_store_name").on(table.store_id, table.name),
    parentIdx: index("idx_categories_parent").on(table.parent_id),
  }),
);

// ──────────────────────────────────────────────
// Brands (syncable)
// ──────────────────────────────────────────────

export const brands = sqliteTable(
  "brands",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    ...syncColumns,
  },
  (table) => ({
    storeNameIdx: uniqueIndex("idx_brands_store_name").on(
      table.store_id,
      table.name,
    ),
  }),
);

// ──────────────────────────────────────────────
// Products (syncable)
// ──────────────────────────────────────────────

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    barcode: text("barcode"),
    name: text("name").notNull(),
    price: real("price").notNull().default(0),
    cost_price: real("cost_price").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    min_stock: integer("min_stock").notNull().default(0),
    category_id: integer("category_id").references((): any => categories.id),
    brand_id: integer("brand_id").references((): any => brands.id),
    ...syncColumns,
  },
  (table) => ({
    storeBarcodeIdx: uniqueIndex("idx_products_store_barcode").on(
      table.store_id,
      table.barcode,
    ),
    categoryIdx: index("idx_products_category").on(table.category_id),
    brandIdx: index("idx_products_brand").on(table.brand_id),
    nameIdx: index("idx_products_name").on(table.name),
  }),
);

// ──────────────────────────────────────────────
// Stock Movements (syncable)
// ──────────────────────────────────────────────

export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    product_id: integer("product_id")
      .notNull()
      .references((): any => products.id),
    type: text("type", {
      enum: ["purchase", "sale", "adjustment"],
    }).notNull(),
    quantity: integer("quantity").notNull(),
    delta: integer("delta").notNull(),
    reference_id: text("reference_id"),
    user_id: text("user_id"),
    ...syncColumns,
  },
  (table) => ({
    productIdx: index("idx_stock_movements_product").on(table.product_id),
    typeIdx: index("idx_stock_movements_type").on(table.type),
    createdIdx: index("idx_stock_movements_created").on(table.created_at),
  }),
);

// ──────────────────────────────────────────────
// Shifts (syncable)
// ──────────────────────────────────────────────

export const shifts = sqliteTable(
  "shifts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    employee_name: text("employee_name").notNull(),
    open_time: text("open_time")
      .notNull()
      .default(sql`(datetime('now'))`),
    close_time: text("close_time"),
    status: text("status", { enum: ["open", "closed"] })
      .notNull()
      .default("open"),
    ...syncColumns,
  },
  (table) => ({
    storeStatusIdx: index("idx_shifts_store_status").on(table.store_id, table.status),
    employeeIdx: index("idx_shifts_employee").on(table.employee_name),
  }),
);

// ──────────────────────────────────────────────
// Sales (syncable)
// ──────────────────────────────────────────────

export const sales = sqliteTable(
  "sales",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    total: real("total").notNull().default(0),
    payment_method: text("payment_method", {
      enum: ["cash", "card", "mixed"],
    }).notNull(),
    cash_amount: real("cash_amount"),
    card_amount: real("card_amount"),
    change: real("change").default(0),
    status: text("status", { enum: ["completed", "refunded"] })
      .notNull()
      .default("completed"),
    customer_name: text("customer_name"),
    shift_id: integer("shift_id").references((): any => shifts.id),
    ...syncColumns,
  },
  (table) => ({
    storeCreatedIdx: index("idx_sales_store_created").on(table.store_id, table.created_at),
    shiftIdx: index("idx_sales_shift").on(table.shift_id),
    statusIdx: index("idx_sales_status").on(table.status),
  }),
);

// ──────────────────────────────────────────────
// Sale Items (syncable)
// ──────────────────────────────────────────────

export const saleItems = sqliteTable(
  "sale_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sale_id: integer("sale_id")
      .notNull()
      .references((): any => sales.id),
    product_id: integer("product_id")
      .notNull()
      .references((): any => products.id),
    product_name: text("product_name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unit_price: real("unit_price").notNull(),
    subtotal: real("subtotal").notNull(),
    ...syncColumns,
  },
  (table) => ({
    saleIdx: index("idx_sale_items_sale").on(table.sale_id),
    productIdx: index("idx_sale_items_product").on(table.product_id),
  }),
);

// ──────────────────────────────────────────────
// Cash Closings (syncable)
// ──────────────────────────────────────────────

export const cashClosings = sqliteTable(
  "cash_closings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    shift_id: integer("shift_id")
      .notNull()
      .references((): any => shifts.id),
    expected_cash: real("expected_cash").notNull(),
    declared_cash: real("declared_cash").notNull(),
    card_total: real("card_total").notNull().default(0),
    variance: real("variance").notNull(),
    status: text("status", { enum: ["matched", "mismatch"] }).notNull(),
    notes: text("notes"),
    ...syncColumns,
  },
  (table) => ({
    shiftIdx: index("idx_cash_closings_shift").on(table.shift_id),
    storeIdx: index("idx_cash_closings_store").on(table.store_id),
  }),
);

// ──────────────────────────────────────────────
// Invoices (syncable)
// ──────────────────────────────────────────────

export const invoices = sqliteTable(
  "invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoice_number: integer("invoice_number").notNull(),
    sale_id: integer("sale_id").references((): any => sales.id),
    customer_name: text("customer_name")
      .notNull()
      .default("Consumidor Final"),
    total: real("total").notNull(),
    payment_method: text("payment_method", { enum: ["cash", "card"] }).notNull(),
    ...syncColumns,
  },
  (table) => ({
    storeNumberIdx: uniqueIndex("idx_invoices_store_number").on(
      table.store_id,
      table.invoice_number,
    ),
    saleIdx: index("idx_invoices_sale").on(table.sale_id),
    createdIdx: index("idx_invoices_created").on(table.created_at),
  }),
);

// ──────────────────────────────────────────────
// Invoice Items (syncable)
// ──────────────────────────────────────────────

export const invoiceItems = sqliteTable(
  "invoice_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoice_id: integer("invoice_id")
      .notNull()
      .references((): any => invoices.id),
    product_name: text("product_name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unit_price: real("unit_price").notNull(),
    subtotal: real("subtotal").notNull(),
    ...syncColumns,
  },
  (table) => ({ invoiceIdx: index("idx_invoice_items_invoice").on(table.invoice_id) }),
);

// ──────────────────────────────────────────────
// Customers (syncable)
// ──────────────────────────────────────────────

export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    cuit: text("cuit"),
    ...syncColumns,
  },
  (table) => ({
    storeNameIdx: uniqueIndex("idx_customers_store_name").on(table.store_id, table.name),
  }),
);

// ──────────────────────────────────────────────
// Proveedores (Suppliers — syncable)
// ──────────────────────────────────────────────

export const proveedores = sqliteTable(
  "proveedores",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    cuit: text("cuit"),
    ...syncColumns,
  },
  (table) => ({
    storeNameIdx: uniqueIndex("idx_proveedores_store_name").on(table.store_id, table.name),
  }),
);

// ──────────────────────────────────────────────
// Pedidos (Purchase Orders — syncable)
// ──────────────────────────────────────────────

export const pedidos = sqliteTable(
  "pedidos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    proveedor_id: integer("proveedor_id")
      .notNull()
      .references((): any => proveedores.id),
    date: text("date")
      .notNull()
      .default(sql`(datetime('now'))`),
    status: text("status", { enum: ["pending", "received", "cancelled"] })
      .notNull()
      .default("pending"),
    total: real("total").notNull().default(0),
    notes: text("notes"),
    ...syncColumns,
  },
  (table) => ({
    storeProveedorIdx: index("idx_pedidos_store_proveedor").on(table.store_id, table.proveedor_id),
    storeStatusIdx: index("idx_pedidos_store_status").on(table.store_id, table.status),
    createdIdx: index("idx_pedidos_created").on(table.created_at),
  }),
);

// ──────────────────────────────────────────────
// Pedido Items (syncable)
// ──────────────────────────────────────────────

export const pedidoItems = sqliteTable(
  "pedido_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pedido_id: integer("pedido_id")
      .notNull()
      .references((): any => pedidos.id),
    product_id: integer("product_id"),
    product_name: text("product_name").notNull(),
    quantity: real("quantity").notNull().default(1),
    unit_price: real("unit_price").notNull(),
    subtotal: real("subtotal").notNull(),
    ...syncColumns,
  },
  (table) => ({
    pedidoIdx: index("idx_pedido_items_pedido").on(table.pedido_id),
  }),
);

// ──────────────────────────────────────────────
// Sync Queue (infrastructure — tracks row-level ops)
// ──────────────────────────────────────────────

export const syncQueue = sqliteTable(
  "sync_queue",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entity: text("entity").notNull(),
    entity_id: integer("entity_id").notNull(),
    operation: text("operation", {
      enum: ["insert", "update", "delete"],
    }).notNull(),
    status: text("status", {
      enum: ["pending", "synced", "failed"],
    })
      .notNull()
      .default("pending"),
    store_id: text("store_id").notNull(),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    synced_at: text("synced_at"),
    retry_count: integer("retry_count").notNull().default(0),
    payload: text("payload"),
  },
  (table) => ({
    statusIdx: index("idx_sync_queue_status").on(table.status),
    entityIdx: index("idx_sync_queue_entity").on(table.entity),
    createdIdx: index("idx_sync_queue_created").on(table.created_at),
  }),
);

// ──────────────────────────────────────────────
// Sync Logs (infrastructure — conflict audit trail)
// ──────────────────────────────────────────────

export const syncLogs = sqliteTable(
  "sync_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entity: text("entity").notNull(),
    entity_id: integer("entity_id").notNull(),
    local_updated_at: text("local_updated_at"),
    cloud_updated_at: text("cloud_updated_at"),
    verdict: text("verdict", {
      enum: ["cloud_won", "local_won", "error"],
    }).notNull(),
    store_id: text("store_id").notNull(),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    entityIdx: index("idx_sync_logs_entity").on(table.entity),
    createdIdx: index("idx_sync_logs_created").on(table.created_at),
  }),
);
