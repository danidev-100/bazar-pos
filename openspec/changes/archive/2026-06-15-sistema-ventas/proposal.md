# Proposal: Sistema de Ventas — POS Desktop Application

## Intent

Multi-store small business needs unified POS that works offline and syncs across locations. Currently no digital system — inventory, cash closing, billing are manual.

## Scope

### In Scope
- Products & Stock: categories, barcodes, stock movements, quantities
- POS Interface: touch-friendly cart, checkout, receipt, multi-store via `store_id`
- Cash Closing: employee shift management, drawer reconciliation
- Internal Billing: customer invoices (printed/PDF, no AFIP)
- Sales Statistics: product analytics, time-based reports
- Sync Engine: offline-first, hourly push/pull, LW-W conflict resolution
- Multi-store isolation: all entities scoped by `store_id`

### Out of Scope
- AFIP electronic billing
- E-commerce / online store
- Payment gateway integration
- User roles & permissions

## Capabilities

### New Capabilities
- `products-stock`: Categories, barcodes, stock movements, quantity
- `pos-sales`: Cart, checkout, receipt, multi-store by `store_id`
- `cash-closing`: Shift management, drawer reconciliation, closure reports
- `internal-billing`: Invoice generation, sequential numbering, PDF/print
- `sales-statistics`: Product analytics, time-based reports, top sellers
- `sync-engine`: SQLite↔PostgreSQL sync, hourly push/pull, LW-W conflict
- `store-isolation`: Data separation — all entities scoped by `store_id`

### Modified Capabilities
- None (greenfield)

## Approach

Tauri v2 + React/TypeScript/Vite. Drizzle ORM with unified schema (SQLite local + PostgreSQL cloud). Background sync runs hourly via Tauri command. Isolation via `store_id` on every entity.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src-tauri/` | New | Rust backend, sync engine |
| `src/` | New | React UI, state, API layer |
| `db/schema.ts` | New | Drizzle unified schema |
| `db/sync.ts` | New | Push/pull/conflict logic |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Sync conflict complexity | Med | LW-W with `updated_at`, log conflicts |
| Tauri plugin maturity | Low | Pin versions, test early |
| Offline-first UX friction | Low | Connection indicators, manual sync |

## Rollback Plan

Greenfield — revert PR per capability. Schema migrations additive only.

## Dependencies

- Tauri v2 + `tauri-plugin-sql`
- Drizzle ORM (SQLite + PostgreSQL)
- React 18 + TypeScript + Vite
- PostgreSQL (Supabase/Neon)

## Success Criteria

- [ ] All 7 capabilities spec'd, implemented, verified
- [ ] Offline sale works fully disconnected, syncs when online
- [ ] Multi-store data isolated by `store_id`
- [ ] Cash closing produces correct balance per shift
- [ ] Invoice generation works (print + PDF), no AFIP
