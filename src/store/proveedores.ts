import { create } from "zustand";
import { execute, enqueueSync } from "@/lib/db";

export type Proveedor = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  cuit: string;
  store_id: string;
};

let nextProveedorId = 1;

export type ProveedoresStore = {
  proveedores: Proveedor[];
  addProveedor: (data: Omit<Proveedor, "id">) => Proveedor;
  updateProveedor: (id: number, updates: Partial<Omit<Proveedor, "id">>) => void;
  deleteProveedor: (id: number) => void;
  getProveedoresByStore: (storeId: string) => Proveedor[];
};

export const useProveedoresStore = create<ProveedoresStore>((set, get) => ({
  proveedores: [],

  addProveedor: (data) => {
    const dup = get().proveedores.find(
      (p) => p.name === data.name && p.store_id === data.store_id,
    );
    if (dup) {
      throw new Error(`Ya existe un proveedor "${data.name}" en esta tienda`);
    }

    const proveedor: Proveedor = { id: nextProveedorId++, ...data };
    set({ proveedores: [...get().proveedores, proveedor] });

    const now = new Date().toISOString();
    execute(
      `INSERT INTO proveedores (id, name, phone, email, address, cuit, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [proveedor.id, proveedor.name, proveedor.phone, proveedor.email, proveedor.address, proveedor.cuit, proveedor.store_id, now, now],
    )
      .then(() => enqueueSync("proveedor", proveedor.id, "insert", proveedor.store_id))
      .catch(() => {});

    return proveedor;
  },

  updateProveedor: (id, updates) => {
    if (updates.name) {
      const current = get().proveedores.find((p) => p.id === id);
      if (current) {
        const dup = get().proveedores.find(
          (p) =>
            p.name === updates.name &&
            p.store_id === (updates.store_id ?? current.store_id) &&
            p.id !== id,
        );
        if (dup) {
          throw new Error(`Ya existe un proveedor "${updates.name}" en esta tienda`);
        }
      }
    }

    set({
      proveedores: get().proveedores.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    });

    const current = get().proveedores.find((p) => p.id === id);
    if (current) {
      const now = new Date().toISOString();
      execute(
        `UPDATE proveedores SET name=$1, phone=$2, email=$3, address=$4, cuit=$5, store_id=$6, updated_at=$7, sync_status='pending' WHERE id=$8`,
        [
          updates.name ?? current.name,
          updates.phone ?? current.phone,
          updates.email ?? current.email,
          updates.address ?? current.address,
          updates.cuit ?? current.cuit,
          updates.store_id ?? current.store_id,
          now,
          id,
        ],
      )
        .then(() => enqueueSync("proveedor", id, "update", current.store_id))
        .catch(() => {});
    }
  },

  deleteProveedor: (id) => {
    const existing = get().proveedores.find((p) => p.id === id);
    set({
      proveedores: get().proveedores.filter((p) => p.id !== id),
    });

    execute(`DELETE FROM proveedores WHERE id=$1`, [id])
      .then(() => {
        if (existing) {
          enqueueSync("proveedor", id, "delete", existing.store_id);
        }
      })
      .catch(() => {});
  },

  getProveedoresByStore: (storeId) =>
    get()
      .proveedores.filter((p) => p.store_id === storeId)
      .sort((a, b) => a.name.localeCompare(b.name)),
}));
