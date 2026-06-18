# Design: Expenses Module (Gastos)

## Technical Approach

Add a new syncable expense-tracking domain to the existing POS app. A Zustand store (in-memory + localStorage) mirrors the cash-closing pattern for CRUD operations and monthly aggregation. A single tabbed page provides form entry and monthly summary. The module is gated behind the existing `"configuracion"` permission. Schema, store, page, nav, dashboard, and permission mapping are all modified in sequence — no structural changes required.

## Architecture Decisions

### Decision: localStorage Persistence Instead of DB Schema for This Slice

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Zustand + localStorage** (matching cash-closing) | Zero migration; survives refresh; immediate | ✅ **Chosen** |
| Drizzle schema + sync columns | Requires DB migration + sync wiring; deferred to next iteration when multi-device sync is proven | ❌ Deferred |

Rationale: The cash-closing store follows the same pattern (in-memory Zustand with no DB schema entry during its first implementation). Adding the Drizzle `expenses` table can be a follow-up when the sync engine needs it.

### Decision: Single Tabbed Page vs Separate Sub-Pages

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Single page with tabs: "Registrar Gasto" + "Resumen Mensual"** | One component, local tab state, no routing changes | ✅ **Chosen** |
| Two separate pages (expenses-form, expenses-report) | Duplicates routing pattern, more boilerplate, no benefit at this scale | ❌ Rejected |

### Decision: Permission Reuse

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Reuse `"configuracion"` permission** | Zero auth model changes; admins already have it | ✅ **Chosen** |
| New `"gastos"` permission key | Requires Permission union update + role migration + UI for role editing | ❌ Rejected |

### Decision: Expense Type — Payee Field

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Omit payee (just description)** | Matches spec: single field for recipient/purpose description | ✅ **Chosen** |
| Add `payee` field | More data but not in spec; can add later as additive schema change | ❌ Deferred |

## Data Flow

```
User fills form
       │
       ▼
ExpensesPage (local state: description, amount, category, date, paymentMethod)
       │  onSubmit
       ▼
useExpensesStore.addExpense({...})
       │
       ├──► Zustand state update (expenses[])
       └──► localStorage.setItem("expenses-store", JSON.stringify(state))
       
Monthly summary:
  useExpensesStore.getMonthlySummary(storeId, year, month)
       │
       ▼
  Store filters expenses[] by storeId + date range
       │
       ▼
  Reduce by category → { category: total }[]
       │
       ▼
  Reduce by paymentMethod → { cash: total, card: total }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/store/expenses.ts` | Create | Zustand store: CRUD + monthly aggregation + localStorage persistence |
| `src/store/index.ts` | Modify | Add `"expenses"` to `Page` union; re-export `useExpensesStore` |
| `src/pages/ExpensesPage.tsx` | Create | Tabbed page: expense form (top) + monthly summary table (bottom) |
| `src/hooks/usePermission.ts` | Modify | Add `expenses: "configuracion"` to `PAGE_PERMISSIONS` |
| `src/components/NavigationBar.tsx` | Modify | Add `{ id: "expenses", label: "Gastos", icon: "💳", permission: "configuracion" }` to `ALL_PAGES` |
| `src/pages/DashboardPage.tsx` | Modify | Add expenses module card to `MODULES` array (active, permission `"configuracion"`) + `ExpenseIcon()` SVG component |
| `src/App.tsx` | Modify | Import `ExpensesPage`; add `expenses: ExpensesPage` to `PAGE_COMPONENTS` |

## Interfaces / Contracts

```typescript
// src/store/expenses.ts

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
  date: string;           // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  storeId: string;
  createdAt: string;
  updatedAt: string;
};

export type CategorySummary = {
  category: ExpenseCategory;
  total: number;
  count: number;
};

export type PaymentMethodSummary = {
  cash: number;
  card: number;
};

export type MonthlySummary = {
  period: string;                    // "2026-06"
  byCategory: CategorySummary[];
  byPaymentMethod: PaymentMethodSummary;
  grandTotal: number;
};

export type ExpensesStore = {
  expenses: Expense[];

  // CRUD
  addExpense: (data: Omit<Expense, "id" | "createdAt" | "updatedAt">) => Expense;
  updateExpense: (id: number, data: Partial<Omit<Expense, "id" | "storeId" | "createdAt">>) => void;
  deleteExpense: (id: number) => void;

  // Queries
  getExpensesByStore: (storeId: string) => Expense[];
  getExpensesByMonth: (storeId: string, year: number, month: number) => Expense[];
  getMonthlySummary: (storeId: string, year: number, month: number) => MonthlySummary;
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Store CRUD | Follow `cash-closing.ts` pattern: `useExpensesStore.getState()` + direct calls, assert state mutations |
| Unit | Monthly aggregation | Seed expenses across 2 months + 2 stores, call `getMonthlySummary()`, verify category totals and payment method breakdowns |
| Unit | Validation | Test amount > 0, non-empty description, valid category enum, valid YYYY-MM-DD date format |
| Integration | Page rendering | Mount `ExpensesPage` with pre-seeded store; verify form renders, list renders, tab switch works |
| Integration | Permission gate | Verify `usePermission("expenses")` returns true only for users with `"configuracion"` |

## Migration / Rollout

No migration required — all changes are additive. Expenses data lives in localStorage under the `"expenses-store"` key. The Zustand store initializes with `expenses: []` on first load.

## Open Questions

- [ ] Should the expense list support inline editing (click to edit in place) or open a modal/form? Decision: follow CashClosingPage pattern — modal/form for edit.
- [ ] The `AdminRoute` guard wraps `admin` and `user-management` but NOT `expenses`. Should it? Decision: no — permission gating in `PAGE_PERMISSIONS` + nav bar filtering is sufficient.
