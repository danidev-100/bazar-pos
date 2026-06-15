# Proposal: Admin Roles & UI

## Intent

Enable admin features (brands, bulk pricing, cost tracking) and dark theme. POS has no admin boundary — new features need PIN protection. Products lack brand association and cost tracking, preventing margin analysis.

## Scope

### In Scope
- Brands CRUD (name per store)
- `cost_price` + `brand_id` on products
- PIN-protected admin route toggle
- Bulk price: filter by category/brand/both/all; target cost/selling/both
- Dark theme toggle in settings
- UI: monospace numbers, aligned columns, touch-friendly tables

### Out of Scope
- Multi-user roles (admin/not-admin only)
- Audit log, brand discounts, cost price history

## Capabilities

### New
- `brands`: CRUD for product brands (name + store_id). Products reference via brand_id FK.
- `admin-auth`: PIN-protected admin mode. Admin pages hidden when off.
- `bulk-price-increase`: % price update with category/brand combos. Targets cost, selling, or both.
- `dark-theme`: Full dark mode via Tailwind `dark:` variant. Persists to localStorage.

### Modified
- `products-stock`: Add `cost_price` (decimal) + `brand_id` (FK). Schema migration + new spec requirements.

## Approach

Extend Drizzle schema + Zustand stores. Bulk price: one-shot DB transaction with preview. Admin PIN: Web Crypto hash stored in localStorage. Dark theme: Tailwind `dark:` class + CSS vars. All scoped by `store_id`.

## Affected Areas

| Area | Impact | Notes |
|------|--------|-------|
| `src/db/schema.ts` | Modified | Brands table + product cols |
| `src/store/` | Modified | +brands +admin +dark slices |
| `src/pages/` | New/Mod | AdminPage (new), ProductsPage (cost+brand) |
| `src/components/` | New/Mod | BrandForm, BulkPriceModal, AdminToggle |
| `src/App.tsx` | Modified | Admin route guard |
| `tailwind.config.js` | Modified | Dark mode config |
| `src/styles.css` | Modified | Dark CSS variables |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Insecure PIN | Low | Web Crypto hash; never raw |
| Bulk price corruption | Low | Transaction + preview |
| Dark theme gaps | Med | Incremental per-page testing |

## Rollback

Revert admin PIN → flat routing. Drop brands table + columns. Revert dark CSS. Each step is a revertible commit.

## Dependencies

- Drizzle migration (brands table + product columns)
- No new npm dependencies

## Success Criteria

- [ ] Brands CRUD persists, scoped by store
- [ ] Products show cost_price and brand in form + grid
- [ ] Admin PIN toggle works and persists across restarts
- [ ] Bulk price: preview matches actual for all filter combos
- [ ] Dark theme: all 5 pages render correctly in dark mode
- [ ] Numbers: monospace, right-aligned, no wrapping
