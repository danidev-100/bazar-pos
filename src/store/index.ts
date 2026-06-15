import { create } from "zustand";

// ──────────────────────────────────────────────
// Page navigation enum (no React Router)
// ──────────────────────────────────────────────

export type Page =
  | "pos"
  | "products"
  | "cash-closing"
  | "billing"
  | "stats";

// ──────────────────────────────────────────────
// Cart item
// ──────────────────────────────────────────────

export type CartItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

// ──────────────────────────────────────────────
// UI state slice
// ──────────────────────────────────────────────

export type UiState = {
  /** Currently visible page. */
  page: Page;
  /** Whether a checkout or sync operation is in progress. */
  busy: boolean;
  /** Toast / notification text, or null when idle. */
  notification: string | null;
};

// ──────────────────────────────────────────────
// Cart state slice
// ──────────────────────────────────────────────

export type CartState = {
  items: CartItem[];
};

// ──────────────────────────────────────────────
// Combined store shape
// ──────────────────────────────────────────────

export type AppStore = {
  // ── Navigation ──
  page: Page;
  setPage: (p: Page) => void;

  // ── UI ──
  busy: boolean;
  setBusy: (b: boolean) => void;
  notification: string | null;
  showNotification: (msg: string) => void;
  dismissNotification: () => void;

  // ── Cart ──
  items: CartItem[];
  addItem: (productId: number, name: string, price: number) => void;
  updateQuantity: (productId: number, qty: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  cartTotal: () => number;
  itemCount: () => number;
};

// ──────────────────────────────────────────────
// Helper: recalculate subtotal
// ──────────────────────────────────────────────

function calcSubtotal(qty: number, price: number): number {
  return Math.round(qty * price * 100) / 100;
}

// ──────────────────────────────────────────────
// Store factory
// ──────────────────────────────────────────────

export const useAppStore = create<AppStore>((set, get) => ({
  // ── Defaults ──
  page: "pos",
  busy: false,
  notification: null,
  items: [],

  // ── Navigation ──
  setPage: (page) => set({ page }),

  // ── UI ──
  setBusy: (busy) => set({ busy }),
  showNotification: (msg) => set({ notification: msg }),
  dismissNotification: () => set({ notification: null }),

  // ── Cart ──
  addItem: (productId, name, price) => {
    if (price <= 0) return;

    const { items } = get();
    const existing = items.find((i) => i.productId === productId);

    if (existing) {
      set({
        items: items.map((i) =>
          i.productId === productId
            ? {
                ...i,
                quantity: i.quantity + 1,
                subtotal: calcSubtotal(i.quantity + 1, i.unitPrice),
              }
            : i,
        ),
      });
    } else {
      set({
        items: [
          ...items,
          {
            productId,
            productName: name,
            quantity: 1,
            unitPrice: price,
            subtotal: price,
          },
        ],
      });
    }
  },

  updateQuantity: (productId, qty) => {
    if (qty < 1) {
      get().removeItem(productId);
      return;
    }
    const { items } = get();
    set({
      items: items.map((i) =>
        i.productId === productId
          ? {
              ...i,
              quantity: qty,
              subtotal: calcSubtotal(qty, i.unitPrice),
            }
          : i,
      ),
    });
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((i) => i.productId !== productId) });
  },

  clearCart: () => set({ items: [] }),

  cartTotal: () => {
    const total = get().items.reduce((sum, i) => sum + i.subtotal, 0);
    return Math.round(total * 100) / 100;
  },

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
