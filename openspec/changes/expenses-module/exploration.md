## Exploration: Expenses Module (Gastos)

### Current State

The application is a multi-store POS desktop app (Tauri v2 + React 18) with offline-first architecture. Key patterns:

- **Stores**: Zustand, one store file per domain (`src/store/{domain}.ts`), exported as `useXxxStore`. Simple stores use in-memory arrays with incremental IDs. Complex stores mirror DB-backed entities.
- **DB Schema**: Drizzle ORM with SQLite. All syncable entities spread `syncColumns` (`store_id`, `created_at`, `updated_at`, `sync_status`). Tables defined in `db/schema.ts`.
- **Pages**: Single default-export component per file in `src/pages/`. Pages use `useActiveStore()` for store scoping, zustand selectors for data.
- **Navigation**: `NavigationBar.tsx` has `ALL_PAGES` array. Each entry: `{ id: Page, label, icon, permission? }`.
- **Dashboard**: `DashboardPage.tsx` has `MODULES` array. Disabled modules have `target: null` + "Próximamente" badge.
- **App routing**: `App.tsx` has `PAGE_COMPONENTS: Record<Page, ...>` — add entry here to activate page.
- **Permissions**: `Permission` union type in `auth.ts`. `usePermission.ts` maps pages to required permissions. `hasPermission()` checks current user.
- **Specs**: `openspec/specs/` contains domain specs with numbered requirements and scenario tables.

### Affected Areas

| File | Why Affected |
|------|-------------|
| `db/schema.ts` | Add `expenses` table (and optionally `expense_categories` table) |
| `src/store/expenses.ts` | **Create** — new Zustand store for expense CRUD + monthly queries |
| `src/store/index.ts` | Add `"expenses"` to `Page` union; re-export `useExpensesStore` |
| `src/pages/ExpensesPage.tsx` | **Create** — main page: expense form, list, monthly report |
| `src/App.tsx` | Add `expenses: ExpensesPage` to `PAGE_COMPONENTS` |
| `src/components/NavigationBar.tsx` | Add `{ id: "expenses", label: "Gastos", icon, permission }` to `ALL_PAGES` |
| `src/pages/DashboardPage.tsx` | Add module card to `MODULES` array (initially disabled or active) |
| `src/hooks/usePermission.ts` | Add `expenses` → `"configuracion"` mapping |
| `src/store/auth.ts` | Possibly add `"gastos"` to `Permission` type if granular control is desired |
| `openspec/specs/expenses/spec.md` | **Create** — main spec for the expenses domain |

### Approaches

1. **Complete Module** — Full page with DB schema, store, monthly reports, and navigation
   - Pros: Complete feature, sync-ready, follows all existing patterns, full CRUD + reports
   - Cons: Larger surface area; category model needs design decision (reuse categories or separate table)
   - Effort: **Medium** (4 files created, 6 files modified)

2. **Minimal First Slice** — In-memory store only, basic list + form, no monthly report, no DB schema
   - Pros: Fast to implement, can validate UX quickly
   - Cons: No persistence across sessions (in-memory only); no sync capability; will need rewrite for DB later
   - Effort: **Low** (2 files created, 4 files modified)

### Recommendation

**Approach 1** — Complete module. The codebase already has a mature pattern for syncable entities with Drizzle schema. Expenses is a natural fit: it needs per-store isolation, offline persistence, and sync. Building an in-memory version first would be wasted effort since the app already has SQLite infrastructure. Specifically:

1. **Schema**: Add `expenses` table with: `id`, `description`, `amount` (real), `category` (text — simple enum for now, can evolve to FK later), `date` (text ISO), `payment_method` (text enum), plus `syncColumns`. No separate category table needed initially — use a fixed enum like `["alquiler", "servicios", "insumos", "salarios", "transporte", "otros"]`.

2. **Permission**: Gate under existing `"configuracion"` permission (admin-only). This avoids adding a new permission key and modifying the auth model. Can be upgraded to a granular `"gastos"` permission later.

3. **Store**: `useExpensesStore` with: `addExpense`, `updateExpense`, `deleteExpense`, `getExpensesByStore`, `getExpensesByMonth(storeId, year, month)`, `getExpensesByCategory`. The monthly query aggregates expenses by category for the report view.

4. **Page**: `ExpensesPage.tsx` with three sections:
   - **Expense form**: description, amount, category (select), date (date picker), payment method (select)
   - **Expense list**: sortable/filterable by date, category, payment method
   - **Monthly report**: grouped by category, showing total per category and overall total for the selected month

5. **Registration**: Add `"expenses"` to `Page`, register in `App.tsx`, add nav item in `NavigationBar.tsx` with permission `"configuracion"`, add module card in `DashboardPage.tsx` (active, not disabled — it IS being built now).

### Risks

- **Category model**: Using a fixed enum for categories is simpler but less flexible than a separate `expense_categories` table. If users need custom categories, we'll need a migration to a category table later. Mitigation: start with enum, document the upgrade path.
- **Monthly report consistency**: If expenses are entered with timestamps across timezones, monthly aggregation might show inconsistent results. Mitigation: store date as YYYY-MM-DD string (date-only, no timezone), making month-grouping deterministic.
- **No edit/delete confirmation**: Current stores implement simple CRUD without confirmation dialogs. This is fine — follow existing pattern.
- **Sync columns are mandatory**: All syncable entities require `store_id`. This is correct — expenses are per-store and must sync.

### Ready for Proposal

Yes — the approach is clear, patterns are well-established, and the feature boundaries are well-defined. The orchestrator can proceed to proposal with confidence.
