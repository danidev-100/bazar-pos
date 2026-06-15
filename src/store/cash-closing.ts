import { create } from "zustand";
import type { CompletedSale } from "@/store";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type Shift = {
  id: number;
  employee: string;
  openTime: string;
  closeTime: string | null;
  status: "open" | "closed";
  storeId: string;
  declaredCash: number | null;
  variance: number | null;
  reconciliationStatus: "pending" | "matched" | "mismatch" | null;
  reconciledAt: string | null;
};

export type ShiftSummary = {
  shift: Shift;
  totalSales: number;
  cashTotal: number;
  cardTotal: number;
  transactionCount: number;
  itemCount: number;
  topProducts: { name: string; quantity: number; total: number }[];
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

let nextShiftId = 1;

/** Compute expected cash — sum of cash-method sales within a time window. */
export function computeExpectedCash(
  sales: CompletedSale[],
  openTime: string,
  closeTime: string | null,
): number {
  const open = new Date(openTime).getTime();
  const close = closeTime ? new Date(closeTime).getTime() : Infinity;

  return sales
    .filter((s) => {
      const t = new Date(s.date).getTime();
      return t >= open && t <= close && s.paymentMethod === "cash";
    })
    .reduce((sum, s) => sum + s.total, 0);
}

/** Compute variance: declared - expected. */
export function computeVariance(
  declaredCash: number,
  expectedCash: number,
): number {
  return Math.round((declaredCash - expectedCash) * 100) / 100;
}

// ──────────────────────────────────────────────
// Store shape
// ──────────────────────────────────────────────

export type CashClosingStore = {
  shifts: Shift[];

  /** Open a new shift. Throws if an open shift exists for the store. */
  openShift: (employee: string, storeId: string) => Shift;

  /** Close an open shift. */
  closeShift: (shiftId: number) => void;

  /** Reconcile a closed shift with declared cash amount. */
  reconcile: (
    shiftId: number,
    declaredCash: number,
    completedSales: CompletedSale[],
  ) => void;

  /** Build a summary for a given shift. */
  getShiftSummary: (
    shiftId: number,
    completedSales: CompletedSale[],
  ) => ShiftSummary | null;

  /** Get the currently open shift for a store, or null. */
  getOpenShift: (storeId: string) => Shift | null;

  /** Get all shifts for a store, newest first. */
  getShiftsByStore: (storeId: string) => Shift[];
};

// ──────────────────────────────────────────────
// Store implementation
// ──────────────────────────────────────────────

export const useCashClosingStore = create<CashClosingStore>((set, get) => ({
  shifts: [],

  openShift: (employee, storeId) => {
    const open = get().shifts.find(
      (s) => s.storeId === storeId && s.status === "open",
    );
    if (open) {
      throw new Error("Close current shift first");
    }

    const shift: Shift = {
      id: nextShiftId++,
      employee,
      openTime: new Date().toISOString(),
      closeTime: null,
      status: "open",
      storeId,
      declaredCash: null,
      variance: null,
      reconciliationStatus: null,
      reconciledAt: null,
    };

    set({ shifts: [...get().shifts, shift] });
    return shift;
  },

  closeShift: (shiftId) => {
    set({
      shifts: get().shifts.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              status: "closed" as const,
              closeTime: new Date().toISOString(),
            }
          : s,
      ),
    });
  },

  reconcile: (shiftId, declaredCash, completedSales) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) throw new Error("Shift not found");
    if (shift.status !== "closed")
      throw new Error("Cannot reconcile an open shift");

    const expectedCash = computeExpectedCash(
      completedSales,
      shift.openTime,
      shift.closeTime!,
    );
    const variance = computeVariance(declaredCash, expectedCash);
    const reconciliationStatus = variance === 0 ? "matched" : "mismatch";

    set({
      shifts: get().shifts.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              declaredCash,
              variance,
              reconciliationStatus,
              reconciledAt: new Date().toISOString(),
            }
          : s,
      ),
    });
  },

  getShiftSummary: (shiftId, completedSales) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return null;

    const open = new Date(shift.openTime).getTime();
    const close = shift.closeTime
      ? new Date(shift.closeTime).getTime()
      : Infinity;

    const shiftSales = completedSales.filter((s) => {
      const t = new Date(s.date).getTime();
      return t >= open && t <= close;
    });

    const cashTotal = shiftSales
      .filter((s) => s.paymentMethod === "cash")
      .reduce((sum, s) => sum + s.total, 0);

    const cardTotal = shiftSales
      .filter((s) => s.paymentMethod === "card")
      .reduce((sum, s) => sum + s.total, 0);

    const totalSales = Math.round((cashTotal + cardTotal) * 100) / 100;

    // Build product aggregation
    const productMap = new Map<string, { quantity: number; total: number }>();
    for (const sale of shiftSales) {
      for (const item of sale.items) {
        const existing = productMap.get(item.productName);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.subtotal;
        } else {
          productMap.set(item.productName, {
            quantity: item.quantity,
            total: item.subtotal,
          });
        }
      }
    }

    const topProducts = [...productMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return {
      shift,
      totalSales,
      cashTotal: Math.round(cashTotal * 100) / 100,
      cardTotal: Math.round(cardTotal * 100) / 100,
      transactionCount: shiftSales.length,
      itemCount: shiftSales.reduce((sum, s) => sum + s.items.reduce((q, i) => q + i.quantity, 0), 0),
      topProducts,
    };
  },

  getOpenShift: (storeId) => {
    return (
      get().shifts.find((s) => s.storeId === storeId && s.status === "open") ??
      null
    );
  },

  getShiftsByStore: (storeId) => {
    return get()
      .shifts.filter((s) => s.storeId === storeId)
      .sort((a, b) => b.id - a.id);
  },
}));
