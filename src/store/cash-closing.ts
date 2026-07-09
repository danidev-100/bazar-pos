import { create } from "zustand";
import type { CompletedSale } from "@/store";
import { execute, enqueueSync } from "@/lib/db";

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
  openingBalance: number;
  declaredCash: number | null;
  variance: number | null;
  reconciliationStatus: "pending" | "matched" | "mismatch" | null;
  reconciledAt: string | null;
};

export type CashMovementMethod = "cash" | "card" | "transfer" | "other";
export type CashMovementType = "withdrawal" | "deposit";

export type CashMovement = {
  id: number;
  shiftId: number;
  type: CashMovementType;
  amount: number;
  method: CashMovementMethod;
  reason: string;
  createdBy: string;
  storeId: string;
  createdAt: string;
};

export type ShiftSummary = {
  shift: Shift;
  totalSales: number;
  cashTotal: number;
  cardTotal: number;
  mercadopagoTotal: number;
  transactionCount: number;
  itemCount: number;
  topProducts: { name: string; quantity: number; total: number }[];
  /** Total cash withdrawn from the shift */
  withdrawalsTotal: number;
  /** Total cash deposited into the shift */
  depositsTotal: number;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

let nextShiftId = 1;
export function setNextShiftId(id: number) { nextShiftId = id; }

/** Compute expected cash — sum of cash-method sales + mixed cash portions within a time window. */
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
      return t >= open && t <= close;
    })
    .reduce((sum, s) => {
      if (s.paymentMethod === "cash") return sum + s.total;
      if (s.paymentMethod === "mixed") return sum + (s.cashAmount ?? 0);
      return sum;
    }, 0);
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
  cashMovements: CashMovement[];

  /** Open a new shift with an opening cash balance. Throws if an open shift exists. */
  openShift: (employee: string, storeId: string, openingBalance?: number) => Shift;

  /** Close an open shift. */
  closeShift: (shiftId: number) => void;

  /** Record a cash movement (withdrawal or deposit) for a shift. */
  recordCashMovement: (
    shiftId: number,
    type: CashMovementType,
    amount: number,
    reason: string,
    createdBy: string,
    storeId: string,
    method?: CashMovementMethod,
  ) => CashMovement;

  /** Get all cash movements for a shift, newest first. */
  getShiftCashMovements: (shiftId: number) => CashMovement[];

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

let nextMovementId = 1;
export function setNextMovementId(id: number) { nextMovementId = id; }

export const useCashClosingStore = create<CashClosingStore>((set, get) => ({
  shifts: [],
  cashMovements: [],

  openShift: (employee, storeId, openingBalance = 0) => {
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
      openingBalance: Math.max(0, openingBalance),
      declaredCash: null,
      variance: null,
      reconciliationStatus: null,
      reconciledAt: null,
    };

    set({ shifts: [...get().shifts, shift] });

    // Persist to SQLite
    const now = shift.openTime;
    execute(
      `INSERT INTO shifts (id, employee_name, open_time, status, opening_balance, store_id, created_at, updated_at, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
      [shift.id, shift.employee, now, "open", shift.openingBalance, storeId, now, now],
    )
      .then(() => enqueueSync("shift", shift.id, "insert", storeId))
      .catch((err) => console.error("[db] cash-closing.openShift failed:", err));

    return shift;
  },

  closeShift: (shiftId) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const now = new Date().toISOString();
    set({
      shifts: get().shifts.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              status: "closed" as const,
              closeTime: now,
            }
          : s,
      ),
    });

    // Update SQLite
    execute(
      `UPDATE shifts SET close_time=$1, status='closed', updated_at=$2, sync_status='pending' WHERE id=$3`,
      [now, now, shiftId],
    )
      .then(() => enqueueSync("shift", shiftId, "update", shift.storeId))
      .catch((err) => console.error("[db] cash-closing.closeShift failed:", err));
  },

  recordCashMovement: (shiftId, type, amount, reason, createdBy, storeId, method = "cash") => {
    const movement: CashMovement = {
      id: nextMovementId++,
      shiftId,
      type,
      amount,
      method,
      reason,
      createdBy,
      storeId,
      createdAt: new Date().toISOString(),
    };

    set({ cashMovements: [...get().cashMovements, movement] });

    // Persist to SQLite
    execute(
      `INSERT INTO cash_movements (shift_id, type, amount, method, reason, created_by, store_id, created_at, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
      [shiftId, type, amount, method, reason, createdBy, storeId, movement.createdAt],
    )
      .then(() => enqueueSync("cash_movement", movement.id, "insert", storeId))
      .catch((err) => console.error("[db] cash-closing.recordCashMovement failed:", err));

    return movement;
  },

  getShiftCashMovements: (shiftId) => {
    return get()
      .cashMovements.filter((m) => m.shiftId === shiftId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  reconcile: (shiftId, declaredCash, completedSales) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) throw new Error("Shift not found");
    if (shift.status !== "closed")
      throw new Error("Cannot reconcile an open shift");

    const salesCash = computeExpectedCash(
      completedSales,
      shift.openTime,
      shift.closeTime!,
    );

    // Include cash movements in expected total
    const movements = get().cashMovements.filter(
      (m) => m.shiftId === shiftId && m.method === "cash",
    );
    const withdrawalsTotal = movements
      .filter((m) => m.type === "withdrawal")
      .reduce((sum, m) => sum + m.amount, 0);
    const depositsTotal = movements
      .filter((m) => m.type === "deposit")
      .reduce((sum, m) => sum + m.amount, 0);

    // Expected = sales in cash + opening balance - withdrawals + deposits
    const expectedTotal = salesCash + (shift.openingBalance ?? 0) - withdrawalsTotal + depositsTotal;
    const variance = computeVariance(declaredCash, expectedTotal);
    const reconciliationStatus = variance === 0 ? "matched" : "mismatch";

    const reconciledAt = new Date().toISOString();
    set({
      shifts: get().shifts.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              declaredCash,
              variance,
              reconciliationStatus,
              reconciledAt,
            }
          : s,
      ),
    });

    // Write to cash_closings table + enqueue (use capture shift.storeId)
    const storeId = shift.storeId;
    execute(
      `INSERT INTO cash_closings (shift_id, declared_cash, expected_cash, card_total, variance, status, store_id, created_at, updated_at, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [
        shiftId,
        declaredCash,
        salesCash,
        0,
        variance,
        reconciliationStatus,
        storeId,
        reconciledAt,
        reconciledAt,
      ],
    )
      .then(() =>
        enqueueSync("cash_closing", shiftId, "insert", storeId),
      )
      .catch((err) => console.error("[db] cash-closing.reconcile failed:", err));
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

    const cashTotal = shiftSales.reduce((sum, s) => {
      if (s.paymentMethod === "cash") return sum + s.total;
      if (s.paymentMethod === "mixed") return sum + (s.cashAmount ?? 0);
      return sum;
    }, 0);

    const cardTotal = shiftSales.reduce((sum, s) => {
      if (s.paymentMethod === "card") return sum + s.total;
      if (s.paymentMethod === "mixed") return sum + (s.cardAmount ?? 0);
      return sum;
    }, 0);

    const mercadopagoTotal = shiftSales.reduce((sum, s) => {
      if (s.paymentMethod === "mercadopago") return sum + s.total;
      if (s.paymentMethod === "mixed") return sum + (s.mercadopagoAmount ?? 0);
      return sum;
    }, 0);

    const totalSales = Math.round((cashTotal + cardTotal + mercadopagoTotal) * 100) / 100;

    // Cash movements
    const movements = get().cashMovements.filter((m) => m.shiftId === shiftId);
    const withdrawalsTotal = movements
      .filter((m) => m.type === "withdrawal")
      .reduce((sum, m) => sum + m.amount, 0);
    const depositsTotal = movements
      .filter((m) => m.type === "deposit")
      .reduce((sum, m) => sum + m.amount, 0);

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
      mercadopagoTotal: Math.round(mercadopagoTotal * 100) / 100,
      transactionCount: shiftSales.length,
      itemCount: shiftSales.reduce((sum, s) => sum + s.items.reduce((q, i) => q + i.quantity, 0), 0),
      topProducts,
      withdrawalsTotal,
      depositsTotal,
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
