# Tasks: Admin Roles & UI

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1170 (across 5 stacked PRs) |
| 400-line budget risk | Low per PR, High overall |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 |
| Delivery strategy | auto-chain (force-chained) |
| Review budget per PR | 800 lines |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + brands CRUD | PR 1 | Base: main; migration, brands store + components, tests |
| 2 | Admin auth + guard | PR 2 | Base: main; Admin store, AdminRoute, NavBar, AdminPage shell |
| 3 | Bulk price preview | PR 3 | Base: main; BulkPriceModal + store preview/confirm, tests |
| 4 | Product cost + brand | PR 4 | Base: main; ProductForm + ProductsPage: cost_price, brand_id |
| 5 | Dark theme + numbers | PR 5 | Base: main; Tailwind config, CSS vars, ThemeToggle, all pages |

## PR 1: Schema & Brands CRUD

- [x] 1.1 Add `brands` table + `cost_price`/`brand_id` cols in `db/schema.ts`
- [x] 1.2 Drizzle migration already exists (drizzle/local/0000_aberrant_hemingway.sql + drizzle/cloud/0000_young_firedrake.sql)
- [x] 1.3 Create `src/store/brands.ts` (CRUD, store-scoped, alphabetical sort)
- [x] 1.4 Create `src/components/BrandList.tsx` (table + empty state)
- [x] 1.5 Create `src/components/BrandForm.tsx` (create/edit, duplicate validation)
- [x] 1.6 Store tests: CRUD, duplicate rejection, store scoping
- [x] 1.7 Component tests: BrandList empty state + BrandForm submit validation (7 tests in brand-components.test.tsx)

## PR 2: Admin Auth & Route Guard

- [x] 2.1 Create `src/store/admin.ts` (pinHash, isUnlocked, lock/unlock/setPin, theme, bulkPrice state)
- [x] 2.2 Create `src/components/AdminRoute.tsx` (PIN gate → redirect on locked)
- [x] 2.3 Add `"admin"` to `Page` union in `src/store/index.ts`
- [x] 2.4 Create `src/pages/AdminPage.tsx` (tabbed: Brands / Bulk Price / Settings)
- [x] 2.5 Update `NavigationBar.tsx` + `App.tsx` (admin nav button, page map entry)
- [x] 2.6 Store + component tests: 21 tests (hash, PIN set, unlock/lock, change PIN, AdminRoute render/unlock/wrong PIN/dismiss)

## PR 3: Bulk Price Increase

- [x] 3.1 Add bulk price types + `bulkPricePreview()` to admin store (no DB writes)
- [x] 3.2 Add `bulkPriceConfirm()` with transactional DB update
- [x] 3.3 Create `src/components/BulkPriceModal.tsx` (filter + preview table + confirm)
- [x] 3.4 Wire BulkPriceModal into AdminPage bulk tab
- [x] 3.5 Store tests: preview matches confirm, cancel is no-op, rollback on error

## PR 4: Product Cost & Brand Integration

- [x] 4.1 Update `ProductForm.tsx`: add cost_price input + brand select dropdown
- [x] 4.2 Update `ProductsPage.tsx`: add cost_price + brand columns (admin-only)
- [x] 4.3 Conditionally hide cost_price columns when admin mode off
- [x] 4.4 Tests: form saves cost_price + brand_id, columns hidden from non-admin

## PR 5: Dark Theme & Number Styling

- [x] 5.1 Set `darkMode: "class"` + dark palette in `tailwind.config.js` — CSS vars approach via styles.css is sufficient; no dark palette needed in tailwind.config
- [x] 5.2 Add dark CSS custom properties in `src/styles.css`
- [x] 5.3 Create `src/components/ThemeToggle.tsx` (sun/moon, in header + settings)
- [x] 5.4 Add `dark:` classes to all pages: POSPage, ProductsPage, CashClosingPage, BillingPage, StatsPage
- [x] 5.5 Add `dark:` classes to admin components: AdminPage, BrandForm, BrandList, BulkPriceModal
- [x] 5.6 Apply monospace right-aligned number styling globally (`.num` CSS class in styles.css)
- [x] 5.7 Tests: toggle persists, flicker-free reload, all pages render dark
