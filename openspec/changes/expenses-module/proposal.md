# Proposal: Expenses (Gastos) Module

## Intent

Track daily operational expenses per store and view monthly category reports. The app tracks POS income but has no cost recording — a blind spot for profitability analysis.

## Scope

### In Scope
- Expense CRUD (add/edit/delete): description, amount, category (fixed enum), date (YYYY-MM-DD), payment method (cash/card), store_id
- Monthly summary table with category breakdown and totals
- Drizzle schema + `syncColumns` for offline-first / cloud sync
- Zustand store + localStorage persistence
- Permission gate: `"configuracion"` (admin-level access)
- Dashboard module card (active, not placeholder) + nav bar entry

### Out of Scope
- Custom categories (fixed enum deferred)
- Recharts chart (deferred to next iteration)
- Recurring expenses, supplier linking, approval workflows

## Capabilities

### New Capabilities
- `expenses-tracking`: Record, edit, delete daily expenses per store. Each entry: description, amount, category (dropdown from fixed enum), date, payment method. Monthly aggregation by category with totals.

### Modified Capabilities
- `dashboard-layout`: Add Expenses card to `MODULES` array (active, permission: `"configuracion"`).
- `permissions`: No spec-level change — reuses `"configuracion"`. No new permission key.

## Approach

1. **Schema**: `expenses` table in `db/schema.ts` — columns: id (int PK), description (text), amount (real), category (text), date (text), payment_method (text), + `syncColumns`.
2. **Store**: `src/store/expenses.ts` — Zustand + localStorage. Actions: `addExpense`, `updateExpense`, `deleteExpense`. Selectors: `getByStore`, `getByMonth(storeId, year, month)`, `getByCategory`. Store-scoped.
3. **Page**: `src/pages/ExpensesPage.tsx` — form (top), expense list (middle), monthly report table (bottom) with category breakdown. Month picker to navigate.
4. **Registration**: Add `"expenses"` to `Page` union. Register in `PAGE_COMPONENTS`. Nav entry: "Gastos", permission `"configuracion"`. Dashboard card.
5. **Categories**: Fixed enum — "Alquiler", "Servicios", "Insumos", "Sueldos", "Impuestos", "Marketing", "Mantenimiento", "Varios".

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `db/schema.ts` | Modified | Add `expenses` table |
| `src/store/expenses.ts` | **New** | Zustand CRUD + monthly queries |
| `src/store/index.ts` | Modified | Add `"expenses"` to `Page` |
| `src/pages/ExpensesPage.tsx` | **New** | Form + list + report |
| `src/App.tsx` | Modified | Register in `PAGE_COMPONENTS` |
| `src/components/NavigationBar.tsx` | Modified | Nav entry |
| `src/pages/DashboardPage.tsx` | Modified | Module card |
| `src/hooks/usePermission.ts` | Modified | `expenses` → `"configuracion"` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Fixed categories need later customization | Medium | Additive migration to category table |
| Timezone skew in monthly aggregation | Low | Store date as YYYY-MM-DD string |

## Rollback Plan

Ordered revert: (1) remove nav entry + dashboard card, (2) remove from `PAGE_COMPONENTS`, (3) delete `ExpensesPage.tsx`, (4) delete `expenses.ts` store, (5) revert schema, (6) revert `Page` union. All additive — no data loss.

## Dependencies

- Drizzle ORM + SQLite (existing)
- Recharts (installed, deferred)

## Success Criteria

- [ ] Can add, edit, delete expenses; changes persist across navigation
- [ ] Monthly report shows correct category totals for selected month
- [ ] Only users with `"configuracion"` see the module
- [ ] Dashboard card and nav entry navigate to Expenses
- [ ] All existing tests pass
