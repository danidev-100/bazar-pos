import { create } from "zustand";
import { execute, enqueueSync, select } from "@/lib/db";

export type ComboItem = {
  productId: number;
  quantity: number;
};

export type Combo = {
  id: number;
  name: string;
  comboPrice: number;
  items: ComboItem[];
  storeId: string;
};

let nextComboId = 1;
let nextComboItemId = 1;

export function setNextComboId(id: number) { nextComboId = id; }
export function setNextComboItemId(id: number) { nextComboItemId = id; }

export type CombosStore = {
  combos: Combo[];
  loading: boolean;

  loadCombos: () => Promise<void>;
  addCombo: (data: { name: string; comboPrice: number; items: ComboItem[]; storeId: string }) => Combo;
  updateCombo: (id: number, data: { name: string; comboPrice: number; items: ComboItem[] }) => void;
  deleteCombo: (id: number) => void;
  getCombo: (id: number) => Combo | undefined;
};

export const useCombosStore = create<CombosStore>((set, get) => ({
  combos: [],
  loading: false,

  loadCombos: async () => {
    set({ loading: true });
    try {
      const comboRows = await select<any>("SELECT id, name, combo_price, store_id FROM combos");
      const itemRows = await select<any>("SELECT id, combo_id, product_id, quantity FROM combo_items");

      const itemsByCombo = new Map<number, ComboItem[]>();
      for (const row of itemRows) {
        const list = itemsByCombo.get(row.combo_id) ?? [];
        list.push({ productId: row.product_id, quantity: row.quantity });
        itemsByCombo.set(row.combo_id, list);
      }

      const combos: Combo[] = comboRows.map((r: any) => {
        const items = itemsByCombo.get(r.id) ?? [];
        const maxItemId = items.reduce((m: number, i: ComboItem) => Math.max(m, i.productId), 0);
        if (maxItemId >= nextComboItemId) nextComboItemId = maxItemId + 1;
        return {
          id: r.id,
          name: r.name,
          comboPrice: r.combo_price,
          items,
          storeId: r.store_id,
        };
      });

      const maxId = combos.reduce((m: number, c: Combo) => Math.max(m, c.id), 0);
      setNextComboId(maxId + 1);

      set({ combos, loading: false });
    } catch (err) {
      console.error("[combos] loadCombos failed:", err);
      set({ loading: false });
    }
  },

  addCombo: (data) => {
    const combo: Combo = {
      id: nextComboId++,
      ...data,
    };
    set({ combos: [...get().combos, combo] });

    const now = new Date().toISOString();
    execute(
      `INSERT INTO combos (id, name, combo_price, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [combo.id, combo.name, combo.comboPrice, combo.storeId, now, now],
    ).then(() => enqueueSync("combo", combo.id, "insert", combo.storeId))
      .catch((err) => console.error("[db] combos.addCombo failed:", err));

    for (const item of combo.items) {
      const itemId = nextComboItemId++;
      execute(
        `INSERT INTO combo_items (id, combo_id, product_id, quantity, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
        [itemId, combo.id, item.productId, item.quantity, combo.storeId, now, now],
      ).then(() => enqueueSync("combo_item", itemId, "insert", combo.storeId))
        .catch((err) => console.error("[db] combos.addCombo item failed:", err));
    }

    return combo;
  },

  updateCombo: (id, data) => {
    set({
      combos: get().combos.map((c) =>
        c.id === id ? { ...c, name: data.name, comboPrice: data.comboPrice, items: data.items } : c,
      ),
    });

    const current = get().combos.find((c) => c.id === id);
    if (!current) return;

    const now = new Date().toISOString();
    execute(
      `UPDATE combos SET name=$1, combo_price=$2, updated_at=$3, sync_status='pending' WHERE id=$4`,
      [data.name, data.comboPrice, now, id],
    ).then(() => enqueueSync("combo", id, "update", current.storeId))
      .catch((err) => console.error("[db] combos.updateCombo failed:", err));

    execute(`DELETE FROM combo_items WHERE combo_id=$1`, [id])
      .catch((err) => console.error("[db] combos.updateCombo delete items failed:", err));

    for (const item of data.items) {
      const itemId = nextComboItemId++;
      execute(
        `INSERT INTO combo_items (id, combo_id, product_id, quantity, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
        [itemId, id, item.productId, item.quantity, current.storeId, now, now],
      ).then(() => enqueueSync("combo_item", itemId, "insert", current.storeId))
        .catch((err) => console.error("[db] combos.updateCombo item failed:", err));
    }
  },

  deleteCombo: (id) => {
    const existing = get().combos.find((c) => c.id === id);
    set({ combos: get().combos.filter((c) => c.id !== id) });

    if (existing) {
      execute(`DELETE FROM combos WHERE id=$1`, [id])
        .then(() => enqueueSync("combo", id, "delete", existing.storeId))
        .catch((err) => console.error("[db] combos.deleteCombo failed:", err));
      execute(`DELETE FROM combo_items WHERE combo_id=$1`, [id])
        .catch((err) => console.error("[db] combos.deleteCombo items failed:", err));
    }
  },

  getCombo: (id) => get().combos.find((c) => c.id === id),
}));
