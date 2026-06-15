import { create } from "zustand";

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
  },

  deleteBrand: (id) => {
    set({
      brands: get().brands.filter((b) => b.id !== id),
    });
  },

  getBrandsByStore: (storeId) =>
    get()
      .brands.filter((b) => b.store_id === storeId)
      .sort((a, b) => a.name.localeCompare(b.name)),
}));
