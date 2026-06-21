import { create } from "zustand";
import { execute, enqueueSync } from "@/lib/db";

export type PedidoItem = {
  id: number;
  pedido_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type Pedido = {
  id: number;
  proveedor_id: number;
  proveedor_name: string;
  date: string;
  status: "pending" | "received" | "cancelled";
  total: number;
  notes: string;
  items: PedidoItem[];
  store_id: string;
};

export type PedidoStatus = Pedido["status"];

const STATUS_LABELS: Record<PedidoStatus, string> = {
  pending: "Pendiente",
  received: "Recibido",
  cancelled: "Cancelado",
};

export function getStatusLabel(status: PedidoStatus): string {
  return STATUS_LABELS[status];
}

let nextPedidoId = 1;
let nextPedidoItemId = 1;

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
  updateStatus: (id: number, status: PedidoStatus) => void;
  deletePedido: (id: number) => void;
  getPedidosByStore: (storeId: string) => Pedido[];
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
        ...item,
      })),
      store_id: data.store_id,
    };

    set({ pedidos: [...get().pedidos, pedido] });

    // Persist pedido header
    execute(
      `INSERT INTO pedidos (id, proveedor_id, date, status, total, notes, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [pedido.id, pedido.proveedor_id, pedido.date, pedido.status, pedido.total, pedido.notes, pedido.store_id, now, now],
    )
      .then(async () => {
        await enqueueSync("pedido", pedido.id, "insert", pedido.store_id);

        // Persist items
        for (const item of pedido.items) {
          await execute(
            `INSERT INTO pedido_items (id, pedido_id, product_id, product_name, quantity, unit_price, subtotal, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
            [item.id, item.pedido_id, item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal, pedido.store_id, now, now],
          );
          await enqueueSync("pedido_item", item.id, "insert", pedido.store_id);
        }
      })
      .catch(() => {});

    return pedido;
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

  getPedidosByStore: (storeId) =>
    get()
      .pedidos.filter((p) => p.store_id === storeId)
      .sort((a, b) => b.date.localeCompare(a.date)),
}));
