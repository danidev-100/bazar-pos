import { describe, it, expect, beforeEach } from "vitest";
import { useBrandsStore } from "@/store/brands";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const STORE_A = "store_1";
const STORE_B = "store_2";

function resetStore() {
  useBrandsStore.setState({ brands: [] });
}

beforeEach(() => {
  resetStore();
});

// ──────────────────────────────────────────────
// Brands CRUD
// ──────────────────────────────────────────────

describe("Brands CRUD", () => {
  it("creates a brand with a name and store_id", () => {
    const store = useBrandsStore.getState();
    const brand = store.addBrand({
      name: "Coca-Cola",
      store_id: STORE_A,
    });

    expect(brand.id).toBeGreaterThan(0);
    expect(brand.name).toBe("Coca-Cola");
    expect(brand.store_id).toBe(STORE_A);

    const brands = useBrandsStore.getState().brands;
    expect(brands).toHaveLength(1);
  });

  it("updates a brand's name", () => {
    const store = useBrandsStore.getState();
    const brand = store.addBrand({
      name: "Coca-Cola",
      store_id: STORE_A,
    });

    useBrandsStore.getState().updateBrand(brand.id, {
      name: "Coca-Cola Zero",
    });

    const updated = useBrandsStore
      .getState()
      .brands.find((b) => b.id === brand.id);
    expect(updated?.name).toBe("Coca-Cola Zero");
  });

  it("deletes a brand", () => {
    const store = useBrandsStore.getState();
    const brand = store.addBrand({
      name: "Coca-Cola",
      store_id: STORE_A,
    });

    useBrandsStore.getState().deleteBrand(brand.id);

    const remaining = useBrandsStore.getState().brands;
    expect(remaining.find((b) => b.id === brand.id)).toBeUndefined();
  });

  it("lists brands alphabetically by name", () => {
    const store = useBrandsStore.getState();
    store.addBrand({ name: "Pepsi", store_id: STORE_A });
    store.addBrand({ name: "Coca-Cola", store_id: STORE_A });
    store.addBrand({ name: "Seven Up", store_id: STORE_A });

    const result = useBrandsStore.getState().getBrandsByStore(STORE_A);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("Coca-Cola");
    expect(result[1].name).toBe("Pepsi");
    expect(result[2].name).toBe("Seven Up");
  });
});

// ──────────────────────────────────────────────
// Duplicate name rejection
// ──────────────────────────────────────────────

describe("Duplicate brand name", () => {
  it("rejects a duplicate brand name in the same store", () => {
    const store = useBrandsStore.getState();
    store.addBrand({ name: "Coca-Cola", store_id: STORE_A });

    expect(() => {
      store.addBrand({ name: "Coca-Cola", store_id: STORE_A });
    }).toThrow(/already exists/);
  });

  it("allows same brand name in different stores", () => {
    const store = useBrandsStore.getState();
    store.addBrand({ name: "Coca-Cola", store_id: STORE_A });

    expect(() => {
      store.addBrand({ name: "Coca-Cola", store_id: STORE_B });
    }).not.toThrow();

    const storeBBrands = useBrandsStore.getState().getBrandsByStore(STORE_B);
    expect(storeBBrands).toHaveLength(1);
    expect(storeBBrands[0].name).toBe("Coca-Cola");
  });

  it("rejects duplicate name on update", () => {
    const store = useBrandsStore.getState();
    const b1 = store.addBrand({ name: "Coca-Cola", store_id: STORE_A });
    store.addBrand({ name: "Pepsi", store_id: STORE_A });

    expect(() => {
      useBrandsStore.getState().updateBrand(b1.id, { name: "Pepsi" });
    }).toThrow(/already exists/);
  });

  it("allows updating a brand to its own name (no-op)", () => {
    const store = useBrandsStore.getState();
    const brand = store.addBrand({ name: "Coca-Cola", store_id: STORE_A });

    expect(() => {
      useBrandsStore.getState().updateBrand(brand.id, { name: "Coca-Cola" });
    }).not.toThrow();
  });
});

// ──────────────────────────────────────────────
// Store isolation
// ──────────────────────────────────────────────

describe("Store isolation", () => {
  it("brands are isolated per store", () => {
    const store = useBrandsStore.getState();
    store.addBrand({ name: "Coca-Cola", store_id: STORE_A });
    store.addBrand({ name: "Pepsi", store_id: STORE_B });

    const storeABrands = useBrandsStore.getState().getBrandsByStore(STORE_A);
    const storeBBrands = useBrandsStore.getState().getBrandsByStore(STORE_B);

    expect(storeABrands).toHaveLength(1);
    expect(storeABrands[0].name).toBe("Coca-Cola");

    expect(storeBBrands).toHaveLength(1);
    expect(storeBBrands[0].name).toBe("Pepsi");
  });

  it("querying store A brands from store B returns empty", () => {
    const store = useBrandsStore.getState();
    store.addBrand({ name: "Coca-Cola", store_id: STORE_A });

    const storeBBrands = useBrandsStore.getState().getBrandsByStore(STORE_B);
    expect(storeBBrands).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────
// Edge cases
// ──────────────────────────────────────────────

describe("Brand edge cases", () => {
  it("can have multiple brands in the same store", () => {
    const store = useBrandsStore.getState();
    store.addBrand({ name: "Brand A", store_id: STORE_A });
    store.addBrand({ name: "Brand B", store_id: STORE_A });
    store.addBrand({ name: "Brand C", store_id: STORE_A });

    const brands = useBrandsStore.getState().getBrandsByStore(STORE_A);
    expect(brands).toHaveLength(3);
  });

  it("deleting unused brand has no side effects", () => {
    const store = useBrandsStore.getState();
    const brand = store.addBrand({ name: "Unused", store_id: STORE_A });

    useBrandsStore.getState().deleteBrand(brand.id);

    const remaining = useBrandsStore.getState().brands;
    expect(remaining).toHaveLength(0);
  });
});
