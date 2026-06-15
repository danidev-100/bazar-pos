# Tasks: Sistema de Ventas — POS Desktop Application

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3,700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 → PR 7 |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes (resolved: force-chained, stacked-to-main)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main (resolved)
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: scaffold, schema, stores, nav | PR 1 | base for all downstream PRs |
| 2 | Products + Stock CRUD | PR 2 | depends on PR 1 schema + store_id |
| 3 | POS Sales: cart, checkout, receipt | PR 3 | depends on PR 1; uses Products from PR 2 |
| 4 | Cash Closing: shifts, reconciliation | PR 4 | depends on PR 1 + PR 3 (sales) |
| 5 | Internal Billing + PDF/Print | PR 5 | depends on PR 1 + PR 3 (sales) |
| 6 | Sales Statistics | PR 6 | depends on PR 1 + PR 3 (sales data) |
| 7 | Sync Engine: push, pull, conflict | PR 7 | depends on all local schema PRs |

## Phase 1: Foundation / Scaffold

- [x] 1.1 Init Tauri v2 + Vite/React/TS scaffold, install deps (`src-tauri/`, `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`)
- [x] 1.2 Create `db/schema.ts` — Drizzle unified schema (all entities with `store_id`, `updated_at`, `sync_status`)
- [x] 1.3 Create `db/client-local.ts` (libsql/Drizzle adapter) and `db/client-cloud.ts` (pg/Drizzle adapter)
- [x] 1.4 Create `src/store/context.tsx` — React Context + Provider for active `store_id`
- [x] 1.5 Create `src/store/index.ts` — Zustand shell (cart slice, UI slice, page nav)
- [x] 1.6 Create `src/hooks/useStoreFilter.ts` — wraps Drizzle queries with active `store_id`
- [x] 1.7 Create `src/App.tsx` — root with StoreProvider + NavigationBar + page state routing
- [x] 1.8 Create `src/components/NavigationBar.tsx` — page switcher with store selector dropdown

## Phase 2: Products + Stock

- [x] 2.1 Create `src/pages/ProductsPage.tsx` — layout with category tree + product list + movement log
- [x] 2.2 Create `src/components/CategoryTree.tsx` — hierarchical category CRUD
- [x] 2.3 Create `src/components/ProductForm.tsx` — product create/edit form (name, barcode, price, category)
- [x] 2.4 Create `src/components/StockMovementLog.tsx` — movement history table + manual adjustment form
- [x] 2.5 Write tests: `src/__tests__/products.test.ts` — product CRUD, barcode uniqueness, stock movement recording
- [x] 2.6 Verify store isolation: query store A products from store B context → empty

## Phase 3: POS Sales

- [x] 3.1 Create `src/pages/POSPage.tsx` — layout: product grid + cart panel + checkout modal
- [x] 3.2 Create `src/components/ProductGrid.tsx` — touch-friendly product catalog grid (search by name/barcode)
- [x] 3.3 Create `src/components/CartPanel.tsx` — line items with qty controls, subtotal, total
- [x] 3.4 Create `src/components/CheckoutModal.tsx` — payment selection (cash/card), change calculation
- [x] 3.5 Create `src/components/ReceiptPreview.tsx` — post-checkout receipt display with print option
- [x] 3.6 Wire cart Zustand actions: add/update/remove items, calculate totals, validate checkout
- [x] 3.7 Write tests: `src/__tests__/cart.test.ts` — totals, qty updates, empty cart guard, cash change calc

## Phase 4: Cash Closing

- [x] 4.1 Create `src/pages/CashClosingPage.tsx` — layout: shift list + reconciliation form + closure report
- [x] 4.2 Create `src/components/ShiftPanel.tsx` — open/close shift with timestamps and employee
- [x] 4.3 Create `src/components/ReconciliationForm.tsx` — declared cash input, variance calculation
- [x] 4.4 Create `src/components/ClosureReport.tsx` — summary: sale count, totals, variances, product counts
- [x] 4.5 Write tests: shift open/close lifecycle, variance calc, double-open rejection

## Phase 5: Internal Billing + PDF/Print

- [x] 5.1 Create `src/pages/BillingPage.tsx` — invoice list + detail view with sequential numbering
- [x] 5.2 Create `src/components/InvoiceList.tsx` — searchable/filterable invoice history
- [x] 5.3 Create `src/components/InvoiceDetail.tsx` — invoice header, items, totals, print/export buttons
- [x] 5.4 Create `src-tauri/src/pdf.rs` — PDF generation from invoice data (printpdf crate)
- [x] 5.5 Create `src-tauri/src/printer.rs` — ESC/POS thermal printer driver
- [x] 5.6 Write tests: sequential numbering per store, invoice PDF generation

## Phase 6: Sales Statistics

- [x] 6.1 Create `src/pages/StatsPage.tsx` — layout: date filter + chart area + ranking
- [x] 6.2 Create `src/components/DateRangeFilter.tsx` — day/week/month presets + custom range
- [x] 6.3 Create `src/components/SalesChart.tsx` — time-based revenue chart (recharts)
- [x] 6.4 Create `src/components/TopSellers.tsx` — product ranking table by quantity sold
- [x] 6.5 Write tests: date range queries, top-seller aggregation, zero-sale periods

## Phase 7: Sync Engine

- [ ] 7.1 Create `src-tauri/src/main.rs` — register sync + print Tauri commands
- [ ] 7.2 Create `src-tauri/src/sync.rs` — push: query `sync_queue` → upsert cloud rows with LW-W conflict check
- [ ] 7.3 Implement pull in `sync.rs` — batched (500) select from cloud → upsert local rows
- [ ] 7.4 Add conflict logging: entity name, IDs, timestamps, verdict to sync_logs table
- [ ] 7.5 Create `src/hooks/useSync.ts` — JS `setInterval` timer (60min) + manual `invoke("sync_now")`
- [ ] 7.6 Write Rust tests: `#[cfg(test)]` push/pull/conflict with mocked DBs
- [ ] 7.7 Integration test: offline write → sync → assert PostgreSQL has matching row
