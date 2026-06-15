import { describe, it, expect, beforeEach } from "vitest";
import { useProductsStore } from "@/store/products";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const STORE_A = "store_1";
const STORE_B = "store_2";

function resetStore() {
  // Zustand stores don't have a built-in reset.
  // We re-initialize by calling the store's actions to clear everything.
  useProductsStore.setState({
    products: [],
    categories: [],
    stockMovements: [],
  });
}

beforeEach(() => {
  resetStore();
});

// ──────────────────────────────────────────────
// 2.5 — Product CRUD
// ──────────────────────────────────────────────

describe("Product CRUD", () => {
  it("creates a product with initial stock of 0", () => {
    const store = useProductsStore.getState();
    const product = store.addProduct({
      barcode: "77912345",
      name: "Coca-Cola 500ml",
      price: 150.0,
      stock: 0,
      category_id: null,
      store_id: STORE_A,
    });

    expect(product.id).toBeGreaterThan(0);
    expect(product.name).toBe("Coca-Cola 500ml");
    expect(product.price).toBe(150.0);
    expect(product.stock).toBe(0);
    expect(product.store_id).toBe(STORE_A);

    const products = useProductsStore.getState().products;
    expect(products).toHaveLength(1);
  });

  it("updates a product's name and price", () => {
    const store = useProductsStore.getState();
    const product = store.addProduct({
      barcode: "77912345",
      name: "Coca-Cola 500ml",
      price: 150.0,
      stock: 0,
      category_id: null,
      store_id: STORE_A,
    });

    useProductsStore.getState().updateProduct(product.id, {
      name: "Coca-Cola 600ml",
      price: 180.0,
    });

    const updated = useProductsStore
      .getState()
      .products.find((p) => p.id === product.id);
    expect(updated?.name).toBe("Coca-Cola 600ml");
    expect(updated?.price).toBe(180.0);
  });

  it("deletes a product and removes its movements", () => {
    const store = useProductsStore.getState();
    const product = store.addProduct({
      barcode: "77912345",
      name: "Coca-Cola 500ml",
      price: 150.0,
      stock: 0,
      category_id: null,
      costPrice: 0,
      brandId: null,
      store_id: STORE_A,
    });

    // Record a movement first
    store.recordMovement({
      product_id: product.id,
      type: "purchase",
      quantity: 10,
      delta: 10,
      reference_id: null,
      user_id: null,
      store_id: STORE_A,
    });

    useProductsStore.getState().deleteProduct(product.id);

    const state = useProductsStore.getState();
    expect(state.products.find((p) => p.id === product.id)).toBeUndefined();
    expect(
      state.stockMovements.filter((m) => m.product_id === product.id),
    ).toHaveLength(0);
  });

  it("filters products by store", () => {
    const store = useProductsStore.getState();
    store.addProduct({
      barcode: "111",
      name: "Product A",
      price: 10,
      stock: 0,
      category_id: null,
      store_id: STORE_A,
    });
    store.addProduct({
      barcode: "222",
      name: "Product B",
      price: 20,
      stock: 0,
      category_id: null,
      store_id: STORE_B,
    });
    store.addProduct({
      barcode: "333",
      name: "Product C",
      price: 30,
      stock: 0,
      category_id: null,
      store_id: STORE_A,
    });

    const storeAProducts =
      useProductsStore.getState().getProductsByStore(STORE_A);
    const storeBProducts =
      useProductsStore.getState().getProductsByStore(STORE_B);

    expect(storeAProducts).toHaveLength(2);
    expect(storeBProducts).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────
// 2.5 — Barcode uniqueness
// ──────────────────────────────────────────────

describe("Barcode uniqueness", () => {
  it("accepts a unique barcode in the same store", () => {
    const store = useProductsStore.getState();
    store.addProduct({
      barcode: "77912345",
      name: "Product One",
      price: 100,
      stock: 0,
      category_id: null,
      store_id: STORE_A,
    });

    expect(() => {
      store.addProduct({
        barcode: "77912346",
        name: "Product Two",
        price: 200,
        stock: 0,
        category_id: null,
        store_id: STORE_A,
      });
    }).not.toThrow();
  });

  it("rejects a duplicate barcode in the same store", () => {
    const store = useProductsStore.getState();
    store.addProduct({
      barcode: "77912345",
      name: "Product One",
      price: 100,
      stock: 0,
      category_id: null,
      store_id: STORE_A,
    });

    expect(() => {
      store.addProduct({
        barcode: "77912345",
        name: "Product Two",
        price: 200,
        stock: 0,
        category_id: null,
        store_id: STORE_A,
      });
    }).toThrow(/already exists/);
  });

  it("allows same barcode in different stores", () => {
    const store = useProductsStore.getState();
    store.addProduct({
      barcode: "77912345",
      name: "Product A",
      price: 100,
      stock: 0,
      category_id: null,
      store_id: STORE_A,
    });

    expect(() => {
      store.addProduct({
        barcode: "77912345",
        name: "Product B in store 2",
        price: 200,
        stock: 0,
        category_id: null,
        store_id: STORE_B,
      });
    }).not.toThrow();
  });

  it("accepts an empty barcode (barcode is optional)", () => {
    const store = useProductsStore.getState();
    const product = store.addProduct({
      barcode: null,
      name: "Product Without Barcode",
      price: 50,
      stock: 0,
      category_id: null,
      store_id: STORE_A,
    });

    expect(product.barcode).toBeNull();
  });

  it("rejects duplicate barcode on update", () => {
    const store = useProductsStore.getState();
    const p1 = store.addProduct({
      barcode: "111",
      name: "Product One",
      price: 100,
      stock: 0,
      category_id: null,
      store_id: STORE_A,
    });
    store.addProduct({
      barcode: "222",
      name: "Product Two",
      price: 200,
      stock: 0,
      category_id: null,
      store_id: STORE_A,
    });

    expect(() => {
      useProductsStore.getState().updateProduct(p1.id, {
        barcode: "222",
      });
    }).toThrow(/already exists/);
  });
});

// ──────────────────────────────────────────────
// 2.5 — Category CRUD
// ──────────────────────────────────────────────

describe("Category CRUD", () => {
  it("creates a root category", () => {
    const store = useProductsStore.getState();
    const cat = store.addCategory({
      name: "Bebidas",
      parent_id: null,
      store_id: STORE_A,
    });

    expect(cat.id).toBeGreaterThan(0);
    expect(cat.name).toBe("Bebidas");
    expect(cat.parent_id).toBeNull();
  });

  it("creates a nested subcategory", () => {
    const store = useProductsStore.getState();
    const parent = store.addCategory({
      name: "Bebidas",
      parent_id: null,
      store_id: STORE_A,
    });
    const child = store.addCategory({
      name: "Gaseosas",
      parent_id: parent.id,
      store_id: STORE_A,
    });

    expect(child.parent_id).toBe(parent.id);

    const children = useProductsStore.getState().getChildCategories(parent.id);
    expect(children).toHaveLength(1);
    expect(children[0].name).toBe("Gaseosas");
  });

  it("rejects duplicate category name in same store and parent", () => {
    const store = useProductsStore.getState();
    store.addCategory({
      name: "Bebidas",
      parent_id: null,
      store_id: STORE_A,
    });

    expect(() => {
      store.addCategory({
        name: "Bebidas",
        parent_id: null,
        store_id: STORE_A,
      });
    }).toThrow(/already exists/);
  });

  it("allows same category name under different parents", () => {
    const store = useProductsStore.getState();
    const parent1 = store.addCategory({
      name: "Almacén",
      parent_id: null,
      store_id: STORE_A,
    });
    const parent2 = store.addCategory({
      name: "Limpieza",
      parent_id: null,
      store_id: STORE_A,
    });

    expect(() => {
      store.addCategory({ name: "Marca X", parent_id: parent1.id, store_id: STORE_A });
      store.addCategory({ name: "Marca X", parent_id: parent2.id, store_id: STORE_A });
    }).not.toThrow();
  });

  it("deletes a category and uncategorizes its products", () => {
    const store = useProductsStore.getState();
    const cat = store.addCategory({
      name: "Bebidas",
      parent_id: null,
      store_id: STORE_A,
    });
    store.addProduct({
      barcode: "111",
      name: "Coca-Cola",
      price: 150,
      stock: 10,
      category_id: cat.id,
      store_id: STORE_A,
    });

    useProductsStore.getState().deleteCategory(cat.id);

    const remaining = useProductsStore.getState().categories;
    expect(remaining.find((c) => c.id === cat.id)).toBeUndefined();

    const product = useProductsStore.getState().products[0];
    expect(product.category_id).toBeNull();
  });

  it("deletes a category and all its descendants", () => {
    const store = useProductsStore.getState();
    const parent = store.addCategory({ name: "Bebidas", parent_id: null, store_id: STORE_A });
    const child = store.addCategory({ name: "Gaseosas", parent_id: parent.id, store_id: STORE_A });
    store.addCategory({ name: "Cola", parent_id: child.id, store_id: STORE_A });

    useProductsStore.getState().deleteCategory(parent.id);

    const remaining = useProductsStore.getState().categories;
    expect(remaining).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────
// 2.5 — Stock movement recording
// ──────────────────────────────────────────────

describe("Stock movements", () => {
  it("records a purchase movement and updates stock", () => {
    const store = useProductsStore.getState();
    const product = store.addProduct({
      barcode: "111",
      name: "Test Product",
      price: 100,
      stock: 5,
      category_id: null,
      store_id: STORE_A,
    });

    store.recordMovement({
      product_id: product.id,
      type: "purchase",
      quantity: 15,
      delta: 10,
      reference_id: null,
      user_id: null,
      store_id: STORE_A,
    });

    const updated = useProductsStore.getState().products.find((p) => p.id === product.id);
    expect(updated?.stock).toBe(15);

    const movements = useProductsStore.getState().stockMovements;
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe("purchase");
    expect(movements[0].delta).toBe(10);
  });

  it("records a sale deduction movement", () => {
    const store = useProductsStore.getState();
    const product = store.addProduct({
      barcode: "111",
      name: "Test Product",
      price: 100,
      stock: 10,
      category_id: null,
      store_id: STORE_A,
    });

    store.recordMovement({
      product_id: product.id,
      type: "sale",
      quantity: 7,
      delta: -3,
      reference_id: "sale_001",
      user_id: null,
      store_id: STORE_A,
    });

    const updated = useProductsStore.getState().products.find((p) => p.id === product.id);
    expect(updated?.stock).toBe(7);

    const movement = useProductsStore.getState().stockMovements[0];
    expect(movement.type).toBe("sale");
    expect(movement.delta).toBe(-3);
    expect(movement.reference_id).toBe("sale_001");
  });

  it("records a manual adjustment movement", () => {
    const store = useProductsStore.getState();
    const product = store.addProduct({
      barcode: "111",
      name: "Test Product",
      price: 100,
      stock: 10,
      category_id: null,
      store_id: STORE_A,
    });

    useProductsStore.getState().adjustStock(product.id, 12);

    const updated = useProductsStore.getState().products.find((p) => p.id === product.id);
    expect(updated?.stock).toBe(12);

    const movement = useProductsStore.getState().stockMovements[0];
    expect(movement.type).toBe("adjustment");
    expect(movement.delta).toBe(2);
  });

  it("allows negative stock (track shortage)", () => {
    const store = useProductsStore.getState();
    const product = store.addProduct({
      barcode: "111",
      name: "Test Product",
      price: 100,
      stock: 1,
      category_id: null,
      store_id: STORE_A,
    });

    store.recordMovement({
      product_id: product.id,
      type: "sale",
      quantity: -1,
      delta: -2,
      reference_id: "sale_002",
      user_id: null,
      store_id: STORE_A,
    });

    const updated = useProductsStore.getState().products.find((p) => p.id === product.id);
    expect(updated?.stock).toBe(-1);
  });

  it("records both movements and they are accessible by product", () => {
    const store = useProductsStore.getState();
    const product = store.addProduct({
      barcode: "111",
      name: "Test Product",
      price: 100,
      stock: 0,
      category_id: null,
      store_id: STORE_A,
    });

    useProductsStore.getState().recordMovement({
      product_id: product.id,
      type: "purchase",
      quantity: 10,
      delta: 10,
      reference_id: null,
      user_id: null,
      store_id: STORE_A,
    });

    useProductsStore.getState().adjustStock(product.id, 5);

    const movements = useProductsStore.getState().getMovementsByProduct(product.id);
    expect(movements).toHaveLength(2);

    const types = movements.map((m) => m.type).sort();
    expect(types).toEqual(["adjustment", "purchase"]);
    expect(movements.every((m) => m.product_id === product.id)).toBe(true);
  });
});

// ──────────────────────────────────────────────
// 2.6 — Store isolation
// ──────────────────────────────────────────────

describe("Store isolation", () => {
  it("querying store A products from store B context returns empty", () => {
    const store = useProductsStore.getState();
    store.addProduct({
      barcode: "111",
      name: "Store A Product",
      price: 100,
      stock: 5,
      category_id: null,
      store_id: STORE_A,
    });

    const storeBProducts = useProductsStore.getState().getProductsByStore(STORE_B);
    expect(storeBProducts).toHaveLength(0);
  });

  it("categories are isolated per store", () => {
    const store = useProductsStore.getState();
    store.addCategory({ name: "Bebidas", parent_id: null, store_id: STORE_A });
    store.addCategory({ name: "Limpieza", parent_id: null, store_id: STORE_B });

    const storeACats = useProductsStore.getState().getCategoriesByStore(STORE_A);
    const storeBCats = useProductsStore.getState().getCategoriesByStore(STORE_B);

    expect(storeACats).toHaveLength(1);
    expect(storeACats[0].name).toBe("Bebidas");

    expect(storeBCats).toHaveLength(1);
    expect(storeBCats[0].name).toBe("Limpieza");
  });

  it("stock movements are isolated per store", () => {
    const store = useProductsStore.getState();
    const p1 = store.addProduct({
      barcode: "111",
      name: "Product A",
      price: 100,
      stock: 0,
      category_id: null,
      store_id: STORE_A,
    });
    const p2 = store.addProduct({
      barcode: "222",
      name: "Product B",
      price: 200,
      stock: 0,
      category_id: null,
      store_id: STORE_B,
    });

    store.recordMovement({
      product_id: p1.id,
      type: "purchase",
      quantity: 10,
      delta: 10,
      reference_id: null,
      user_id: null,
      store_id: STORE_A,
    });
    store.recordMovement({
      product_id: p2.id,
      type: "purchase",
      quantity: 20,
      delta: 20,
      reference_id: null,
      user_id: null,
      store_id: STORE_B,
    });

    const movementsA = useProductsStore.getState().getMovementsByStore(STORE_A);
    const movementsB = useProductsStore.getState().getMovementsByStore(STORE_B);

    expect(movementsA).toHaveLength(1);
    expect(movementsB).toHaveLength(1);
    // No cross-contamination
    expect(movementsA[0].product_id).toBe(p1.id);
    expect(movementsB[0].product_id).toBe(p2.id);
  });
});
