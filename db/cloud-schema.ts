import {
  pgTable,
  text,
  integer,
  doublePrecision,
  uniqueIndex,
  index,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ──────────────────────────────────────────────
// Helper: common sync columns for syncable entities
// ──────────────────────────────────────────────

export const syncColumns = {
  store_id: text("store_id").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  sync_status: text("sync_status", {
    enum: ["pending", "synced", "conflict"],
  })
    .notNull()
    .default("pending"),
} as const;

// ──────────────────────────────────────────────
// Stores (reference table, not syncable)
// ──────────────────────────────────────────────

export const stores = pgTable(
  "stores",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({ nameIdx: index("idx_stores_name").on(table.name) }),
);

// ──────────────────────────────────────────────
// Categories (syncable)
// ──────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    name: text("name").notNull(),
    parent_id: integer("parent_id"),
    store_id: text("store_id").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    sync_status: text("sync_status", { enum: ["pending", "synced", "conflict"] })
      .notNull()
      .default("pending"),
  },
  (table) => ({
    storeIdx: index("idx_categories_store").on(table.store_id),
    parentIdx: index("idx_categories_parent").on(table.parent_id),
  }),
);

// ──────────────────────────────────────────────
// Brands (syncable)
// ──────────────────────────────────────────────

export const brands = pgTable(
  "brands",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    name: text("name").notNull(),
    store_id: text("store_id").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    sync_status: text("sync_status", { enum: ["pending", "synced", "conflict"] })
      .notNull()
      .default("pending"),
  },
  (table) => ({
    storeNameIdx: uniqueIndex("idx_brands_store_name").on(table.store_id, table.name),
  }),
);

// ──────────────────────────────────────────────
// Products (syncable)
// ──────────────────────────────────────────────

export const products = pgTable(
  "products",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    barcode: text("barcode"),
    name: text("name").notNull(),
    price: doublePrecision("price").notNull().default(0),
    cost_price: doublePrecision("cost_price").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    min_stock: integer("min_stock").notNull().default(0),
    category_id: integer("category_id"),
    brand_id: integer("brand_id"),
    store_id: text("store_id").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    sync_status: text("sync_status", { enum: ["pending", "synced", "conflict"] })
      .notNull()
      .default("pending"),
  },
  (table) => ({
    barcodeIdx: index("idx_products_barcode").on(table.barcode),
    storeIdx: index("idx_products_store").on(table.store_id),
    categoryIdx: index("idx_products_category").on(table.category_id),
    brandIdx: index("idx_products_brand").on(table.brand_id),
  }),
);

// ──────────────────────────────────────────────
// Stock movements (syncable)
// ──────────────────────────────────────────────

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    product_id: integer("product_id").notNull(),
    type: text("type", { enum: ["sale", "purchase", "adjustment", "transfer"] }).notNull(),
    quantity: integer("quantity").notNull(),
    delta: integer("delta").notNull(),
    reference_id: text("reference_id"),
    user_id: integer("user_id"),
    store_id: text("store_id").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    sync_status: text("sync_status", { enum: ["pending", "synced", "conflict"] })
      .notNull()
      .default("pending"),
  },
  (table) => ({
    productIdx: index("idx_stock_movements_product").on(table.product_id),
    storeIdx: index("idx_stock_movements_store").on(table.store_id),
    typeIdx: index("idx_stock_movements_type").on(table.type),
  }),
);

// ──────────────────────────────────────────────
// Sales (syncable)
// ──────────────────────────────────────────────

export const sales = pgTable(
  "sales",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    store_id: text("store_id").notNull(),
    customer_name: text("customer_name"),
    total: doublePrecision("total").notNull(),
    payment_method: text("payment_method", { enum: ["cash", "card"] }).notNull(),
    amount_paid: doublePrecision("amount_paid"),
    change: doublePrecision("change"),
    shift_id: integer("shift_id"),
    invoice_id: integer("invoice_id"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    sync_status: text("sync_status", { enum: ["pending", "synced", "conflict"] })
      .notNull()
      .default("pending"),
  },
  (table) => ({
    storeIdx: index("idx_sales_store").on(table.store_id),
    shiftIdx: index("idx_sales_shift").on(table.shift_id),
    createdAtIdx: index("idx_sales_created").on(table.created_at),
  }),
);

// ──────────────────────────────────────────────
// Sale items (syncable)
// ──────────────────────────────────────────────

export const saleItems = pgTable(
  "sale_items",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    sale_id: integer("sale_id").notNull(),
    product_id: integer("product_id").notNull(),
    product_name: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    unit_price: doublePrecision("unit_price").notNull(),
    subtotal: doublePrecision("subtotal").notNull(),
    store_id: text("store_id").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    sync_status: text("sync_status", { enum: ["pending", "synced", "conflict"] })
      .notNull()
      .default("pending"),
  },
  (table) => ({
    saleIdx: index("idx_sale_items_sale").on(table.sale_id),
    productIdx: index("idx_sale_items_product").on(table.product_id),
  }),
);

// ──────────────────────────────────────────────
// Shifts (syncable)
// ──────────────────────────────────────────────

export const shifts = pgTable(
  "shifts",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    employee: text("employee").notNull(),
    open_time: timestamp("open_time").notNull().defaultNow(),
    close_time: timestamp("close_time"),
    status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
    store_id: text("store_id").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    sync_status: text("sync_status", { enum: ["pending", "synced", "conflict"] })
      .notNull()
      .default("pending"),
  },
  (table) => ({
    storeIdx: index("idx_shifts_store").on(table.store_id),
  }),
);

// ──────────────────────────────────────────────
// Cash closings (syncable)
// ──────────────────────────────────────────────

export const cashClosings = pgTable(
  "cash_closings",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    shift_id: integer("shift_id").notNull(),
    declared_cash: doublePrecision("declared_cash"),
    variance: doublePrecision("variance"),
    reconciliation_status: text("reconciliation_status", {
      enum: ["pending", "matched", "mismatch"],
    }),
    reconciled_at: timestamp("reconciled_at"),
    store_id: text("store_id").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    sync_status: text("sync_status", { enum: ["pending", "synced", "conflict"] })
      .notNull()
      .default("pending"),
  },
  (table) => ({
    shiftIdx: index("idx_cash_closings_shift").on(table.shift_id),
    storeIdx: index("idx_cash_closings_store").on(table.store_id),
  }),
);

// ──────────────────────────────────────────────
// Invoices (syncable)
// ──────────────────────────────────────────────

export const invoices = pgTable(
  "invoices",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    sale_id: integer("sale_id").notNull(),
    invoice_number: text("invoice_number").notNull(),
    customer_name: text("customer_name"),
    customer_doc: text("customer_doc"),
    total: doublePrecision("total").notNull(),
    store_id: text("store_id").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    sync_status: text("sync_status", { enum: ["pending", "synced", "conflict"] })
      .notNull()
      .default("pending"),
  },
  (table) => ({
    saleIdx: index("idx_invoices_sale").on(table.sale_id),
    storeIdx: index("idx_invoices_store").on(table.store_id),
    invoiceNumberIdx: uniqueIndex("idx_invoices_number").on(table.invoice_number),
  }),
);

// ──────────────────────────────────────────────
// Invoice items (syncable)
// ──────────────────────────────────────────────

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    invoice_id: integer("invoice_id").notNull(),
    product_name: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    unit_price: doublePrecision("unit_price").notNull(),
    subtotal: doublePrecision("subtotal").notNull(),
    store_id: text("store_id").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    sync_status: text("sync_status", { enum: ["pending", "synced", "conflict"] })
      .notNull()
      .default("pending"),
  },
  (table) => ({
    invoiceIdx: index("idx_invoice_items_invoice").on(table.invoice_id),
  }),
);

// ──────────────────────────────────────────────
// Sync support tables
// ──────────────────────────────────────────────

export const syncQueue = pgTable(
  "sync_queue",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    entity: text("entity").notNull(),
    entity_id: integer("entity_id").notNull(),
    operation: text("operation").notNull(),
    store_id: text("store_id").notNull(),
    payload: text("payload"),
    status: text("status", { enum: ["pending", "synced", "conflict"] })
      .notNull()
      .default("pending"),
    retry_count: integer("retry_count").notNull().default(0),
    synced_at: timestamp("synced_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("idx_sync_queue_status").on(table.status),
    storeIdx: index("idx_sync_queue_store").on(table.store_id),
    createdAtIdx: index("idx_sync_queue_created").on(table.created_at),
  }),
);

export const syncLogs = pgTable(
  "sync_logs",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    entity: text("entity").notNull(),
    entity_id: integer("entity_id").notNull(),
    store_id: text("store_id").notNull(),
    local_updated_at: timestamp("local_updated_at"),
    cloud_updated_at: timestamp("cloud_updated_at"),
    verdict: text("verdict", { enum: ["cloud_won", "local_won"] }).notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    storeIdx: index("idx_sync_logs_store").on(table.store_id),
    entityIdx: index("idx_sync_logs_entity").on(table.entity),
  }),
);
