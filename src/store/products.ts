import { create } from "zustand";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type Product = {
  id: number;
  barcode: string | null;
  name: string;
  price: number;
  stock: number;
  category_id: number | null;
  store_id: string;
};

export type Category = {
  id: number;
  name: string;
  parent_id: number | null;
  store_id: string;
};

export type MovementType = "purchase" | "sale" | "adjustment";

export type StockMovement = {
  id: number;
  product_id: number;
  type: MovementType;
  quantity: number;
  delta: number;
  reference_id: string | null;
  user_id: string | null;
  store_id: string;
  created_at: string;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

let nextProductId = 1;
let nextCategoryId = 1;
let nextMovementId = 1;

function now(): string {
  return new Date().toISOString();
}

// ──────────────────────────────────────────────
// Store shape
// ──────────────────────────────────────────────

export type ProductsStore = {
  products: Product[];
  categories: Category[];
  stockMovements: StockMovement[];

  /** Add a product. Throws if barcode duplicate in same store. */
  addProduct: (data: Omit<Product, "id">) => Product;

  /** Update product fields by id. */
  updateProduct: (id: number, updates: Partial<Omit<Product, "id">>) => void;

  /** Remove a product by id. */
  deleteProduct: (id: number) => void;

  /** Get all products scoped to a store_id. */
  getProductsByStore: (storeId: string) => Product[];

  /** Add a category. Throws if duplicate name in same store + parent. */
  addCategory: (data: Omit<Category, "id">) => Category;

  /** Update category fields by id. */
  updateCategory: (id: number, updates: Partial<Omit<Category, "id">>) => void;

  /** Remove a category and all its descendants. Uncategorizes affected products. */
  deleteCategory: (id: number) => void;

  /** Get all categories scoped to a store_id. */
  getCategoriesByStore: (storeId: string) => Category[];

  /** Get children of a given parent (null = root categories). */
  getChildCategories: (parentId: number | null) => Category[];

  /** Record a stock movement AND update the product's running quantity. */
  recordMovement: (data: Omit<StockMovement, "id" | "created_at">) => StockMovement;

  /** Shortcut: adjust product stock to an absolute value (creates "adjustment" movement). */
  adjustStock: (productId: number, newQuantity: number, userId?: string) => void;

  /** Get movements for a specific product. */
  getMovementsByProduct: (productId: number) => StockMovement[];

  /** Get movements scoped to a store. */
  getMovementsByStore: (storeId: string) => StockMovement[];
};

// ──────────────────────────────────────────────
// Store implementation
// ──────────────────────────────────────────────

export const useProductsStore = create<ProductsStore>((set, get) => ({
  products: [],
  categories: [],
  stockMovements: [],

  // ── Products ──

  addProduct: (data) => {
    if (data.barcode) {
      const dup = get().products.find(
        (p) => p.barcode === data.barcode && p.store_id === data.store_id,
      );
      if (dup) {
        throw new Error(
          `Product with barcode "${data.barcode}" already exists in this store`,
        );
      }
    }

    const product: Product = { id: nextProductId++, ...data };
    set({ products: [...get().products, product] });
    return product;
  },

  updateProduct: (id, updates) => {
    if (updates.barcode) {
      const dup = get().products.find(
        (p) =>
          p.barcode === updates.barcode &&
          p.store_id === (updates.store_id ?? get().products.find((p) => p.id === id)?.store_id) &&
          p.id !== id,
      );
      if (dup) {
        throw new Error(
          `Product with barcode "${updates.barcode}" already exists in this store`,
        );
      }
    }

    set({
      products: get().products.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    });
  },

  deleteProduct: (id) => {
    set({
      products: get().products.filter((p) => p.id !== id),
      stockMovements: get().stockMovements.filter((m) => m.product_id !== id),
    });
  },

  getProductsByStore: (storeId) =>
    get().products.filter((p) => p.store_id === storeId),

  // ── Categories ──

  addCategory: (data) => {
    const dup = get().categories.find(
      (c) =>
        c.name === data.name &&
        c.store_id === data.store_id &&
        c.parent_id === data.parent_id,
    );
    if (dup) {
      throw new Error(
        `Category "${data.name}" already exists in this store`,
      );
    }

    const category: Category = { id: nextCategoryId++, ...data };
    set({ categories: [...get().categories, category] });
    return category;
  },

  updateCategory: (id, updates) => {
    if (updates.name) {
      const current = get().categories.find((c) => c.id === id);
      if (current) {
        const dup = get().categories.find(
          (c) =>
            c.name === updates.name &&
            c.store_id === (updates.store_id ?? current.store_id) &&
            c.parent_id === (updates.parent_id ?? current.parent_id) &&
            c.id !== id,
        );
        if (dup) {
          throw new Error(
            `Category "${updates.name}" already exists in this store`,
          );
        }
      }
    }

    set({
      categories: get().categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    });
  },

  deleteCategory: (id) => {
    // Collect all descendant ids recursively
    const idsToDelete = new Set<number>();
    const collect = (parentId: number) => {
      get().categories
        .filter((c) => c.parent_id === parentId)
        .forEach((c) => {
          idsToDelete.add(c.id);
          collect(c.id);
        });
    };
    idsToDelete.add(id);
    collect(id);

    // Uncategorize products that belong to deleted categories
    set({
      categories: get().categories.filter((c) => !idsToDelete.has(c.id)),
      products: get().products.map((p) =>
        p.category_id !== null && idsToDelete.has(p.category_id)
          ? { ...p, category_id: null }
          : p,
      ),
    });
  },

  getCategoriesByStore: (storeId) =>
    get().categories.filter((c) => c.store_id === storeId),

  getChildCategories: (parentId) =>
    get().categories.filter((c) => c.parent_id === parentId),

  // ── Stock Movements ──

  recordMovement: (data) => {
    const movement: StockMovement = {
      id: nextMovementId++,
      created_at: now(),
      ...data,
    };

    const { products } = get();
    const product = products.find((p) => p.id === data.product_id);
    if (product) {
      const newStock = product.stock + data.delta;
      set({
        stockMovements: [...get().stockMovements, movement],
        products: products.map((p) =>
          p.id === data.product_id ? { ...p, stock: newStock } : p,
        ),
      });
    } else {
      set({ stockMovements: [...get().stockMovements, movement] });
    }

    return movement;
  },

  adjustStock: (productId, newQuantity, userId) => {
    const product = get().products.find((p) => p.id === productId);
    if (!product) return;

    const delta = newQuantity - product.stock;
    if (delta === 0) return;

    get().recordMovement({
      product_id: productId,
      type: "adjustment",
      quantity: newQuantity,
      delta,
      reference_id: null,
      user_id: userId ?? null,
      store_id: product.store_id,
    });
  },

  getMovementsByProduct: (productId) =>
    get()
      .stockMovements.filter((m) => m.product_id === productId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),

  getMovementsByStore: (storeId) =>
    get()
      .stockMovements.filter((m) => m.store_id === storeId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
}));
