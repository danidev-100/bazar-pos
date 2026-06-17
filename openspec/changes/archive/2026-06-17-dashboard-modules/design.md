# Design: Dashboard Modules

## Technical Approach

Extend the Zustand `Page` enum with `"dashboard"`, change the default from `"pos"` to `"dashboard"`, create `DashboardPage.tsx` with an 8-card responsive grid, register it in `App.tsx`'s `PAGE_COMPONENTS`, and add a dashboard entry to `NavigationBar` so users can return to the hub.

Each card renders an inline SVG icon and Spanish label. Active cards call `setPage(target)`. Disabled cards (Proveedores, Pedidos) render with reduced opacity and a "Próximamente" badge but no `onClick` handler.

## Architecture Decisions

### State-driven nav vs React Router
- **Choice**: Keep Zustand state-driven navigation
- **Rationale**: Already established. No router dependency exists, Tauri doesn't need URL routing, and adding React Router would increase bundle size and complexity with zero benefit for 8 flat pages.

### Card component: inline vs reusable
- **Choice**: Co-located `ModuleCard` sub-component inside `DashboardPage.tsx`
- **Rationale**: Follows the existing pattern in `StatsPage.tsx` where `SummaryCard` is defined in the same file. A separate components/ file would be premature — the card is only used here (~30 lines).

### Icon library
- **Choice**: Inline SVGs (no icon library dependency)
- **Rationale**: `package.json` has no `lucide-react` or other icon dependency. The codebase already uses inline SVGs in `AdminRoute.tsx` and `ThemeToggle.tsx`. Emojis are used in `NavigationBar.tsx` but with a `// replace with SVG later` comment. Inline SVGs avoid adding a dependency and give full visual control.

### Disabled card UX
- **Choice**: Full card renders in DOM with `opacity-50`, `cursor-not-allowed`, no `onClick` handler, plus a "Próximamente" badge overlay
- **Rationale**: Keeping disabled cards in the DOM preserves layout stability (no layout shift when modules become active later). No `onClick` means no navigation on click or keyboard Enter. `opacity-50` + `cursor-not-allowed` signals inactive state. No `pointer-events-none` — we want the cursor change to be visible on hover.

### NavigationBar integration
- **Choice**: Add `{ id: "dashboard", label: "Inicio", icon: "<svg>..." }` as FIRST entry in `NavigationBar`'s `PAGES` array
- **Rationale**: Without this, dashboard is unreachable after the user navigates away (dead-end UX). A home button at the start of the navbar is the idiomatic pattern. The existing PAGES pattern extends naturally.

## Data Flow

```
User clicks active card
  → ModuleCard calls setPage(target)
    → Zustand page state updates
      → App.tsx re-renders target PageComponent
        → Dashboard unmounts, target mounts

User clicks disabled card
  → No onClick handler → nothing happens
    → No state change, no navigation
```

No data fetching, no side effects, no network calls.

## Card Mapping

| Label | Target | State | Notes |
|-------|--------|-------|-------|
| Ventas | `"pos"` | Active | Redirects to POS |
| Inventario | `"products"` | Active | Products management |
| Clientes | `"customers"` | Active | Customer list |
| Proveedores | — | Disabled | Shows "Próximamente" |
| Pedidos | — | Disabled | Shows "Próximamente" |
| Estadísticas | `"stats"` | Active | Sales stats & charts |
| Configuración | `"admin"` | Active | Admin-route guarded |
| Usuarios | `"admin"` | Active | Same admin page as Configuración |

**Note**: The spec (`specs/dashboard-layout/spec.md`) uses non-existent page targets like `"products-stock"` and `"sales-statistics"`. This design uses the actual Page enum values (`"products"`, `"stats"`, etc.) verified from `src/store/index.ts`. Spec targets will be corrected at archive time.

## File Changes

| File | Action | Description |
|------|--------|------------|
| `src/store/index.ts` | Modify | Add `"dashboard"` to `Page` union; change default `page: "pos"` → `page: "dashboard"` |
| `src/pages/DashboardPage.tsx` | Create | 8-card responsive grid with inline SVG icons, `ModuleCard` sub-component |
| `src/App.tsx` | Modify | Import `DashboardPage`, add to `PAGE_COMPONENTS` |
| `src/components/NavigationBar.tsx` | Modify | Add "Inicio" dashboard entry to `PAGES` array |

## Interfaces / Contracts

```typescript
type ModuleConfig = {
  label: string;
  icon: React.ReactNode;  // inline SVG element
  target: Page | null;     // null = disabled placeholder
};

const MODULES: ModuleConfig[] = [
  { label: "Ventas",       icon: <SaleIcon />,       target: "pos" },
  { label: "Inventario",   icon: <PackageIcon />,    target: "products" },
  { label: "Clientes",     icon: <UsersIcon />,      target: "customers" },
  { label: "Proveedores",  icon: <TruckIcon />,      target: null },
  { label: "Pedidos",      icon: <ClipboardIcon />,  target: null },
  { label: "Estadísticas", icon: <ChartIcon />,      target: "stats" },
  { label: "Configuración",icon: <GearIcon />,       target: "admin" },
  { label: "Usuarios",     icon: <ShieldIcon />,     target: "admin" },
];
```

## Responsive Grid Strategy

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
  {/* 2 cols × 4 rows on mobile, 3 cols × 3/2 on tablet, 4 cols × 2 rows on desktop */}
```

Using Tailwind's responsive prefixes. The 8 cards flow naturally: 4×2 on desktop (lg), 3 columns on tablet (sm), 2 on mobile (default). No custom breakpoints needed.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | DashboardPage renders 8 cards | `screen.getAllByRole("button")` → length 8 |
| Unit | Active cards call `setPage(target)` | `vi.spyOn(store, "setPage")`, click card → assert called with target |
| Unit | Disabled cards do NOT call setPage | Click disabled card → assert setPage NOT called |
| Unit | Default page is `"dashboard"` | `expect(useAppStore.getState().page).toBe("dashboard")` |
| Unit | Disabled cards show "Próximamente" | `screen.getByText("Próximamente")` exists for Proveedores & Pedidos |
| Unit | Grid classes applied | Assert container has `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` |

## Migration

No migration required. Pure frontend change — no schema, no DB, no persisted state to migrate.

## Open Questions

- [ ] NavBar "Inicio" button: this design adds it. If stakeholders want dashboard unreachable after first navigation (pure landing page), remove the NavBar entry. Decision needed before apply.
- [ ] Spec cards (dashboard-layout/spec.md) use wrong page targets (products-stock, sales-statistics, internal-billing). Will be corrected at archive time when deltas merge.
