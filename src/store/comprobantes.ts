import { create } from "zustand";
import { execute, enqueueSync, transaction } from "@/lib/db";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ComprobanteTipo = "factura" | "boleta" | "nota_credito" | "nota_debito" | "ticket";

export type ComprobanteItem = {
  id: number;
  comprobante_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  /** Human-readable combo name, e.g. \"Combo A+B\" */
  combo_name: string;
};

export type Comprobante = {
  id: number;
  tipo: ComprobanteTipo;
  numero: string;
  sequentialNumber: number;
  cliente_nombre: string;
  cliente_cuit: string;
  cliente_direccion: string;
  fecha: string;
  payment_method: "cash" | "card" | "mixed" | "credit" | "mercadopago" | null;
  subtotal: number;
  iva: number;
  total: number;
  sale_id: number | null;
  notes: string;
  createdBy: string;
  items: ComprobanteItem[];
  store_id: string;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const TIPO_PREFIX: Record<ComprobanteTipo, string> = {
  factura: "FAC",
  boleta: "BOL",
  nota_credito: "NCR",
  nota_debito: "NDB",
  ticket: "TKT",
};

const TIPO_LABELS: Record<ComprobanteTipo, string> = {
  factura: "Factura",
  boleta: "Boleta",
  nota_credito: "Nota de Crédito",
  nota_debito: "Nota de Débito",
  ticket: "Ticket",
};

export function getTipoLabel(tipo: ComprobanteTipo): string {
  return TIPO_LABELS[tipo];
}

function formatNumero(storeId: string, tipo: ComprobanteTipo, seq: number): string {
  // Sanitize store ID for filename
  const safeStore = storeId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `${TIPO_PREFIX[tipo]}-${safeStore}-${String(seq).padStart(5, "0")}`;
}

let nextComprobanteId = 1;
let nextComprobanteItemId = 1;
export function setNextComprobanteId(id: number) { nextComprobanteId = id; }
export function setNextComprobanteItemId(id: number) { nextComprobanteItemId = id; }

// ──────────────────────────────────────────────
// Store shape
// ──────────────────────────────────────────────

export type ComprobantesStore = {
  comprobantes: Comprobante[];
  counters: Record<string, Record<ComprobanteTipo, number>>; // storeId -> tipo -> last seq

  createComprobante: (data: {
    tipo: ComprobanteTipo;
    cliente_nombre: string;
    cliente_cuit?: string;
    cliente_direccion?: string;
    payment_method?: "cash" | "card" | "mixed" | "credit" | "mercadopago";
    notes?: string;
    created_by?: string;
    sale_id?: number;
    store_id: string;
    items: Array<{
      product_id?: number;
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
      combo_name?: string | null;
    }>;
    ivaPercent?: number;
  }) => Comprobante;

  getComprobantesByStore: (storeId: string) => Comprobante[];
  getComprobanteById: (id: number) => Comprobante | null;
};

// ──────────────────────────────────────────────
// Store implementation
// ──────────────────────────────────────────────

export const useComprobantesStore = create<ComprobantesStore>((set, get) => ({
  comprobantes: [],
  counters: {},

  createComprobante: (data) => {
    const now = new Date().toISOString();
    const storeCounters = get().counters[data.store_id] ?? {} as Record<ComprobanteTipo, number>;
    const currentSeq = storeCounters[data.tipo] ?? 0;
    const nextSeq = currentSeq + 1;

    const subtotal = data.items.reduce((s, i) => s + i.subtotal, 0);
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const iva = data.ivaPercent ? Math.round(roundedSubtotal * data.ivaPercent / 100 * 100) / 100 : 0;
    const total = Math.round((roundedSubtotal + iva) * 100) / 100;

    const compId = nextComprobanteId++;

    const items: ComprobanteItem[] = data.items.map((item) => ({
      id: nextComprobanteItemId++,
      comprobante_id: compId,
      product_id: item.product_id ?? null,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      combo_name: item.combo_name ?? "",
    }));

    const comprobante: Comprobante = {
      id: compId,
      tipo: data.tipo,
      numero: formatNumero(data.store_id, data.tipo, nextSeq),
      sequentialNumber: nextSeq,
      cliente_nombre: data.cliente_nombre || "Consumidor Final",
      cliente_cuit: data.cliente_cuit ?? "",
      cliente_direccion: data.cliente_direccion ?? "",
      fecha: now,
      payment_method: data.payment_method ?? null,
      subtotal: roundedSubtotal,
      iva,
      total,
      sale_id: data.sale_id ?? null,
      notes: data.notes ?? "",
      createdBy: data.created_by ?? "—",
      items,
      store_id: data.store_id,
    };

    set({
      comprobantes: [...get().comprobantes, comprobante],
      counters: {
        ...get().counters,
        [data.store_id]: { ...storeCounters, [data.tipo]: nextSeq },
      },
    });

    // Persist header + items in a single transaction
    const stmts = [
      {
        sql: `INSERT INTO comprobantes (id, tipo, numero, cliente_nombre, cliente_cuit, cliente_direccion, fecha, payment_method, subtotal, iva, total, sale_id, notes, created_by, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'pending')`,
        bind: [comprobante.id, comprobante.tipo, comprobante.numero, comprobante.cliente_nombre, comprobante.cliente_cuit, comprobante.cliente_direccion, comprobante.fecha, comprobante.payment_method, comprobante.subtotal, comprobante.iva, comprobante.total, comprobante.sale_id, comprobante.notes, comprobante.createdBy, comprobante.store_id, now, now],
      },
      {
        sql: `INSERT INTO sync_queue (entity, entity_id, operation, store_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
        bind: ["comprobante", comprobante.id, "insert", comprobante.store_id, now, now],
      },
    ];

    for (const item of comprobante.items) {
      stmts.push({
        sql: `INSERT INTO comprobante_items (id, comprobante_id, product_id, product_name, quantity, unit_price, subtotal, combo_name, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')`,
        bind: [item.id, item.comprobante_id, item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal, item.combo_name, comprobante.store_id, now, now],
      });
      stmts.push({
        sql: `INSERT INTO sync_queue (entity, entity_id, operation, store_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
        bind: ["comprobante_item", item.id, "insert", comprobante.store_id, now, now],
      });
    }

    transaction(stmts).catch((err) => console.error("[db] comprobantes.createComprobante failed:", err));

    return comprobante;
  },

  getComprobantesByStore: (storeId) =>
    get()
      .comprobantes.filter((c) => c.store_id === storeId)
      .sort((a, b) => b.id - a.id),

  getComprobanteById: (id) =>
    get().comprobantes.find((c) => c.id === id) ?? null,
}));
