# Delta for Dashboard Layout

## MODIFIED Requirements

### R2: Card Grid Display

The dashboard MUST render at least 9 cards in a responsive grid layout. Each card SHALL display an icon and a label. No live data or KPIs are shown. Cards MAY be filtered by user permission.
(Previously: exactly 8 cards, no permission filtering)

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Full grid rendered | The dashboard page mounts | The system renders the page | At least 9 card elements are present in the DOM |
| Card content | Each card definition provides icon + label | A card renders | The card displays its icon and label text |
| No live data | No API calls for KPIs exist | The dashboard loads | No network requests for metrics or counts are made |
| Icon rendering | Each card has an icon assigned | The card renders | An `<svg>`, `<img>`, or icon component is visible inside the card |

The 9 cards and their targets:

| # | Label | Target Page | State | Permission |
|---|-------|-------------|-------|------------|
| 1 | Ventas | `"pos"` | Active | — |
| 2 | Inventario | `"products"` | Active | — |
| 3 | Clientes | `"customers"` | Active | — |
| 4 | Proveedores | — | Disabled | — |
| 5 | Pedidos | — | Disabled | — |
| 6 | Estadísticas | `"stats"` | Active | — |
| 7 | Configuración | `"admin"` | Active | — |
| 8 | Usuarios | `"admin"` | Active | — |
| 9 | Gastos | `"expenses"` | Active | `"configuracion"` |

#### Scenario: Card 9 renders for authorized user

- GIVEN the dashboard mounts
- WHEN the user has "configuracion" permission
- THEN card #9 (Gastos) is visible with its icon and label

#### Scenario: Card 9 hidden without permission

- GIVEN the dashboard mounts
- WHEN the user does NOT have "configuracion" permission
- THEN card #9 is NOT rendered in the grid

#### Scenario: Grid adapts with 9 cards

- GIVEN a 1280px viewport
- WHEN the grid renders 9 cards
- THEN cards wrap to a third row with no horizontal overflow

## ADDED Requirements

### R6: Permission-based Card Visibility

The dashboard MUST filter cards based on user permissions. A card with a non-empty `permission` field SHALL only render when the current user has that permission. Cards without a `permission` field SHALL render for all users.

#### Scenario: Permission-filtered card hidden

- GIVEN card #9 has permission `"configuracion"`
- WHEN a user without that permission views the dashboard
- THEN card #9 is absent from the DOM

#### Scenario: Unrestricted card visible to all

- GIVEN card #1 has no permission field
- WHEN any user views the dashboard
- THEN card #1 renders normally

#### Scenario: Navigation to permission-gated page

- GIVEN the user has "configuracion" permission
- WHEN they click card #9
- THEN `setPage("expenses")` is called and the view switches to Expenses
