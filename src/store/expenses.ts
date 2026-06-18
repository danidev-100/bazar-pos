import { create } from "zustand";
import { execute, enqueueSync } from "@/lib/db";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ExpenseCategory =
  | "Alquiler"
  | "Servicios"
  | "Insumos"
  | "Sueldos"
  | "Impuestos"
  | "Marketing"
  | "Mantenimiento"
  | "Varios";

export type PaymentMethod = "cash" | "card";

export type Expense = {
  id: number;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // ISO date YYYY-MM-DD
  paymentMethod: PaymentMethod;
  storeId: string;
  createdAt: string;
  updatedAt: string;
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Alquiler",
  "Servicios",
  "Insumos",
  "Sueldos",
  "Impuestos",
  "Marketing",
  "Mantenimiento",
  "Varios",
];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  Alquiler: "Alquiler",
  Servicios: "Servicios",
  Insumos: "Insumos",
  Sueldos: "Sueldos",
  Impuestos: "Impuestos",
  Marketing: "Marketing",
  Mantenimiento: "Mantenimiento",
  Varios: "Varios",
};

export type MonthlySummary = {
  byCategory: Record<ExpenseCategory, { total: number; count: number }>;
  byPaymentMethod: Record<PaymentMethod, { total: number; count: number }>;
  total: number;
};

// ──────────────────────────────────────────────
// localStorage helpers
// ──────────────────────────────────────────────

const EXPENSES_KEY = "expenses";

function loadExpenses(): Expense[] {
  try {
    const stored = localStorage.getItem(EXPENSES_KEY);
    if (stored) {
      return JSON.parse(stored) as Expense[];
    }
  } catch {
    // localStorage unavailable — start empty
  }
  return [];
}

function saveExpenses(expenses: Expense[]): void {
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  } catch {
    // localStorage unavailable — skip
  }
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

let nextExpenseId = 1;

function computeNextId(expenses: Expense[]): number {
  if (expenses.length === 0) return 1;
  return Math.max(...expenses.map((e) => e.id)) + 1;
}

const VALID_CATEGORIES = new Set<ExpenseCategory>(EXPENSE_CATEGORIES);
const VALID_PAYMENT_METHODS = new Set<PaymentMethod>(["cash", "card"]);

function validateExpense(
  data: Omit<Expense, "id" | "createdAt" | "updatedAt">,
): void {
  if (!data.description || data.description.trim().length === 0) {
    throw new Error("Description is required");
  }
  if (typeof data.amount !== "number" || data.amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  if (!VALID_CATEGORIES.has(data.category)) {
    throw new Error("Invalid category");
  }
  if (!VALID_PAYMENT_METHODS.has(data.paymentMethod)) {
    throw new Error("Invalid payment method");
  }
  if (!data.date) {
    throw new Error("Date is required");
  }
}

function buildSummary(expenses: Expense[]): MonthlySummary {
  const byCategory = {} as Record<ExpenseCategory, { total: number; count: number }>;
  for (const cat of EXPENSE_CATEGORIES) {
    byCategory[cat] = { total: 0, count: 0 };
  }

  const byPaymentMethod: Record<PaymentMethod, { total: number; count: number }> = {
    cash: { total: 0, count: 0 },
    card: { total: 0, count: 0 },
  };

  let total = 0;

  for (const exp of expenses) {
    byCategory[exp.category].total += exp.amount;
    byCategory[exp.category].count += 1;
    byPaymentMethod[exp.paymentMethod].total += exp.amount;
    byPaymentMethod[exp.paymentMethod].count += 1;
    total += exp.amount;
  }

  // Round for precision
  for (const cat of EXPENSE_CATEGORIES) {
    byCategory[cat].total = Math.round(byCategory[cat].total * 100) / 100;
  }
  byPaymentMethod.cash.total = Math.round(byPaymentMethod.cash.total * 100) / 100;
  byPaymentMethod.card.total = Math.round(byPaymentMethod.card.total * 100) / 100;
  total = Math.round(total * 100) / 100;

  return { byCategory, byPaymentMethod, total };
}

// ──────────────────────────────────────────────
// Store shape
// ──────────────────────────────────────────────

export type ExpensesStore = {
  expenses: Expense[];

  /** Add a new expense. Returns the created expense with generated id and timestamps. */
  addExpense: (
    data: Omit<Expense, "id" | "createdAt" | "updatedAt">,
  ) => Expense;

  /** Update an existing expense. Silently ignores non-existent ids. */
  updateExpense: (
    id: number,
    data: Partial<Omit<Expense, "id" | "createdAt" | "updatedAt">>,
  ) => void;

  /** Delete an expense by id. Silently ignores non-existent ids. */
  deleteExpense: (id: number) => void;

  /** Get expenses for a given year and month, most recent first. */
  getExpensesByMonth: (year: number, month: number, storeId: string) => Expense[];

  /** Get monthly summary with totals by category and payment method. */
  getMonthlySummary: (year: number, month: number, storeId: string) => MonthlySummary;
};

// ──────────────────────────────────────────────
// Store implementation
// ──────────────────────────────────────────────

export const useExpensesStore = create<ExpensesStore>((set, get) => ({
  expenses: loadExpenses(),

  addExpense: (data) => {
    validateExpense(data);

    const expenses = get().expenses;
    nextExpenseId = computeNextId(expenses);

    const now = new Date().toISOString();
    const expense: Expense = {
      id: nextExpenseId++,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [...expenses, expense];
    set({ expenses: updated });
    saveExpenses(updated);

    // Persist to SQLite and enqueue sync
    execute(
      `INSERT INTO expenses (id, description, amount, category, date, payment_method, store_id, created_at, updated_at, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [
        expense.id,
        expense.description,
        expense.amount,
        expense.category,
        expense.date,
        expense.paymentMethod,
        expense.storeId,
        expense.createdAt,
        expense.updatedAt,
      ],
    )
      .then(() =>
        enqueueSync("expense", expense.id, "insert", expense.storeId),
      )
      .catch(() => {});

    return expense;
  },

  updateExpense: (id, data) => {
    const expenses = get().expenses;
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;

    if (data.category && !VALID_CATEGORIES.has(data.category)) {
      throw new Error("Invalid category");
    }
    if (data.paymentMethod && !VALID_PAYMENT_METHODS.has(data.paymentMethod)) {
      throw new Error("Invalid payment method");
    }
    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }

    const updated = expenses.map((e) =>
      e.id === id
        ? { ...e, ...data, updatedAt: new Date().toISOString() }
        : e,
    );
    set({ expenses: updated });
    saveExpenses(updated);

    // Update SQLite and enqueue sync
    const now = new Date().toISOString();
    execute(
      `UPDATE expenses SET description=$1, amount=$2, category=$3, date=$4, payment_method=$5, updated_at=$6, sync_status='pending' WHERE id=$7`,
      [
        data.description ?? existing.description,
        data.amount ?? existing.amount,
        data.category ?? existing.category,
        data.date ?? existing.date,
        data.paymentMethod ?? existing.paymentMethod,
        now,
        id,
      ],
    )
      .then(() => enqueueSync("expense", id, "update", existing.storeId))
      .catch(() => {});
  },

  deleteExpense: (id) => {
    const existing = get().expenses.find((e) => e.id === id);
    const updated = get().expenses.filter((e) => e.id !== id);
    set({ expenses: updated });
    saveExpenses(updated);

    // Delete from SQLite and enqueue sync
    execute(`DELETE FROM expenses WHERE id=$1`, [id])
      .then(() => {
        if (existing) {
          enqueueSync("expense", id, "delete", existing.storeId);
        }
      })
      .catch(() => {});
  },

  getExpensesByMonth: (year, month, storeId) => {
    return get()
      .expenses.filter((e) => {
        const [y, m] = e.date.split("-").map(Number);
        return y === year && m === month && e.storeId === storeId;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  getMonthlySummary: (year, month, storeId) => {
    const monthExpenses = get().expenses.filter((e) => {
      const [y, m] = e.date.split("-").map(Number);
      return y === year && m === month && e.storeId === storeId;
    });
    return buildSummary(monthExpenses);
  },
}));
