import { create } from "zustand";
import { useProductsStore } from "./products";
import { useCustomersStore, type Customer } from "./customers";
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
  | "user-management"
  | "proveedores"
  | "pedidos";

// ──────────────────────────────────────────────
// Cart item
// ──────────────────────────────────────────────

export type CartItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountPercent: number; // 0–100, per-item discount
};

// ──────────────────────────────────────────────
// Completed sale record
// ──────────────────────────────────────────────

export type CompletedSale = {
  id: number;
  items: CartItem[];
  total: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  paymentMethod: "cash" | "card" | "mixed" | "credit";
  amountPaid: number | null;
  cashAmount: number | null;
  cardAmount: number | null;
  change: number | null;
  date: string;
  storeId: string;
  customerName: string | null;
  status: "completed" | "refunded";
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
  setItemDiscount: (productId: number, discountPercent: number) => void;
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

  // ── Discount ──
  globalDiscountPercent: number;
  setGlobalDiscount: (percent: number) => void;

  // ── Sales ──
  lastCompletedSale: CompletedSale | null;
  completedSales: CompletedSale[];
  checkout: (
    paymentMethod: "cash" | "card" | "mixed" | "credit",
    amountPaid?: number,
    storeId?: string,
    customerName?: string,
    cashAmount?: number,
    cardAmount?: number,
  ) => CompletedSale;
  refundSale: (saleId: number) => void;
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
  globalDiscountPercent: 0,

  // ── Navigation ──
  setPage: (page) => set({ page }),

  // ── Discount ──
  setGlobalDiscount: (percent) => set({ globalDiscountPercent: Math.max(0, Math.min(100, percent)) }),
  setItemDiscount: (productId, discountPercent) => {
    const clamped = Math.max(0, Math.min(100, discountPercent));
    set({
      items: get().items.map((i) =>
        i.productId === productId ? { ...i, discountPercent: clamped } : i,
      ),
    });
  },

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
            discountPercent: 0,
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

  cartTotal: () => {
    const { items, globalDiscountPercent } = get();
    const subtotal = items.reduce((sum, i) => {
      const itemDiscount = i.discountPercent > 0 ? i.subtotal * i.discountPercent / 100 : 0;
      return sum + i.subtotal - itemDiscount;
    }, 0);
    const globalDiscount = globalDiscountPercent > 0 ? subtotal * globalDiscountPercent / 100 : 0;
    const total = Math.round((subtotal - globalDiscount) * 100) / 100;
    return total;
  },

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  // ── Cart Selection ──
  selectCartItem: (productId) => set({ selectedCartItemId: productId }),
  clearSelectedCartItem: () => set({ selectedCartItemId: null }),

  // ── Sales / Checkout ──

  checkout: (paymentMethod, amountPaid, storeId, customerName, cashAmount, cardAmount) => {
    const { items, cartTotal, globalDiscountPercent } = get();
    if (items.length === 0) {
      throw new Error("Cannot checkout with an empty cart");
    }

    const total = cartTotal();
    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
    const discountAmount = Math.round((subtotal - total) * 100) / 100;

    let change: number | null = null;
    if (paymentMethod === "cash" && amountPaid != null) {
      change = Math.round((amountPaid - total) * 100) / 100;
      if (amountPaid < total) {
        throw new Error(`Pago insuficiente: $${amountPaid.toFixed(2)} es menor al total de $${total.toFixed(2)}`);
      }
    }
    if (paymentMethod === "mixed") {
      const cash = cashAmount ?? 0;
      const card = cardAmount ?? 0;
      const paid = cash + card;
      if (paid < total) {
        throw new Error(`Total ingresado: $${paid.toFixed(2)} — faltan $${(total - paid).toFixed(2)}`);
      }
      change = Math.round((cash - (total - card)) * 100) / 100;
    }
    if (paymentMethod === "credit") {
      // Sale goes through — customer balance will be increased
    }

    const resolvedStoreId = storeId ?? "store_1";

    const resolvedPayment = paymentMethod;
    const paidAmount = paymentMethod === "mixed" ? (cashAmount ?? 0) + (cardAmount ?? 0) : (amountPaid ?? null);

    const sale: CompletedSale = {
      id: nextSaleId++,
      items: items.map((i) => ({ ...i })),
      total,
      subtotal,
      discountPercent: globalDiscountPercent,
      discountAmount,
      paymentMethod: resolvedPayment,
      amountPaid: paidAmount,
      cashAmount: paymentMethod === "mixed" ? (cashAmount ?? 0) : (paymentMethod === "cash" ? amountPaid ?? null : null),
      cardAmount: paymentMethod === "mixed" ? (cardAmount ?? 0) : (paymentMethod === "card" ? total : null),
      change,
      date: new Date().toISOString(),
      storeId: resolvedStoreId,
      customerName: customerName ?? null,
      status: "completed",
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

    // ── Update customer credit balance ──
    if (paymentMethod === "credit" && customerName) {
      const { updateCreditBalance } = useCustomersStore.getState();
      const customer = useCustomersStore.getState().customers.find(
        (c) => c.name === customerName && c.store_id === resolvedStoreId,
      );
      if (customer) {
        updateCreditBalance(customer.id, total, resolvedStoreId, `Venta #${sale.id}`, sale.id);
      }
    }

    // ── Persist sale to SQLite ──
    const now = new Date().toISOString();
    const dbCash = paymentMethod === "mixed" ? (cashAmount ?? 0) : paymentMethod === "cash" ? (amountPaid ?? null) : null;
    const dbCard = paymentMethod === "mixed" ? (cardAmount ?? 0) : paymentMethod === "card" ? total : null;
    execute(
      `INSERT INTO sales (id, total, payment_method, cash_amount, card_amount, change, status, customer_name, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')`,
      [sale.id, total, paymentMethod, dbCash, dbCard, change, "completed", sale.customerName, resolvedStoreId, now, now],
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

  refundSale: (saleId) => {
    const sale = get().completedSales.find((s) => s.id === saleId);
    if (!sale || sale.status === "refunded") return;

    // Reverse stock movements
    const { recordMovement } = useProductsStore.getState();
    for (const item of sale.items) {
      recordMovement({
        product_id: item.productId,
        type: "adjustment",
        quantity: item.quantity,
        delta: item.quantity,
        reference_id: `refund-${sale.id}`,
        user_id: null,
        store_id: sale.storeId,
      });
    }

    // Mark sale as refunded in memory
    set({
      completedSales: get().completedSales.map((s) =>
        s.id === saleId ? { ...s, status: "refunded" as const } : s,
      ),
    });

    // Update SQLite
    const now = new Date().toISOString();
    execute(
      `UPDATE sales SET status='refunded', updated_at=$1, sync_status='pending' WHERE id=$2`,
      [now, saleId],
    )
      .then(() => enqueueSync("sale", saleId, "update", sale.storeId))
      .catch(() => {});
  },

  dismissReceipt: () => set({ lastCompletedSale: null }),

  // ── Customer selection ──
  selectCustomer: (customer) => set({ selectedCustomer: customer }),
}));

// Re-export stores for convenience
export { useAdminStore } from "./admin";
export { useAuthStore } from "./auth";
export { useExpensesStore } from "./expenses";
