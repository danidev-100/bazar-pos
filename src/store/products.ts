import { create } from "zustand";
import { execute, enqueueSync } from "@/lib/db";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type Product = {
  id: number;
  barcode: string | null;
  name: string;
  price: number;
  stock: number;
  minStock: number;
  midStock: number;
  category_id: number | null;
  costPrice: number;
  brandId: number | null;
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
export function setNextProductId(id: number) { nextProductId = id; }
export function setNextCategoryId(id: number) { nextCategoryId = id; }
export function setNextMovementId(id: number) { nextMovementId = id; }

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
  addProduct: (data: Omit<Product, "id" | "costPrice" | "brandId" | "minStock" | "midStock"> & { costPrice?: number; brandId?: number | null; minStock?: number; midStock?: number }) => Product;

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

    const product: Product = {
      id: nextProductId++,
      ...data,
      minStock: data.minStock ?? 0,
      midStock: data.midStock ?? 0,
      costPrice: data.costPrice ?? 0,
      brandId: data.brandId ?? null,
    };
    set({ products: [...get().products, product] });

    // Persist to SQLite
    const now = new Date().toISOString();
    execute(
      `INSERT INTO products (id, barcode, name, price, cost_price, stock, min_stock, mid_stock, category_id, brand_id, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')`,
      [product.id, product.barcode, product.name, product.price, product.costPrice, product.stock, product.minStock, product.midStock, product.category_id, product.brandId, product.store_id, now, now],
    )
      .then(() => enqueueSync("product", product.id, "insert", product.store_id))
      .catch(() => {});

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

    // Persist to SQLite
    const current = get().products.find((p) => p.id === id);
    if (current) {
      const now = new Date().toISOString();
      execute(
      `UPDATE products SET barcode=$1, name=$2, price=$3, cost_price=$4, stock=$5, min_stock=$6, mid_stock=$7, category_id=$8, brand_id=$9, store_id=$10, updated_at=$11, sync_status='pending' WHERE id=$12`,
      [current.barcode, current.name, current.price, current.costPrice, current.stock, current.minStock, current.midStock, current.category_id, current.brandId, current.store_id, now, id],
      )
        .then(() => enqueueSync("product", id, "update", current.store_id))
        .catch(() => {});
    }
  },

  deleteProduct: (id) => {
    const existing = get().products.find((p) => p.id === id);
    set({
      products: get().products.filter((p) => p.id !== id),
      stockMovements: get().stockMovements.filter((m) => m.product_id !== id),
    });

    // Delete from SQLite
    if (existing) {
      execute(`DELETE FROM products WHERE id=$1`, [id])
        .then(() => enqueueSync("product", id, "delete", existing.store_id))
        .catch(() => {});
    }
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

    // Persist to SQLite
    const now = new Date().toISOString();
    execute(
      `INSERT INTO categories (id, name, parent_id, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [category.id, category.name, category.parent_id, category.store_id, now, now],
    )
      .then(() => enqueueSync("category", category.id, "insert", category.store_id))
      .catch(() => {});

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

    // Persist to SQLite
    const current = get().categories.find((c) => c.id === id);
    if (current) {
      const now = new Date().toISOString();
      execute(
        `UPDATE categories SET name=$1, parent_id=$2, store_id=$3, updated_at=$4, sync_status='pending' WHERE id=$5`,
        [current.name, current.parent_id, current.store_id, now, id],
      )
        .then(() => enqueueSync("category", id, "update", current.store_id))
        .catch(() => {});
    }
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

    // Capture categories before deletion
    const deletedCategories = get().categories.filter((c) => idsToDelete.has(c.id));

    // Uncategorize products that belong to deleted categories
    set({
      categories: get().categories.filter((c) => !idsToDelete.has(c.id)),
      products: get().products.map((p) =>
        p.category_id !== null && idsToDelete.has(p.category_id)
          ? { ...p, category_id: null }
          : p,
      ),
    });

    // Persist: delete from SQLite + enqueue sync for each deleted category
    for (const cat of deletedCategories) {
      execute(`DELETE FROM categories WHERE id=$1`, [cat.id])
        .then(() => enqueueSync("category", cat.id, "delete", cat.store_id))
        .catch(() => {});
    }
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
    let newStock: number | null = null;
    if (product) {
      newStock = product.stock + data.delta;
      set({
        stockMovements: [...get().stockMovements, movement],
        products: products.map((p) =>
          p.id === data.product_id ? { ...p, stock: newStock! } : p,
        ),
      });
    } else {
      set({ stockMovements: [...get().stockMovements, movement] });
    }

    // Persist movement to SQLite
    execute(
      `INSERT INTO stock_movements (id, product_id, type, quantity, delta, reference_id, user_id, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
      [movement.id, movement.product_id, movement.type, movement.quantity, movement.delta, movement.reference_id, movement.user_id, movement.store_id, movement.created_at, movement.created_at],
    )
      .then(() => enqueueSync("stock_movement", movement.id, "insert", movement.store_id))
      .catch(() => {});

    // Also persist the product stock update
    if (product && newStock !== null) {
      execute(
        `UPDATE products SET stock=$1, updated_at=$2, sync_status='pending' WHERE id=$3`,
        [newStock, movement.created_at, data.product_id],
      )
        .then(() => enqueueSync("product", data.product_id, "update", product.store_id))
        .catch(() => {});
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
