# Proposal: Dashboard & Module Navigation

## Intent

App launches directly into POS with no orientation. Dashboard gives users a central hub to discover all modules and serves as home base for future widgets.

## Scope

### In Scope
- Add `"dashboard"` to Zustand `Page` enum; change default from `"pos"` to `"dashboard"`
- `DashboardPage.tsx` with responsive card grid (8 modules)
- Proveedores (suppliers) → placeholder card (disabled)
- Pedidos (orders) → placeholder card (disabled)
- Usuarios (users) → placeholder card pointing to admin
- Keep `NavigationBar` — dashboard is a new page, not a replacement

### Out of Scope
- Live data/KPIs on cards (pure navigation only)
- Supplier/order/user CRUD (each needs own SDD cycle)
- Removing the nav bar entirely

## Capabilities

### New Capabilities
- `dashboard-layout`: Dashboard page with responsive card grid. Each card: icon, label, active/locked state. No live data.
- `suppliers`: Supplier management (placeholder only — no CRUD yet)
- `orders`: Order management (placeholder only — no CRUD yet)

### Modified Capabilities
- `pos-sales`: Entry point changes from default landing page to dashboard card. No spec-level behavior change.
- `products-stock`: Now accessed from dashboard card. No spec-level behavior change.
- `sales-statistics`: Now accessed from dashboard card. No spec-level behavior change.

## Approach

1. Extend `Page` enum in `src/store/index.ts`: add `"dashboard"`, default `→ "dashboard"`.
2. Create `src/pages/DashboardPage.tsx` — responsive 2x4 grid. Each card: icon, label, `onClick → setPage()`.
3. Update `PAGE_COMPONENTS` in `src/App.tsx`.
4. Placeholder modules render disabled card; no page component registered.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/store/index.ts` | Modified | +`"dashboard"` in `Page`; default → `"dashboard"` |
| `src/App.tsx` | Modified | Add `DashboardPage` to `PAGE_COMPONENTS` |
| `src/pages/DashboardPage.tsx` | New | 8-card navigation grid |
| `src/components/NavigationBar.tsx` | Modified | Optionally simplify nav (TBD) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `admin-roles-ui` partially applied — enum conflicts | Med | Inspect `Page` before editing; rebase if needed |
| Placeholder modules confuse users | Low | Disabled state + "Próximamente" label |
| Users accustomed to POS-first launch | Low | POS card is first in grid; one click to sales |

## Rollback

Revert default to `"pos"`, remove `"dashboard"` from `Page`, delete `DashboardPage.tsx`, revert `App.tsx`. Each step revertible.

## Dependencies

None — pure frontend, no schema/API/package changes.

## Success Criteria

- [ ] App loads showing dashboard (not POS) on first launch
- [ ] Each card navigates to its correct page via `setPage()`
- [ ] Proveedores/Pedidos show disabled state; Usuarios → admin
- [ ] All existing nav bar navigation still works
