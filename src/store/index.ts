import { create } from "zustand";
import { useProductsStore } from "./products";
import { type Customer } from "./customers";
import { execute, enqueueSync } from "@/lib/db";

// ──────────────────────────────────────────────
// Page navigation enum (no React Router)
// ──────────────────────────────────────────────

export type Page =
  | "pos"
  | "products"
  | "cash-closing"
  | "billing"
  | "stats"
  | "admin"
  | "customers"
  | "dashboard"
  | "expenses"
  | "login"
  | "user-management";

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
// Completed sale record
// ──────────────────────────────────────────────

export type CompletedSale = {
  id: number;
  items: CartItem[];
  total: number;
  paymentMethod: "cash" | "card";
  amountPaid: number | null;
  change: number | null;
  date: string;
  storeId: string;
  customerName: string | null;
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

  // ── Cart selection (keyboard shortcuts) ──
  selectedCartItemId: number | null;
  selectCartItem: (productId: number) => void;
  clearSelectedCartItem: () => void;

  // ── Customer selection ──
  selectedCustomer: Customer | null;
  selectCustomer: (customer: Customer | null) => void;

  // ── Sales ──
  lastCompletedSale: CompletedSale | null;
  completedSales: CompletedSale[];
  checkout: (
    paymentMethod: "cash" | "card",
    amountPaid?: number,
    storeId?: string,
    customerName?: string,
  ) => CompletedSale;
  dismissReceipt: () => void;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function calcSubtotal(qty: number, price: number): number {
  return Math.round(qty * price * 100) / 100;
}

let nextSaleId = 1;
let nextSaleItemId = 1;

// ──────────────────────────────────────────────
// Store factory
// ──────────────────────────────────────────────

export const useAppStore = create<AppStore>((set, get) => ({
  // ── Defaults ──
  page: "dashboard",
  busy: false,
  notification: null,
  items: [],
  lastCompletedSale: null,
  completedSales: [],
  selectedCustomer: null,
  selectedCartItemId: null,

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

  clearCart: () => set({ items: [], selectedCartItemId: null }),

  // ── Cart Selection ──
  selectCartItem: (productId) => set({ selectedCartItemId: productId }),
  clearSelectedCartItem: () => set({ selectedCartItemId: null }),

  cartTotal: () => {
    const total = get().items.reduce((sum, i) => sum + i.subtotal, 0);
    return Math.round(total * 100) / 100;
  },

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  // ── Sales / Checkout ──

  checkout: (paymentMethod, amountPaid, storeId, customerName) => {
    const { items, cartTotal } = get();
    if (items.length === 0) {
      throw new Error("Cannot checkout with an empty cart");
    }

    const total = cartTotal();
    const change =
      paymentMethod === "cash" && amountPaid != null
        ? Math.round((amountPaid - total) * 100) / 100
        : null;

    if (paymentMethod === "cash" && amountPaid != null && amountPaid < total) {
      throw new Error(
        `Insufficient payment: $${amountPaid.toFixed(2)} is less than the total of $${total.toFixed(2)}`,
      );
    }

    const resolvedStoreId = storeId ?? "store_1";

    const sale: CompletedSale = {
      id: nextSaleId++,
      items: items.map((i) => ({ ...i })),
      total,
      paymentMethod,
      amountPaid: amountPaid ?? null,
      change,
      date: new Date().toISOString(),
      storeId: resolvedStoreId,
      customerName: customerName ?? null,
    };

    set({
      items: [],
      lastCompletedSale: sale,
      completedSales: [...get().completedSales, sale],
    });

    // ── Record stock movements for each item ──
    const { recordMovement } = useProductsStore.getState();
    for (const item of items) {
      recordMovement({
        product_id: item.productId,
        type: "sale",
        quantity: item.quantity,
        delta: -item.quantity,
        reference_id: `sale-${sale.id}`,
        user_id: null,
        store_id: sale.storeId,
      });
    }

    // ── Persist sale to SQLite ──
    const now = new Date().toISOString();
    const cashAmount = paymentMethod === "cash" ? (amountPaid ?? null) : null;
    const cardAmount = paymentMethod === "card" ? total : null;
    execute(
      `INSERT INTO sales (id, total, payment_method, cash_amount, card_amount, change, status, customer_name, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')`,
      [sale.id, total, paymentMethod, cashAmount, cardAmount, change, "completed", sale.customerName, resolvedStoreId, now, now],
    )
      .then(async () => {
        await enqueueSync("sale", sale.id, "insert", resolvedStoreId);

        // ── Persist sale items ──
        for (const item of sale.items) {
          const saleItemId = nextSaleItemId++;
          await execute(
            `INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, subtotal, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
            [saleItemId, sale.id, item.productId, item.productName, item.quantity, item.unitPrice, item.subtotal, resolvedStoreId, now, now],
          );
          await enqueueSync("sale_item", saleItemId, "insert", resolvedStoreId);
        }
      })
      .catch(() => {});

    return sale;
  },

  dismissReceipt: () => set({ lastCompletedSale: null }),

  // ── Customer selection ──
  selectCustomer: (customer) => set({ selectedCustomer: customer }),
}));

// Re-export stores for convenience
export { useAdminStore } from "./admin";
export { useAuthStore } from "./auth";
export { useExpensesStore } from "./expenses";
