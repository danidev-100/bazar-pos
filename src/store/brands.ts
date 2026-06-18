import { create } from "zustand";
import { execute, enqueueSync } from "@/lib/db";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type Brand = {
  id: number;
  name: string;
  store_id: string;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

let nextBrandId = 1;

// ──────────────────────────────────────────────
// Store shape
// ──────────────────────────────────────────────

export type BrandsStore = {
  brands: Brand[];

  /** Add a brand. Throws if duplicate name in same store. */
  addBrand: (data: Omit<Brand, "id">) => Brand;

  /** Update brand fields by id. Throws if duplicate name in same store. */
  updateBrand: (id: number, updates: Partial<Omit<Brand, "id">>) => void;

  /** Remove a brand by id. */
  deleteBrand: (id: number) => void;

  /** Get all brands scoped to a store_id, sorted alphabetically. */
  getBrandsByStore: (storeId: string) => Brand[];
};

// ──────────────────────────────────────────────
// Store implementation
// ──────────────────────────────────────────────

export const useBrandsStore = create<BrandsStore>((set, get) => ({
  brands: [],

  addBrand: (data) => {
    const dup = get().brands.find(
      (b) => b.name === data.name && b.store_id === data.store_id,
    );
    if (dup) {
      throw new Error(`Brand "${data.name}" already exists in this store`);
    }

    const brand: Brand = { id: nextBrandId++, ...data };
    set({ brands: [...get().brands, brand] });

    // Persist to SQLite
    const now = new Date().toISOString();
    execute(
      `INSERT INTO brands (id, name, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [brand.id, brand.name, brand.store_id, now, now],
    )
      .then(() => enqueueSync("brand", brand.id, "insert", brand.store_id))
      .catch(() => {});

    return brand;
  },

  updateBrand: (id, updates) => {
    if (updates.name) {
      const current = get().brands.find((b) => b.id === id);
      if (current) {
        const dup = get().brands.find(
          (b) =>
            b.name === updates.name &&
            b.store_id === (updates.store_id ?? current.store_id) &&
            b.id !== id,
        );
        if (dup) {
          throw new Error(
            `Brand "${updates.name}" already exists in this store`,
          );
        }
      }
    }

    set({
      brands: get().brands.map((b) =>
        b.id === id ? { ...b, ...updates } : b,
      ),
    });

    // Update SQLite
    const current = get().brands.find((b) => b.id === id);
    if (current) {
      const now = new Date().toISOString();
      execute(
        `UPDATE brands SET name=$1, store_id=$2, updated_at=$3, sync_status='pending' WHERE id=$4`,
        [
          updates.name ?? current.name,
          updates.store_id ?? current.store_id,
          now,
          id,
        ],
      )
        .then(() => enqueueSync("brand", id, "update", current.store_id))
        .catch(() => {});
    }
  },

  deleteBrand: (id) => {
    const existing = get().brands.find((b) => b.id === id);
    set({
      brands: get().brands.filter((b) => b.id !== id),
    });

    // Delete from SQLite
    execute(`DELETE FROM brands WHERE id=$1`, [id])
      .then(() => {
        if (existing) {
          enqueueSync("brand", id, "delete", existing.store_id);
        }
      })
      .catch(() => {});
  },

  getBrandsByStore: (storeId) =>
    get()
      .brands.filter((b) => b.store_id === storeId)
      .sort((a, b) => a.name.localeCompare(b.name)),
}));
