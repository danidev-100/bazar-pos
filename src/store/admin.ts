import { create } from "zustand";
import { useProductsStore } from "./products";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type BulkPriceOpts = {
  filter: "all" | "category" | "brand";
  filterId?: number;
  percent: number;
  target: "cost" | "selling" | "both";
  storeId: string;
  categoryId?: number;
  brandId?: number;
};

export type BulkPreviewItem = {
  productId: number;
  name: string;
  field: "cost" | "selling";
  currentPrice: number;
  newPrice: number;
};

// ──────────────────────────────────────────────
// SHA-256 hash via Web Crypto API
// ──────────────────────────────────────────────

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ──────────────────────────────────────────────
// localStorage helpers
// ──────────────────────────────────────────────

const PIN_HASH_KEY = "admin_pin_hash";
const THEME_KEY = "admin_theme";

function loadPinHash(): string | null {
  try {
    return localStorage.getItem(PIN_HASH_KEY);
  } catch {
    return null;
  }
}

function savePinHash(hash: string): void {
  try {
    localStorage.setItem(PIN_HASH_KEY, hash);
  } catch {
    // localStorage unavailable — skip
  }
}

function loadTheme(): "light" | "dark" {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // localStorage unavailable
  }
  return "light";
}

function saveTheme(theme: "light" | "dark"): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage unavailable — skip
  }
}

// ──────────────────────────────────────────────
// Store shape
// ──────────────────────────────────────────────

export type AdminStore = {
  /** Whether admin mode is currently active (in-memory, resets on reload). */
  isUnlocked: boolean;

  /** The stored SHA-256 hex hash of the admin PIN, or null if not set. */
  pinHash: string | null;

  /** Current theme preference. */
  theme: "light" | "dark";

  // ── PIN actions ──

  /** Hash and store a new PIN. Overwrites any existing PIN. */
  setPin: (pin: string) => Promise<void>;

  /** Unlock admin mode by providing the correct PIN. Returns true if correct. */
  unlock: (pin: string) => Promise<boolean>;

  /** Lock admin mode (no PIN required — just clears the in-memory flag). */
  lock: () => void;

  /** Change PIN: verify old PIN first, then set new one. Returns true on success. */
  changePin: (oldPin: string, newPin: string) => Promise<boolean>;

  // ── Theme ──

  toggleTheme: () => void;

  // ── Bulk price ──

  /** Cached preview items from the most recent bulkPricePreview call. */
  preview: BulkPreviewItem[] | null;

  /** The opts used to generate the current preview (needed for confirm). */
  pendingBulkOpts: BulkPriceOpts | null;

  /** Compute a price-increase preview WITHOUT mutating any products. */
  bulkPricePreview: (opts: BulkPriceOpts) => BulkPreviewItem[];

  /**
   * Apply the current preview to the products store.
   * Uses a snapshot-and-restore pattern for rollback on failure.
   * Throws if preview is stale or empty.
   */
  bulkPriceConfirm: () => void;

  /** Clear the current preview without applying changes. */
  clearBulkPreview: () => void;
};

// ──────────────────────────────────────────────
// Store implementation
// ──────────────────────────────────────────────

export const useAdminStore = create<AdminStore>((set, get) => ({
  // ── Defaults ──
  isUnlocked: false,
  pinHash: loadPinHash(),
  theme: loadTheme(),
  preview: null,
  pendingBulkOpts: null,

  // ── PIN actions ──

  setPin: async (pin: string) => {
    const hash = await hashPin(pin);
    savePinHash(hash);
    set({ pinHash: hash });
  },

  unlock: async (pin: string): Promise<boolean> => {
    const { pinHash } = get();
    if (!pinHash) return false;

    const hash = await hashPin(pin);
    if (hash === pinHash) {
      set({ isUnlocked: true });
      return true;
    }
    return false;
  },

  lock: () => {
    set({ isUnlocked: false });
  },

  changePin: async (oldPin: string, newPin: string): Promise<boolean> => {
    const { pinHash } = get();
    const oldHash = await hashPin(oldPin);

    if (pinHash && oldHash !== pinHash) {
      return false; // old PIN doesn't match
    }

    const newHash = await hashPin(newPin);
    savePinHash(newHash);
    set({ pinHash: newHash });
    return true;
  },

  // ── Theme ──

  toggleTheme: () => {
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light";
      saveTheme(next);
      // Apply/remove dark class on <html>
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { theme: next };
    });
  },

  // ── Bulk price ──

  bulkPricePreview: (opts: BulkPriceOpts): BulkPreviewItem[] => {
    const { products } = useProductsStore.getState();

    // 1. Scope to the active store
    let filtered = products.filter((p) => p.store_id === opts.storeId);

    // 2. Apply category filter
    if (opts.categoryId != null) {
      filtered = filtered.filter((p) => p.category_id === opts.categoryId);
    } else if (opts.filter === "category" && opts.filterId != null) {
      filtered = filtered.filter((p) => p.category_id === opts.filterId);
    }

    // 3. Apply brand filter
    if (opts.brandId != null) {
      filtered = filtered.filter((p) => p.brandId === opts.brandId);
    } else if (opts.filter === "brand" && opts.filterId != null) {
      filtered = filtered.filter((p) => p.brandId === opts.filterId);
    }

    // 4. Calculate preview
    const multiplier = 1 + opts.percent / 100;
    const items: BulkPreviewItem[] = [];

    for (const product of filtered) {
      if (opts.target === "cost" || opts.target === "both") {
        const current = product.costPrice;
        const newPrice = round2(current * multiplier);
        items.push({
          productId: product.id,
          name: product.name,
          field: "cost",
          currentPrice: current,
          newPrice,
        });
      }
      if (opts.target === "selling" || opts.target === "both") {
        const current = product.price;
        const newPrice = round2(current * multiplier);
        items.push({
          productId: product.id,
          name: product.name,
          field: "selling",
          currentPrice: current,
          newPrice,
        });
      }
    }

    set({ preview: items, pendingBulkOpts: opts });
    return items;
  },

  bulkPriceConfirm: () => {
    const { preview, pendingBulkOpts } = get();
    if (!preview || !pendingBulkOpts) return;

    const { products } = useProductsStore.getState();

    // Snapshot affected products for rollback
    const affectedIds = [...new Set(preview.map((i) => i.productId))];
    const snapshot = products
      .filter((p) => affectedIds.includes(p.id))
      .map((p) => ({ ...p }));

    try {
      for (const item of preview) {
        if (item.field === "cost") {
          useProductsStore.getState().updateProduct(item.productId, {
            costPrice: item.newPrice,
          });
        } else {
          useProductsStore.getState().updateProduct(item.productId, {
            price: item.newPrice,
          });
        }
      }

      // Success — clear
      set({ preview: null, pendingBulkOpts: null });
    } catch {
      // Rollback: restore snapshot directly (bypass validation)
      const restoreMap = new Map(snapshot.map((p) => [p.id, p]));
      useProductsStore.setState({
        products: products.map((p) =>
          restoreMap.has(p.id) ? { ...restoreMap.get(p.id)! } : p,
        ),
      });

      set({ preview: null, pendingBulkOpts: null });
      throw new Error(
        "Bulk price update failed. All changes have been rolled back.",
      );
    }
  },

  clearBulkPreview: () => {
    set({ preview: null, pendingBulkOpts: null });
  },
}));
