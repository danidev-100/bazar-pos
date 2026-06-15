import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAdminStore, hashPin, type BulkPriceOpts } from "@/store/admin";
import { useProductsStore } from "@/store/products";
import { useBrandsStore } from "@/store/brands";
import AdminRoute from "@/components/AdminRoute";
import { useAppStore } from "@/store";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Clear localStorage and reset admin store between tests. */
function resetStore() {
  localStorage.removeItem("admin_pin_hash");
  useAdminStore.setState({
    isUnlocked: false,
    pinHash: null,
    theme: "light",
    preview: null,
  });
}

beforeEach(() => {
  resetStore();
});

// ──────────────────────────────────────────────
// hashPin utility
// ──────────────────────────────────────────────

describe("hashPin", () => {
  it("produces a 64-char hex string", async () => {
    const hash = await hashPin("1234");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces deterministic output for the same input", async () => {
    const hash1 = await hashPin("1234");
    const hash2 = await hashPin("1234");
    expect(hash1).toBe(hash2);
  });

  it("produces different output for different inputs", async () => {
    const hash1 = await hashPin("1234");
    const hash2 = await hashPin("5678");
    expect(hash1).not.toBe(hash2);
  });
});

// ──────────────────────────────────────────────
// Admin store — PIN set
// ──────────────────────────────────────────────

describe("Admin store — setPin", () => {
  it("stores the SHA-256 hash in localStorage", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");

    const stored = localStorage.getItem("admin_pin_hash");
    expect(stored).toMatch(/^[0-9a-f]{64}$/);

    // Verify it's actually the SHA-256 of "1234"
    const expectedHash = await hashPin("1234");
    expect(stored).toBe(expectedHash);
  });

  it("updates pinHash in the store", async () => {
    const store = useAdminStore.getState();
    expect(store.pinHash).toBeNull();

    await store.setPin("1234");
    const hash = useAdminStore.getState().pinHash;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("overwrites an existing PIN", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");
    const firstHash = useAdminStore.getState().pinHash;

    await store.setPin("5678");
    const secondHash = useAdminStore.getState().pinHash;

    expect(secondHash).toMatch(/^[0-9a-f]{64}$/);
    expect(secondHash).not.toBe(firstHash);
  });
});

// ──────────────────────────────────────────────
// Admin store — unlock / lock
// ──────────────────────────────────────────────

describe("Admin store — unlock / lock", () => {
  it("unlocks with the correct PIN", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");

    const result = await useAdminStore.getState().unlock("1234");
    expect(result).toBe(true);
    expect(useAdminStore.getState().isUnlocked).toBe(true);
  });

  it("rejects an incorrect PIN", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");

    const result = await useAdminStore.getState().unlock("5678");
    expect(result).toBe(false);
    expect(useAdminStore.getState().isUnlocked).toBe(false);
  });

  it("rejects unlock when no PIN is set", async () => {
    const result = await useAdminStore.getState().unlock("1234");
    expect(result).toBe(false);
    expect(useAdminStore.getState().isUnlocked).toBe(false);
  });

  it("locks and clears isUnlocked", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");
    await useAdminStore.getState().unlock("1234");
    expect(useAdminStore.getState().isUnlocked).toBe(true);

    useAdminStore.getState().lock();
    expect(useAdminStore.getState().isUnlocked).toBe(false);
  });

  it("stays locked after reload (in-memory state)", () => {
    // Simulate a "reload" by checking fresh store state
    expect(useAdminStore.getState().isUnlocked).toBe(false);
  });
});

// ──────────────────────────────────────────────
// Admin store — change PIN
// ──────────────────────────────────────────────

describe("Admin store — changePin", () => {
  it("changes PIN when old PIN is correct", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");

    const result = await useAdminStore.getState().changePin("1234", "5678");
    expect(result).toBe(true);

    // New PIN should work for unlock
    const unlockOk = await useAdminStore.getState().unlock("5678");
    expect(unlockOk).toBe(true);

    // Old PIN should no longer work
    const unlockOld = await useAdminStore.getState().unlock("1234");
    expect(unlockOld).toBe(false);
  });

  it("rejects change when old PIN is incorrect", async () => {
    const store = useAdminStore.getState();
    await store.setPin("1234");

    const result = await useAdminStore.getState().changePin("wrong", "5678");
    expect(result).toBe(false);

    // Old PIN should still work
    const unlockOk = await useAdminStore.getState().unlock("1234");
    expect(unlockOk).toBe(true);
  });

  it("sets first PIN via changePin when none exists", async () => {
    const result = await useAdminStore.getState().changePin("", "1234");
    expect(result).toBe(true);

    const unlockOk = await useAdminStore.getState().unlock("1234");
    expect(unlockOk).toBe(true);
  });
});

// ──────────────────────────────────────────────
// AdminRoute component
// ──────────────────────────────────────────────

describe("AdminRoute", () => {
  beforeEach(() => {
    // Ensure we're not on admin page
    useAppStore.getState().setPage("pos");
  });

  it("renders PIN entry screen when locked", () => {
    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    expect(screen.getByText("Acceso Admin")).toBeTruthy();
    expect(screen.queryByTestId("admin-content")).toBeNull();
  });

  it("renders PIN setup screen when no PIN is set", () => {
    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    expect(
      screen.getByText("Configurá un PIN de admin para acceder a la administración"),
    ).toBeTruthy();
    expect(screen.getByLabelText("Confirmar PIN")).toBeTruthy();
  });

  it("renders unlock screen when PIN is set", async () => {
    await useAdminStore.getState().setPin("1234");

    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    expect(
      screen.getByText("Ingresá tu PIN para desbloquear el modo admin"),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Confirmar PIN")).toBeNull();
    expect(screen.getByPlaceholderText("Ingresá PIN")).toBeTruthy();
  });

  it("renders children when unlocked", async () => {
    await useAdminStore.getState().setPin("1234");
    await useAdminStore.getState().unlock("1234");

    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    expect(screen.getByTestId("admin-content")).toBeTruthy();
    expect(screen.queryByText("Acceso Admin")).toBeNull();
  });

  it("allows user to unlock via PIN entry", async () => {
    const user = userEvent.setup();
    await useAdminStore.getState().setPin("1234");

    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    const input = screen.getByPlaceholderText("Ingresá PIN");
    await user.type(input, "1234");

    const unlockBtn = screen.getByText("Desbloquear");
    await user.click(unlockBtn);

    // Wait for async unlock to complete and re-render
    await waitFor(() => {
      expect(screen.getByTestId("admin-content")).toBeTruthy();
    });
  });

  it("shows error on wrong PIN", async () => {
    const user = userEvent.setup();
    await useAdminStore.getState().setPin("1234");

    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    const input = screen.getByPlaceholderText("Ingresá PIN");
    await user.type(input, "9999");

    const unlockBtn = screen.getByText("Desbloquear");
    await user.click(unlockBtn);

    // userEvent wraps in act — the async state update should flush
    await waitFor(() => {
      expect(screen.getByText("PIN incorrecto")).toBeTruthy();
    });
  });

  it("dismiss button navigates to POS", async () => {
    const user = userEvent.setup();

    render(
      <AdminRoute>
        <div data-testid="admin-content">Secret Admin Stuff</div>
      </AdminRoute>,
    );

    const cancelBtn = screen.getByText("Cancelar");
    await user.click(cancelBtn);

    expect(useAppStore.getState().page).toBe("pos");
  });
});

// ──────────────────────────────────────────────
// Bulk price preview & confirm
// ──────────────────────────────────────────────

describe("Bulk price preview", () => {
  const STORE_A = "store_1";
  const STORE_B = "store_2";

  beforeEach(() => {
    // Reset all relevant stores
    useAdminStore.setState({
      isUnlocked: false,
      pinHash: null,
      theme: "light",
      preview: null,
      pendingBulkOpts: null,
    });
    useProductsStore.setState({
      products: [],
      categories: [],
      stockMovements: [],
    });
    useBrandsStore.setState({ brands: [] });
  });

  function seedProducts() {
    const store = useProductsStore.getState();
    const bebidas = store.addCategory({
      name: "Bebidas",
      parent_id: null,
      store_id: STORE_A,
    });
    const limpieza = store.addCategory({
      name: "Limpieza",
      parent_id: null,
      store_id: STORE_A,
    });

    const coca = useBrandsStore.getState().addBrand({
      name: "Coca-Cola",
      store_id: STORE_A,
    });
    const pepsi = useBrandsStore.getState().addBrand({
      name: "Pepsi",
      store_id: STORE_A,
    });

    store.addProduct({
      barcode: "111",
      name: "Coca-Cola 500ml",
      price: 150,
      stock: 10,
      category_id: bebidas.id,
      costPrice: 100,
      brandId: coca.id,
      store_id: STORE_A,
    });
    store.addProduct({
      barcode: "222",
      name: "Coca-Cola 1L",
      price: 250,
      stock: 5,
      category_id: bebidas.id,
      costPrice: 180,
      brandId: coca.id,
      store_id: STORE_A,
    });
    store.addProduct({
      barcode: "333",
      name: "Pepsi 500ml",
      price: 140,
      stock: 8,
      category_id: bebidas.id,
      costPrice: 90,
      brandId: pepsi.id,
      store_id: STORE_A,
    });
    store.addProduct({
      barcode: "444",
      name: "Detergente",
      price: 300,
      stock: 3,
      category_id: limpieza.id,
      costPrice: 200,
      brandId: null,
      store_id: STORE_A,
    });
    store.addProduct({
      barcode: "555",
      name: "Lavandina",
      price: 180,
      stock: 7,
      category_id: limpieza.id,
      costPrice: 120,
      brandId: null,
      store_id: STORE_A,
    });

    // Product in other store (should never appear in preview)
    store.addProduct({
      barcode: "999",
      name: "Store B Product",
      price: 500,
      stock: 1,
      category_id: null,
      costPrice: 400,
      brandId: null,
      store_id: STORE_B,
    });

    return { bebidas, limpieza, coca, pepsi };
  }

  it("previews all products when no filter is applied", () => {
    seedProducts();
    const opts: BulkPriceOpts = {
      filter: "all",
      percent: 10,
      target: "selling",
      storeId: STORE_A,
    };
    const result = useAdminStore.getState().bulkPricePreview(opts);

    // 5 products in store A, all shown for selling target
    expect(result).toHaveLength(5);
    expect(result.every((i) => i.field === "selling")).toBe(true);
    // Store B product should not be included
    expect(result.find((i) => i.name === "Store B Product")).toBeUndefined();
  });

  it("previews filter by category", () => {
    const { bebidas } = seedProducts();
    const opts: BulkPriceOpts = {
      filter: "category",
      filterId: bebidas.id,
      percent: 10,
      target: "selling",
      storeId: STORE_A,
    };
    const result = useAdminStore.getState().bulkPricePreview(opts);

    // 3 products in Bebidas
    expect(result).toHaveLength(3);
    expect(result.map((i) => i.name).sort()).toEqual([
      "Coca-Cola 1L",
      "Coca-Cola 500ml",
      "Pepsi 500ml",
    ]);
  });

  it("previews filter by brand", () => {
    const { coca } = seedProducts();
    const opts: BulkPriceOpts = {
      filter: "brand",
      filterId: coca.id,
      percent: 10,
      target: "selling",
      storeId: STORE_A,
    };
    const result = useAdminStore.getState().bulkPricePreview(opts);

    // 2 Coca-Cola products
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.name).sort()).toEqual([
      "Coca-Cola 1L",
      "Coca-Cola 500ml",
    ]);
  });

  it("previews filter by brand + category combined", () => {
    const { bebidas, coca } = seedProducts();
    const opts: BulkPriceOpts = {
      filter: "category",
      filterId: bebidas.id,
      percent: 10,
      target: "selling",
      storeId: STORE_A,
      brandId: coca.id,
    };
    const result = useAdminStore.getState().bulkPricePreview(opts);

    // Coca-Cola products in Bebidas only
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.name).sort()).toEqual([
      "Coca-Cola 1L",
      "Coca-Cola 500ml",
    ]);
  });

  it("preview calculates correct new prices for selling target", () => {
    seedProducts();
    const opts: BulkPriceOpts = {
      filter: "all",
      percent: 10,
      target: "selling",
      storeId: STORE_A,
    };
    const result = useAdminStore.getState().bulkPricePreview(opts);

    // Coca-Cola 500ml: price=150 => 165
    const coca = result.find((i) => i.name === "Coca-Cola 500ml")!;
    expect(coca.currentPrice).toBe(150);
    expect(coca.newPrice).toBe(165);

    // Detergente: price=300 => 330
    const det = result.find((i) => i.name === "Detergente")!;
    expect(det.currentPrice).toBe(300);
    expect(det.newPrice).toBe(330);
  });

  it("preview calculates correct new prices for cost target", () => {
    seedProducts();
    const opts: BulkPriceOpts = {
      filter: "all",
      percent: 20,
      target: "cost",
      storeId: STORE_A,
    };
    const result = useAdminStore.getState().bulkPricePreview(opts);

    expect(result.every((i) => i.field === "cost")).toBe(true);

    // Coca-Cola 500ml: costPrice=100 => 120
    const coca = result.find((i) => i.name === "Coca-Cola 500ml")!;
    expect(coca.currentPrice).toBe(100);
    expect(coca.newPrice).toBe(120);
  });

  it("preview shows both cost and selling when target is both", () => {
    seedProducts();
    const opts: BulkPriceOpts = {
      filter: "all",
      percent: 10,
      target: "both",
      storeId: STORE_A,
    };
    const result = useAdminStore.getState().bulkPricePreview(opts);

    // 5 products × 2 fields = 10 items
    expect(result).toHaveLength(10);

    const costItems = result.filter((i) => i.field === "cost");
    const sellingItems = result.filter((i) => i.field === "selling");
    expect(costItems).toHaveLength(5);
    expect(sellingItems).toHaveLength(5);
  });

  it("preview is empty when no products match filter", () => {
    seedProducts();
    const opts: BulkPriceOpts = {
      filter: "category",
      filterId: 9999, // non-existent category
      percent: 10,
      target: "selling",
      storeId: STORE_A,
    };
    const result = useAdminStore.getState().bulkPricePreview(opts);

    expect(result).toHaveLength(0);
  });

  it("preview shows 0 products for 0% increase edge case", () => {
    seedProducts();
    const opts: BulkPriceOpts = {
      filter: "all",
      percent: 0,
      target: "selling",
      storeId: STORE_A,
    };
    const result = useAdminStore.getState().bulkPricePreview(opts);

    // 0% increase still shows products (newPrice === currentPrice)
    expect(result).toHaveLength(5);
    expect(result[0].currentPrice).toBe(result[0].newPrice);
  });

  it("preview handles negative percentage (decrease)", () => {
    seedProducts();
    const opts: BulkPriceOpts = {
      filter: "all",
      percent: -10,
      target: "selling",
      storeId: STORE_A,
    };
    const result = useAdminStore.getState().bulkPricePreview(opts);

    const coca = result.find((i) => i.name === "Coca-Cola 500ml")!;
    expect(coca.currentPrice).toBe(150);
    expect(coca.newPrice).toBe(135); // 150 - 15
  });

  it("preview does not modify product store", () => {
    seedProducts();
    const before = useProductsStore
      .getState()
      .products.map((p) => ({ id: p.id, price: p.price, costPrice: p.costPrice }));

    const opts: BulkPriceOpts = {
      filter: "all",
      percent: 50,
      target: "both",
      storeId: STORE_A,
    };
    useAdminStore.getState().bulkPricePreview(opts);

    const after = useProductsStore
      .getState()
      .products.map((p) => ({ id: p.id, price: p.price, costPrice: p.costPrice }));

    expect(after).toEqual(before);
  });
});

// ──────────────────────────────────────────────
// Bulk price confirm
// ──────────────────────────────────────────────

describe("Bulk price confirm", () => {
  const STORE_A = "store_1";

  beforeEach(() => {
    useAdminStore.setState({
      isUnlocked: false,
      pinHash: null,
      theme: "light",
      preview: null,
      pendingBulkOpts: null,
    });
    useProductsStore.setState({
      products: [],
      categories: [],
      stockMovements: [],
    });
    useBrandsStore.setState({ brands: [] });
  });

  it("confirm updates selling prices and matches preview", () => {
    const store = useProductsStore.getState();
    // Add products directly (no categories/brands needed for this test)
    store.addProduct({
      barcode: "111",
      name: "Product A",
      price: 100,
      stock: 10,
      category_id: null,
      costPrice: 80,
      brandId: null,
      store_id: STORE_A,
    });
    store.addProduct({
      barcode: "222",
      name: "Product B",
      price: 200,
      stock: 5,
      category_id: null,
      costPrice: 150,
      brandId: null,
      store_id: STORE_A,
    });

    // Preview
    const adminStore = useAdminStore.getState();
    const preview = adminStore.bulkPricePreview({
      filter: "all",
      percent: 10,
      target: "selling",
      storeId: STORE_A,
    });

    expect(preview).toHaveLength(2);
    expect(preview[0].newPrice).toBe(110);
    expect(preview[1].newPrice).toBe(220);

    // Confirm
    useAdminStore.getState().bulkPriceConfirm();

    // Verify
    const products = useProductsStore.getState().products;
    const a = products.find((p) => p.name === "Product A")!;
    const b = products.find((p) => p.name === "Product B")!;
    expect(a.price).toBe(110);
    expect(b.price).toBe(220);
    // Cost prices should be unchanged
    expect(a.costPrice).toBe(80);
    expect(b.costPrice).toBe(150);

    // Preview should be cleared after confirm
    expect(useAdminStore.getState().preview).toBeNull();
  });

  it("confirm updates cost prices correctly", () => {
    const store = useProductsStore.getState();
    store.addProduct({
      barcode: "111",
      name: "Product A",
      price: 100,
      stock: 10,
      category_id: null,
      costPrice: 80,
      brandId: null,
      store_id: STORE_A,
    });

    useAdminStore.getState().bulkPricePreview({
      filter: "all",
      percent: 25,
      target: "cost",
      storeId: STORE_A,
    });
    useAdminStore.getState().bulkPriceConfirm();

    const p = useProductsStore.getState().products[0];
    expect(p.costPrice).toBe(100); // 80 * 1.25
    expect(p.price).toBe(100); // unchanged
  });

  it("confirm updates both cost and selling prices", () => {
    const store = useProductsStore.getState();
    store.addProduct({
      barcode: "111",
      name: "Product A",
      price: 100,
      stock: 10,
      category_id: null,
      costPrice: 80,
      brandId: null,
      store_id: STORE_A,
    });

    useAdminStore.getState().bulkPricePreview({
      filter: "all",
      percent: 10,
      target: "both",
      storeId: STORE_A,
    });
    useAdminStore.getState().bulkPriceConfirm();

    const p = useProductsStore.getState().products[0];
    expect(p.costPrice).toBe(88); // 80 * 1.1
    expect(p.price).toBe(110); // 100 * 1.1
  });

  it("cancel (clear preview) does not modify products", () => {
    const store = useProductsStore.getState();
    store.addProduct({
      barcode: "111",
      name: "Product A",
      price: 100,
      stock: 10,
      category_id: null,
      costPrice: 80,
      brandId: null,
      store_id: STORE_A,
    });

    const beforePrice = useProductsStore.getState().products[0].price;

    // Preview then cancel
    useAdminStore.getState().bulkPricePreview({
      filter: "all",
      percent: 50,
      target: "selling",
      storeId: STORE_A,
    });
    useAdminStore.getState().clearBulkPreview();

    // Price should remain unchanged
    expect(useProductsStore.getState().products[0].price).toBe(beforePrice);
    expect(useAdminStore.getState().preview).toBeNull();
  });

  it("confirm with no preview is a no-op (does not throw)", () => {
    expect(() => {
      useAdminStore.getState().bulkPriceConfirm();
    }).not.toThrow();
  });

  it("handles large percentages without overflow", () => {
    const store = useProductsStore.getState();
    store.addProduct({
      barcode: "111",
      name: "Expensive Item",
      price: 9999.99,
      stock: 1,
      category_id: null,
      costPrice: 8000,
      brandId: null,
      store_id: STORE_A,
    });

    const preview = useAdminStore.getState().bulkPricePreview({
      filter: "all",
      percent: 1000,
      target: "selling",
      storeId: STORE_A,
    });

    expect(preview[0].newPrice).toBe(109999.89); // 9999.99 * 11
    expect(isFinite(preview[0].newPrice)).toBe(true);
  });

  it("confirm with filtered preview only updates matching products", () => {
    const store = useProductsStore.getState();
    const cat1 = store.addCategory({ name: "Cat A", parent_id: null, store_id: STORE_A });
    const cat2 = store.addCategory({ name: "Cat B", parent_id: null, store_id: STORE_A });

    store.addProduct({
      barcode: "111",
      name: "In Category A",
      price: 100,
      stock: 10,
      category_id: cat1.id,
      costPrice: 0,
      brandId: null,
      store_id: STORE_A,
    });
    store.addProduct({
      barcode: "222",
      name: "In Category B",
      price: 200,
      stock: 5,
      category_id: cat2.id,
      costPrice: 0,
      brandId: null,
      store_id: STORE_A,
    });

    // Preview only Cat A
    useAdminStore.getState().bulkPricePreview({
      filter: "category",
      filterId: cat1.id,
      percent: 10,
      target: "selling",
      storeId: STORE_A,
    });
    useAdminStore.getState().bulkPriceConfirm();

    const products = useProductsStore.getState().products;
    const a = products.find((p) => p.name === "In Category A")!;
    const b = products.find((p) => p.name === "In Category B")!;
    expect(a.price).toBe(110);
    expect(b.price).toBe(200); // unchanged
  });
});
