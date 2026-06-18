import { describe, it, expect, beforeEach } from "vitest";
import {
  useExpensesStore,
  type ExpenseCategory,
  type PaymentMethod,
} from "@/store/expenses";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function resetStore() {
  useExpensesStore.setState({ expenses: [] });
  localStorage.clear();
}

beforeEach(() => {
  resetStore();
});

// ──────────────────────────────────────────────
// 1. CRUD operations
// ──────────────────────────────────────────────

describe("Expense CRUD", () => {
  it("adds an expense with all required fields", () => {
    const expense = useExpensesStore.getState().addExpense({
      description: "Compra de insumos",
      amount: 1500.5,
      category: "Insumos",
      date: "2026-06-18",
      paymentMethod: "cash",
      storeId: "store_1",
    });

    expect(expense.id).toBeGreaterThan(0);
    expect(expense.description).toBe("Compra de insumos");
    expect(expense.amount).toBe(1500.5);
    expect(expense.category).toBe("Insumos");
    expect(expense.date).toBe("2026-06-18");
    expect(expense.paymentMethod).toBe("cash");
    expect(expense.storeId).toBe("store_1");
    expect(expense.createdAt).toBeTruthy();
    expect(expense.updatedAt).toBeTruthy();
  });

  it("increments id for each new expense", () => {
    const e1 = useExpensesStore.getState().addExpense({
      description: "Gasto 1",
      amount: 100,
      category: "Varios",
      date: "2026-06-18",
      paymentMethod: "cash",
      storeId: "store_1",
    });
    const e2 = useExpensesStore.getState().addExpense({
      description: "Gasto 2",
      amount: 200,
      category: "Varios",
      date: "2026-06-18",
      paymentMethod: "card",
      storeId: "store_1",
    });

    expect(e2.id).toBe(e1.id + 1);
  });

  it("updates an existing expense", () => {
    const expense = useExpensesStore.getState().addExpense({
      description: "Original",
      amount: 100,
      category: "Varios",
      date: "2026-06-18",
      paymentMethod: "cash",
      storeId: "store_1",
    });

    useExpensesStore.getState().updateExpense(expense.id, {
      description: "Actualizado",
      amount: 200,
    });

    const updated = useExpensesStore
      .getState()
      .expenses.find((e) => e.id === expense.id)!;
    expect(updated.description).toBe("Actualizado");
    expect(updated.amount).toBe(200);
    expect(updated.category).toBe("Varios");
  });

  it("does nothing when updating non-existent expense", () => {
    const before = useExpensesStore.getState().expenses.length;
    useExpensesStore.getState().updateExpense(999, { description: "Nope" });
    expect(useExpensesStore.getState().expenses.length).toBe(before);
  });

  it("deletes an expense", () => {
    const expense = useExpensesStore.getState().addExpense({
      description: "To delete",
      amount: 100,
      category: "Varios",
      date: "2026-06-18",
      paymentMethod: "cash",
      storeId: "store_1",
    });

    useExpensesStore.getState().deleteExpense(expense.id);
    expect(
      useExpensesStore.getState().expenses.find((e) => e.id === expense.id),
    ).toBeUndefined();
  });

  it("does nothing when deleting non-existent expense", () => {
    useExpensesStore.getState().addExpense({
      description: "Keep me",
      amount: 100,
      category: "Varios",
      date: "2026-06-18",
      paymentMethod: "cash",
      storeId: "store_1",
    });

    useExpensesStore.getState().deleteExpense(999);
    expect(useExpensesStore.getState().expenses).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────
// 2. getExpensesByMonth
// ──────────────────────────────────────────────

describe("getExpensesByMonth", () => {
  beforeEach(() => {
    useExpensesStore.getState().addExpense({
      description: "Ene cash",
      amount: 100,
      category: "Varios",
      date: "2026-01-15",
      paymentMethod: "cash",
      storeId: "store_1",
    });
    useExpensesStore.getState().addExpense({
      description: "Jun cash",
      amount: 200,
      category: "Insumos",
      date: "2026-06-10",
      paymentMethod: "cash",
      storeId: "store_1",
    });
    useExpensesStore.getState().addExpense({
      description: "Jun card",
      amount: 300,
      category: "Servicios",
      date: "2026-06-20",
      paymentMethod: "card",
      storeId: "store_1",
    });
    useExpensesStore.getState().addExpense({
      description: "Other store",
      amount: 400,
      category: "Varios",
      date: "2026-06-15",
      paymentMethod: "cash",
      storeId: "store_2",
    });
  });

  it("returns only expenses for the given year and month, newest first", () => {
    const result = useExpensesStore
      .getState()
      .getExpensesByMonth(2026, 6, "store_1");
    expect(result).toHaveLength(2);
    expect(result[0].description).toBe("Jun card");
    expect(result[1].description).toBe("Jun cash");
  });

  it("returns empty array for month with no expenses", () => {
    const result = useExpensesStore
      .getState()
      .getExpensesByMonth(2026, 7, "store_1");
    expect(result).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────
// 3. getMonthlySummary
// ──────────────────────────────────────────────

describe("getMonthlySummary", () => {
  beforeEach(() => {
    useExpensesStore.getState().addExpense({
      description: "Alquiler",
      amount: 50000,
      category: "Alquiler",
      date: "2026-06-01",
      paymentMethod: "cash",
      storeId: "store_1",
    });
    useExpensesStore.getState().addExpense({
      description: "Luz",
      amount: 3000,
      category: "Servicios",
      date: "2026-06-05",
      paymentMethod: "card",
      storeId: "store_1",
    });
    useExpensesStore.getState().addExpense({
      description: "Agua",
      amount: 2000,
      category: "Servicios",
      date: "2026-06-10",
      paymentMethod: "card",
      storeId: "store_1",
    });
    useExpensesStore.getState().addExpense({
      description: "Resma papel",
      amount: 500,
      category: "Insumos",
      date: "2026-06-15",
      paymentMethod: "cash",
      storeId: "store_1",
    });
    // Different month — should be excluded
    useExpensesStore.getState().addExpense({
      description: "Otro mes",
      amount: 1000,
      category: "Varios",
      date: "2026-05-15",
      paymentMethod: "cash",
      storeId: "store_1",
    });
    // Different store — should be excluded
    useExpensesStore.getState().addExpense({
      description: "Otra tienda",
      amount: 999,
      category: "Varios",
      date: "2026-06-15",
      paymentMethod: "card",
      storeId: "store_2",
    });
  });

  it("returns total by category for the month and store", () => {
    const summary = useExpensesStore
      .getState()
      .getMonthlySummary(2026, 6, "store_1");

    expect(summary.byCategory["Alquiler"].total).toBe(50000);
    expect(summary.byCategory["Alquiler"].count).toBe(1);
    expect(summary.byCategory["Servicios"].total).toBe(5000);
    expect(summary.byCategory["Servicios"].count).toBe(2);
    expect(summary.byCategory["Insumos"].total).toBe(500);
    expect(summary.byCategory["Insumos"].count).toBe(1);
    // Categories with no expenses should have 0
    expect(summary.byCategory["Marketing"].total).toBe(0);
    expect(summary.byCategory["Marketing"].count).toBe(0);
  });

  it("returns total by payment method", () => {
    const summary = useExpensesStore
      .getState()
      .getMonthlySummary(2026, 6, "store_1");

    expect(summary.byPaymentMethod.cash.total).toBe(50500);
    expect(summary.byPaymentMethod.cash.count).toBe(2);
    expect(summary.byPaymentMethod.card.total).toBe(5000);
    expect(summary.byPaymentMethod.card.count).toBe(2);
  });

  it("returns the grand total", () => {
    const summary = useExpensesStore
      .getState()
      .getMonthlySummary(2026, 6, "store_1");
    expect(summary.total).toBe(55500);
  });

  it("returns empty summary for month with no expenses", () => {
    const summary = useExpensesStore
      .getState()
      .getMonthlySummary(2026, 7, "store_1");
    expect(summary.total).toBe(0);
    expect(summary.byCategory["Varios"].total).toBe(0);
    expect(summary.byCategory["Varios"].count).toBe(0);
    expect(summary.byPaymentMethod.cash.total).toBe(0);
    expect(summary.byPaymentMethod.card.total).toBe(0);
  });
});

// ──────────────────────────────────────────────
// 4. Validation
// ──────────────────────────────────────────────

describe("Expense validation", () => {
  it("rejects empty description", () => {
    expect(() => {
      useExpensesStore.getState().addExpense({
        description: "",
        amount: 100,
        category: "Varios",
        date: "2026-06-18",
        paymentMethod: "cash",
        storeId: "store_1",
      });
    }).toThrow(/description/i);
  });

  it("rejects zero amount", () => {
    expect(() => {
      useExpensesStore.getState().addExpense({
        description: "Test",
        amount: 0,
        category: "Varios",
        date: "2026-06-18",
        paymentMethod: "cash",
        storeId: "store_1",
      });
    }).toThrow(/amount/i);
  });

  it("rejects negative amount", () => {
    expect(() => {
      useExpensesStore.getState().addExpense({
        description: "Test",
        amount: -100,
        category: "Varios",
        date: "2026-06-18",
        paymentMethod: "cash",
        storeId: "store_1",
      });
    }).toThrow(/amount/i);
  });

  it("rejects invalid category", () => {
    expect(() => {
      useExpensesStore.getState().addExpense({
        description: "Test",
        amount: 100,
        category: "InvalidCategory" as ExpenseCategory,
        date: "2026-06-18",
        paymentMethod: "cash",
        storeId: "store_1",
      });
    }).toThrow(/category/i);
  });

  it("rejects invalid payment method", () => {
    expect(() => {
      useExpensesStore.getState().addExpense({
        description: "Test",
        amount: 100,
        category: "Varios",
        date: "2026-06-18",
        paymentMethod: "invalid" as PaymentMethod,
        storeId: "store_1",
      });
    }).toThrow(/payment/i);
  });
});

// ──────────────────────────────────────────────
// 5. localStorage persistence
// ──────────────────────────────────────────────

describe("localStorage persistence", () => {
  it("persists expenses to localStorage after add", () => {
    useExpensesStore.getState().addExpense({
      description: "Persisted",
      amount: 500,
      category: "Varios",
      date: "2026-06-18",
      paymentMethod: "cash",
      storeId: "store_1",
    });

    const raw = localStorage.getItem("expenses");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].description).toBe("Persisted");
  });

  it("persists after update", () => {
    const e = useExpensesStore.getState().addExpense({
      description: "Will update",
      amount: 100,
      category: "Varios",
      date: "2026-06-18",
      paymentMethod: "cash",
      storeId: "store_1",
    });
    useExpensesStore.getState().updateExpense(e.id, { amount: 999 });

    const raw = JSON.parse(localStorage.getItem("expenses")!);
    expect(raw[0].amount).toBe(999);
  });

  it("persists after delete", () => {
    const e = useExpensesStore.getState().addExpense({
      description: "Will delete",
      amount: 100,
      category: "Varios",
      date: "2026-06-18",
      paymentMethod: "cash",
      storeId: "store_1",
    });
    useExpensesStore.getState().deleteExpense(e.id);

    const raw = localStorage.getItem("expenses");
    expect(JSON.parse(raw!)).toHaveLength(0);
  });
});
