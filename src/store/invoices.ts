import { create } from "zustand";
import type { CompletedSale } from "@/store";
import { execute, enqueueSync, transaction } from "@/lib/db";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type InvoiceItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type Invoice = {
  id: number;
  invoiceNumber: string;
  sequentialNumber: number;
  saleId: number;
  customer: string;
  items: InvoiceItem[];
  total: number;
  paymentMethod: "cash" | "card" | "mixed" | "credit";
  date: string;
  storeId: string;
  createdBy: string;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

let nextInvoiceId = 1;
let nextInvoiceItemId = 1;
export function setNextInvoiceId(id: number) { nextInvoiceId = id; }
export function setNextInvoiceItemId(id: number) { nextInvoiceItemId = id; }

/**
 * Build the formatted invoice number for a store and sequential counter.
 * Format: INV-{store_id}-{NNNNN} (zero-padded to 5 digits)
 */
function formatInvoiceNumber(storeId: string, num: number): string {
  return `INV-${storeId}-${String(num).padStart(5, "0")}`;
}

// ──────────────────────────────────────────────
// Store shape
// ──────────────────────────────────────────────

export type InvoicesStore = {
  invoices: Invoice[];

  /** Per-store counters tracking the highest sequential number issued. */
  counters: Record<string, number>;

  /**
   * Generate an invoice from a completed sale.
   * Assigns the next sequential number for the sale's store.
   * If no customerName is provided, defaults to "Consumidor Final".
   */
  generateInvoice: (sale: CompletedSale, customerName?: string, createdBy?: string) => Invoice;

  /** Get all invoices scoped to a store, newest first. */
  getInvoicesByStore: (storeId: string) => Invoice[];

  /** Get a single invoice by its internal id. */
  getInvoiceById: (id: number) => Invoice | null;

  /**
   * Search invoices by keyword (invoice number or customer name),
   * optionally filtered by date range. All filters are AND-ed together.
   */
  searchInvoices: (
    storeId: string,
    query?: string,
    dateFrom?: string,
    dateTo?: string,
    userName?: string,
  ) => Invoice[];

  /** Get the next sequential number for a store without issuing an invoice. */
  getNextSequentialNumber: (storeId: string) => number;
};

// ──────────────────────────────────────────────
// Store implementation
// ──────────────────────────────────────────────

export const useInvoicesStore = create<InvoicesStore>((set, get) => ({
  invoices: [],
  counters: {},

  generateInvoice: (sale, customerName, createdBy) => {
    const storeId = sale.storeId;
    const existingMax = get().invoices
      .filter((inv) => inv.storeId === storeId)
      .reduce((max, inv) => Math.max(max, inv.sequentialNumber), 0);
    const storeCounter = get().counters[storeId] ?? 0;
    const currentMax = Math.max(existingMax, storeCounter);
    const nextNum = currentMax + 1;

    const invoice: Invoice = {
      id: nextInvoiceId++,
      invoiceNumber: formatInvoiceNumber(storeId, nextNum),
      sequentialNumber: nextNum,
      saleId: sale.id,
      customer: customerName ?? sale.customerName ?? "Consumidor Final",
      items: sale.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      date: new Date().toISOString(),
      storeId,
      createdBy: createdBy ?? "—",
    };

    set({
      invoices: [...get().invoices, invoice],
      counters: { ...get().counters, [storeId]: nextNum },
    });

    // Persist invoice + items in a single transaction
    const now = new Date().toISOString();
    const stmts = [
      {
        sql: `INSERT INTO invoices (id, invoice_number, sale_id, customer_name, total, payment_method, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
        bind: [invoice.id, invoice.sequentialNumber, invoice.saleId, invoice.customer, invoice.total, invoice.paymentMethod, storeId, now, now],
      },
      {
        sql: `INSERT INTO sync_queue (entity, entity_id, operation, store_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
        bind: ["invoice", invoice.id, "insert", storeId, now, now],
      },
    ];

    for (const item of invoice.items) {
      const invoiceItemId = nextInvoiceItemId++;
      stmts.push({
        sql: `INSERT INTO invoice_items (id, invoice_id, product_name, quantity, unit_price, subtotal, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
        bind: [invoiceItemId, invoice.id, item.productName, item.quantity, item.unitPrice, item.subtotal, storeId, now, now],
      });
      stmts.push({
        sql: `INSERT INTO sync_queue (entity, entity_id, operation, store_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
        bind: ["invoice_item", invoiceItemId, "insert", storeId, now, now],
      });
    }

    transaction(stmts).catch(() => {});

    return invoice;
  },

  getInvoicesByStore: (storeId) =>
    get()
      .invoices.filter((inv) => inv.storeId === storeId)
      .sort((a, b) => b.id - a.id),

  getInvoiceById: (id) =>
    get().invoices.find((inv) => inv.id === id) ?? null,

  searchInvoices: (storeId, query, dateFrom, dateTo, userName) => {
    let results = get().invoices.filter((inv) => inv.storeId === storeId);

    if (userName) {
      results = results.filter((inv) => inv.createdBy === userName);
    }

    if (query) {
      const lower = query.toLowerCase();
      results = results.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(lower) ||
          inv.customer.toLowerCase().includes(lower),
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      results = results.filter((inv) => new Date(inv.date).getTime() >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59.999").getTime();
      results = results.filter((inv) => new Date(inv.date).getTime() <= to);
    }

    return results.sort((a, b) => b.id - a.id);
  },

  getNextSequentialNumber: (storeId) => {
    return (get().counters[storeId] ?? 0) + 1;
  },
}));
