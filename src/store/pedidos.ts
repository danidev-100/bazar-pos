import { create } from "zustand";
import { execute, enqueueSync, transaction } from "@/lib/db";
import { useProductsStore } from "./products";

export type PedidoItem = {
  id: number;
  pedido_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  received_qty: number;
  unit_price: number;
  subtotal: number;
};

export type PedidoStatus = "pending" | "received" | "cancelled" | "partial";

export type Pedido = {
  id: number;
  proveedor_id: number;
  proveedor_name: string;
  date: string;
  status: PedidoStatus;
  total: number;
  notes: string;
  items: PedidoItem[];
  store_id: string;
};

const STATUS_LABELS: Record<PedidoStatus, string> = {
  pending: "Pendiente",
  received: "Recibido",
  cancelled: "Cancelado",
  partial: "Parcial",
};

export function getStatusLabel(status: PedidoStatus): string {
  return STATUS_LABELS[status];
}

let nextPedidoId = 1;
let nextPedidoItemId = 1;
export function setNextPedidoId(id: number) { nextPedidoId = id; }
export function setNextPedidoItemId(id: number) { nextPedidoItemId = id; }

export type PedidosStore = {
  pedidos: Pedido[];
  addPedido: (data: {
    proveedor_id: number;
    proveedor_name: string;
    date: string;
    notes: string;
    store_id: string;
    items: Array<{
      product_id: number | null;
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
  }) => Pedido;
  updatePedido: (id: number, data: {
    date: string;
    notes: string;
    items: Array<{
      id?: number;
      product_id: number | null;
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
  }) => void;
  updateStatus: (id: number, status: PedidoStatus) => void;
  deletePedido: (id: number) => void;
  getPedidosByStore: (storeId: string) => Pedido[];
  receiveItem: (pedidoId: number, itemId: number, quantity: number) => void;
};

export const usePedidosStore = create<PedidosStore>((set, get) => ({
  pedidos: [],

  addPedido: (data) => {
    const now = new Date().toISOString();
    const total = data.items.reduce((s, i) => s + i.subtotal, 0);
    const pedidoId = nextPedidoId++;

    const pedido: Pedido = {
      id: pedidoId,
      proveedor_id: data.proveedor_id,
      proveedor_name: data.proveedor_name,
      date: data.date,
      status: "pending",
      total: Math.round(total * 100) / 100,
      notes: data.notes,
      items: data.items.map((item, idx) => ({
        id: nextPedidoItemId++,
        pedido_id: pedidoId,
        received_qty: 0,
        ...item,
      })),
      store_id: data.store_id,
    };

    set({ pedidos: [...get().pedidos, pedido] });

    // Persist pedido header + items in a single transaction
    const stmts: Array<{ sql: string; bind?: unknown[] }> = [
      {
        sql: `INSERT INTO pedidos (id, proveedor_id, date, status, total, notes, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
        bind: [pedido.id, pedido.proveedor_id, pedido.date, pedido.status, pedido.total, pedido.notes, pedido.store_id, now, now],
      },
      {
        sql: `INSERT INTO sync_queue (entity, entity_id, operation, store_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
        bind: ["pedido", pedido.id, "insert", pedido.store_id, now, now],
      },
    ];

    for (const item of pedido.items) {
      stmts.push({
        sql: `INSERT INTO pedido_items (id, pedido_id, product_id, product_name, quantity, unit_price, subtotal, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
        bind: [item.id, item.pedido_id, item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal, pedido.store_id, now, now],
      });
      stmts.push({
        sql: `INSERT INTO sync_queue (entity, entity_id, operation, store_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
        bind: ["pedido_item", item.id, "insert", pedido.store_id, now, now],
      });
    }

    transaction(stmts).catch(() => {});

    return pedido;
  },

  updatePedido: (id, data) => {
    const existing = get().pedidos.find((p) => p.id === id);
    if (!existing) return;

    const total = Math.round(data.items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
    const now = new Date().toISOString();

    const updatedPedido: Pedido = {
      ...existing,
      date: data.date,
      notes: data.notes,
      total,
      items: data.items.map((item, idx) => ({
        id: item.id ?? nextPedidoItemId++,
        pedido_id: id,
        received_qty: existing.items.find((i) => i.id === item.id)?.received_qty ?? 0,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })),
    };

    set({ pedidos: get().pedidos.map((p) => (p.id === id ? updatedPedido : p)) });

    // Delete old items from DB, then insert new ones
    const stmts: Array<{ sql: string; bind?: unknown[] }> = [
      {
        sql: `UPDATE pedidos SET date=$1, total=$2, notes=$3, updated_at=$4, sync_status='pending' WHERE id=$5`,
        bind: [data.date, total, data.notes, now, id],
      },
      { sql: `DELETE FROM pedido_items WHERE pedido_id=$1`, bind: [id] },
      {
        sql: `INSERT INTO sync_queue (entity, entity_id, operation, store_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
        bind: ["pedido", id, "update", existing.store_id, now, now],
      },
    ];

    for (const item of updatedPedido.items) {
      stmts.push({
        sql: `INSERT INTO pedido_items (id, pedido_id, product_id, product_name, quantity, unit_price, subtotal, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
        bind: [item.id, item.pedido_id, item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal, existing.store_id, now, now],
      });
      stmts.push({
        sql: `INSERT INTO sync_queue (entity, entity_id, operation, store_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
        bind: ["pedido_item", item.id, "insert", existing.store_id, now, now],
      });
    }

    transaction(stmts).catch(() => {});
  },

  updateStatus: (id, status) => {
    const existing = get().pedidos.find((p) => p.id === id);
    if (!existing) return;

    set({
      pedidos: get().pedidos.map((p) =>
        p.id === id ? { ...p, status } : p,
      ),
    });

    const now = new Date().toISOString();
    execute(
      `UPDATE pedidos SET status=$1, updated_at=$2, sync_status='pending' WHERE id=$3`,
      [status, now, id],
    )
      .then(() => enqueueSync("pedido", id, "update", existing.store_id))
      .catch(() => {});
  },

  deletePedido: (id) => {
    const existing = get().pedidos.find((p) => p.id === id);
    set({
      pedidos: get().pedidos.filter((p) => p.id !== id),
    });

    execute(`DELETE FROM pedidos WHERE id=$1`, [id])
      .then(async () => {
        if (existing) {
          await enqueueSync("pedido", id, "delete", existing.store_id);
          for (const item of existing.items) {
            await execute(`DELETE FROM pedido_items WHERE id=$1`, [item.id]);
          }
        }
      })
      .catch(() => {});
  },

  receiveItem: (pedidoId, itemId, quantity) => {
    const existing = get().pedidos.find((p) => p.id === pedidoId);
    if (!existing) return;

    const item = existing.items.find((i) => i.id === itemId);
    if (!item) return;

    const maxReceive = item.quantity - item.received_qty;
    if (maxReceive <= 0) return;

    const qtyToReceive = Math.min(quantity, maxReceive);
    if (qtyToReceive <= 0) return;

    const newReceived = item.received_qty + qtyToReceive;

    // Update the item
    const updatedItems = existing.items.map((i) =>
      i.id === itemId ? { ...i, received_qty: newReceived } : i,
    );

    // Update stock
    if (item.product_id != null) {
      const productsState = useProductsStore.getState();
      const product = productsState.products.find((p) => p.id === item.product_id);
      if (product) {
        productsState.adjustStock(item.product_id, product.stock + qtyToReceive);
      }
    }

    // Recalculate status
    const allReceived = updatedItems.every((i) => i.received_qty >= i.quantity);
    const someReceived = updatedItems.some((i) => i.received_qty > 0);

    let newStatus: PedidoStatus;
    if (allReceived) newStatus = "received";
    else if (someReceived) newStatus = "partial";
    else newStatus = existing.status;

    set({
      pedidos: get().pedidos.map((p) =>
        p.id === pedidoId
          ? { ...p, items: updatedItems, status: newStatus }
          : p,
      ),
    });

    // Persist
    const now = new Date().toISOString();
    if (newStatus !== existing.status) {
      execute(
        `UPDATE pedidos SET status=$1, updated_at=$2, sync_status='pending' WHERE id=$3`,
        [newStatus, now, pedidoId],
      )
        .then(() => enqueueSync("pedido", pedidoId, "update", existing.store_id))
        .catch(() => {});
    }
    execute(`UPDATE pedido_items SET received_qty=$1 WHERE id=$2`, [newReceived, itemId])
      .catch(() => {});
  },

  getPedidosByStore: (storeId) =>
    get()
      .pedidos.filter((p) => p.store_id === storeId)
      .sort((a, b) => b.date.localeCompare(a.date)),
}));
