# Design: Sistema de Ventas — POS Desktop Application

## Technical Approach

Greenfield Tauri v2 desktop POS — offline-first. Writes hit SQLite immediately; hourly background sync pushes/pulls PostgreSQL. Drizzle ORM provides a single schema compiled to both SQLite (`libsql`) and PostgreSQL (`pg`) dialects. All entities carry `store_id` for isolation. React with Zustand + Context, state-driven page navigation (no router), touch-optimized layout.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Drizzle dialect strategy | `drizzle-orm/libsql` + `drizzle-orm/pg-core` — same schema, `$type()` for type divergence | One schema to maintain; `$type()` handles `timestamp`↔`date`, `serial`↔`integer` |
| Sync trigger | JS `setInterval` → Tauri `invoke("sync_now")` | Simplest pause/resume; manual "sync now" button trivially supported |
| State management | Zustand (global) + React Context (`store_id`) | Zustand for cart/cache; Context for scoped store filter — lightweight |
| Navigation | State-driven page enum, no React Router | Browser routing unreliable in Tauri webview; desktop POS needs simple push/pop |
| Invoice numbering | Per-store counter in local SQLite, synced to cloud | Each store has independent seq — no collisions, works offline |
| CSS framework | Tailwind CSS | Utility-first, fast iteration, touch-friendly utility classes available |
| Tauri plugin-sql | Direct `tauri-plugin-sql` + `@tauri-apps/plugin-sql` | Official Tauri v2 plugin; wraps SQLite via `drizzle-orm/libsql` adapter |

## Data Flow

**Offline write**: React → Zustand → Drizzle libsql → SQLite `.db` → `sync_queue` entry

**Sync (hourly)**: JS timer → `invoke("sync_now")` → Rust:
1. PUSH: Query `sync_queue WHERE status='pending'` → `UPSERT INTO pg_table` with `ON CONFLICT DO UPDATE WHERE pg.updated_at <= local.updated_at` → log if cloud wins → mark synced
2. PULL: `SELECT FROM pg_table WHERE updated_at > last_synced_at LIMIT 500` → `UPSERT INTO local_table` → update `last_synced_at`

**Multi-store**: `store_id` set in React Context at startup. Every Drizzle query receives it via `useStoreFilter()` hook. Writes always inject `store_id` from context. Sync preserves `store_id` — cloud queries also filter by it.

## File Changes

| File | Action | Role |
|------|--------|------|
| `src-tauri/src/main.rs` | Create | Tauri entry, register sync & print commands |
| `src-tauri/src/sync.rs` | Create | Push/pull/conflict engine |
| `src-tauri/src/printer.rs` | Create | Thermal printer (ESC/POS) |
| `src-tauri/src/pdf.rs` | Create | PDF invoice generation |
| `db/schema.ts` | Create | Drizzle unified schema (all entities) |
| `db/client-local.ts` | Create | Drizzle libsql client |
| `db/client-cloud.ts` | Create | Drizzle pg client |
| `src/App.tsx` | Create | Root: StoreProvider + page routing |
| `src/store/index.ts` | Create | Zustand store (cart, UI) |
| `src/store/context.tsx` | Create | React Context for store_id |
| `src/pages/{POS,Products,CashClosing,Billing,Stats}Page.tsx` | Create | One page per capability |
| `src/hooks/useSync.ts` | Create | JS interval hook for hourly sync |
| `src/hooks/useStoreFilter.ts` | Create | Wraps queries with active store_id |

## Component Architecture

```
<StoreProvider>                 ← store_id context
  <NavigationBar />             ← page switcher + store selector
  <POSPage>                     ← cart + checkout
    <ProductGrid /> <CartPanel /> <CheckoutModal /> <ReceiptPreview />
  <ProductsPage>                ← CRUD
    <CategoryTree /> <ProductForm /> <StockMovementLog />
  <CashClosingPage>             ← shifts
    <ShiftPanel /> <ReconciliationForm /> <ClosureReport />
  <BillingPage>                 ← invoices
    <InvoiceList /> <InvoiceDetail />
  <StatsPage>                   ← analytics
    <DateRangeFilter /> <TopSellers /> <SalesChart />
```

## Sync Engine Design

**Tracking**: Every syncable entity has `updated_at` + `sync_status` (`pending|synced|conflict`). A `sync_queue` table tracks row-level ops.

**Conflict resolution**: Last-writer-wins on `updated_at`. If push detects cloud row is newer → mark local as `conflict`, log the event, accept cloud version on next pull. Conflict log (entity, id, local_ts, cloud_ts, verdict) in both DBs for audit.

**Batching**: Pull limits to 500 rows per cycle using `updated_at > last_synced_at` cursor.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Schema compiles to both dialects | `drizzle-kit generate:sqlite` + `generate:pg` in CI |
| Unit | Sync push/pull | Rust `#[cfg(test)]` with mocked DB conns |
| Unit | Cart logic (totals, qty) | Vitest — pure Zustand state, no DOM |
| Integration | Offline write → sync → cloud read | Write SQLite, run sync, assert PostgreSQL matches |
| Integration | Store isolation | Query store A data from store B context → 0 results |
| E2E | Full POS checkout | Tauri driver: add product → checkout → receipt exists |
| E2E | Sync round-trip | Write offline → online → sync → verify cloud has row |

## Open Questions

- [ ] **tauri-plugin-sql + drizzle-orm/libsql**: Verify type compatibility — may need a thin wrapper
- [ ] **SQLite WAL mode**: Enable for concurrent UI reads + sync writes?
- [ ] **Printer discovery**: How does the app find the thermal printer? USB vendor ID? Config file?
- [ ] **Initial store selection**: Config file, local storage, or hardcoded for MVP?