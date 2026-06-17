# Dashboard Layout Specification

## Purpose

Dashboard serves as the application landing page — a central hub with a responsive card grid that lets users discover and navigate to every module. Each card displays an icon and label; active cards navigate to the corresponding page, while placeholder cards show a disabled/locked state.

## Requirements

### R1: Default Landing Page

The application MUST load the dashboard page on first launch instead of POS.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Fresh launch | The app starts with no persisted page state | The system initializes | The Zustand Page state is `"dashboard"` |
| Navigation away | User navigates to POS | User launches the app again | The app loads POS because the state persists (no forced redirect) |
| Default override | App code sets default = `"dashboard"` | A user upgrades from a previous version | The first launch after upgrade shows the dashboard |

### R2: Card Grid Display

The dashboard MUST render exactly 8 cards in a responsive grid layout. Each card SHALL display an icon and a label. No live data or KPIs are shown.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Full grid rendered | The dashboard page mounts | The system renders the page | 8 card elements are present in the DOM |
| Card content | Each card definition provides icon + label | A card renders | The card displays its icon and label text |
| No live data | No API calls for KPIs exist | The dashboard loads | No network requests for metrics or counts are made |
| Icon rendering | Each card has an icon assigned | The card renders | An `<svg>`, `<img>`, or icon component is visible inside the card |

The 8 cards and their targets:

| Card # | Label | Target Page | State |
|--------|-------|-------------|-------|
| 1 | Ventas | `"pos"` | Active |
| 2 | Inventario | `"products"` | Active |
| 3 | Clientes | `"customers"` | Active |
| 4 | Proveedores | — | Disabled — shows "Próximamente" |
| 5 | Pedidos | — | Disabled — shows "Próximamente" |
| 6 | Estadísticas | `"stats"` | Active |
| 7 | Configuración | `"admin"` | Active (admin route) |
| 8 | Usuarios | `"admin"` | Active (admin route) |

### R3: Card Navigation

Clicking an active card MUST navigate to the corresponding page via `setPage()`. Disabled cards MUST NOT navigate.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Active card click | Dashboard is displayed | A user clicks card #1 (Ventas) | `setPage("pos")` is called; the view switches to POS |
| Inventory navigation | Dashboard is displayed | A user clicks card #2 (Inventario) | `setPage("products")` is called |
| Customers navigation | Dashboard is displayed | A user clicks card #3 (Clientes) | `setPage("customers")` is called |
| Statistics navigation | Dashboard is displayed | A user clicks card #6 (Estadísticas) | `setPage("stats")` is called |
| Settings navigation | Dashboard is displayed | A user clicks card #7 (Configuración) | `setPage("admin")` is called |
| Admin navigation | Dashboard is displayed | A user clicks card #8 (Usuarios) | `setPage("admin")` is called |
| Disabled card click | Dashboard is displayed | A user clicks card #4 (Proveedores) | `setPage()` is NOT called; no navigation occurs |
| Disabled card click #2 | Dashboard is displayed | A user clicks card #5 (Pedidos) | `setPage()` is NOT called; no navigation occurs |

### R4: Disabled State

Cards for modules not yet implemented MUST render in a visually distinct disabled state and show a "Próximamente" hint.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Visual disabled | Card #4 or #5 is rendered | The card appears | It has reduced opacity, a lock icon, or a grayed-out style distinct from active cards |
| Hover behavior | An active card is hovered | User hovers over card #1 | The card responds with a hover effect (e.g., scale, shadow, cursor pointer) |
| Hover on disabled | A disabled card (#4) is hovered | User hovers over it | No hover effect; cursor is `not-allowed` or default |
| Tooltip / hint | A disabled card is rendered | User sees card #4 | "Próximamente" text is visible on or near the card |
| Keyboard click | A disabled card is focused | User presses Enter on card #4 | No navigation occurs; `setPage()` is not called |
| Tab order | All cards are rendered | A user tabs through the grid | Active cards receive focus; disabled cards MAY be skipped or receive focus with no action |

### R5: Responsive Layout

The card grid MUST adapt to viewport width. No horizontal scroll should appear at standard breakpoints.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Desktop ≥1024px | Viewport is 1280px wide | The grid renders | Cards are in a 4-column layout (2 rows × 4 cols) |
| Tablet 640–1023px | Viewport is 768px wide | The grid renders | Cards are in a 3-column or 2-column layout |
| Mobile <640px | Viewport is 375px wide | The grid renders | Cards are in a 1-column or 2-column layout; no horizontal overflow |
| Grid gap | Any viewport | Cards are rendered | Consistent gap/spacing between cards (≥8px) |
| No overflow | Viewport is 320px wide | The grid renders | No horizontal scrollbar appears; cards shrink proportionally |
