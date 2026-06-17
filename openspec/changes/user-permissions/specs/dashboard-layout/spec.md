# Delta for dashboard-layout

## MODIFIED Requirements

### Requirement: R2: Card Grid Display

The dashboard MUST render exactly 8 cards in a responsive grid layout. Each card SHALL display an icon and a label. No live data or KPIs are shown.
(Previously: Card #8 targeted "admin" route)

| Card # | Label | Target Page | State |
|--------|-------|-------------|-------|
| 1 | Ventas | `"pos"` | Active |
| 2 | Inventario | `"products"` | Active |
| 3 | Clientes | `"customers"` | Active |
| 4 | Proveedores | — | Disabled — shows "Próximamente" |
| 5 | Pedidos | — | Disabled — shows "Próximamente" |
| 6 | Estadísticas | `"stats"` | Active |
| 7 | Configuración | `"admin"` | Active |
| 8 | Usuarios | `"user-management"` | Active |

#### Scenario: Full grid rendered (unchanged)

- GIVEN The dashboard page mounts
- WHEN The system renders the page
- THEN 8 card elements are present in the DOM

#### Scenario: Card content (unchanged)

- GIVEN Each card definition provides icon + label
- WHEN A card renders
- THEN The card displays its icon and label text

#### Scenario: No live data (unchanged)

- GIVEN No API calls for KPIs exist
- WHEN The dashboard loads
- THEN No network requests for metrics or counts are made

#### Scenario: Icon rendering (unchanged)

- GIVEN Each card has an icon assigned
- WHEN The card renders
- THEN An icon component is visible inside the card

### Requirement: R3: Card Navigation

Clicking an active card MUST navigate to the corresponding page via `setPage()`. Disabled cards MUST NOT navigate.
(Previously: Card #8 navigated to "admin")

#### Scenario: Active card click (unchanged)

- GIVEN Dashboard is displayed
- WHEN A user clicks card #1 (Ventas)
- THEN `setPage("pos")` is called

#### Scenario: Inventory navigation (unchanged)

- GIVEN Dashboard is displayed
- WHEN A user clicks card #2 (Inventario)
- THEN `setPage("products")` is called

#### Scenario: Customers navigation (unchanged)

- GIVEN Dashboard is displayed
- WHEN A user clicks card #3 (Clientes)
- THEN `setPage("customers")` is called

#### Scenario: Statistics navigation (unchanged)

- GIVEN Dashboard is displayed
- WHEN A user clicks card #6 (Estadísticas)
- THEN `setPage("stats")` is called

#### Scenario: Settings navigation (unchanged)

- GIVEN Dashboard is displayed
- WHEN A user clicks card #7 (Configuración)
- THEN `setPage("admin")` is called

#### Scenario: User management navigation (modified)

- GIVEN Dashboard is displayed
- WHEN A user clicks card #8 (Usuarios)
- THEN `setPage("user-management")` is called

#### Scenario: Disabled card click (unchanged)

- GIVEN Dashboard is displayed
- WHEN A user clicks card #4 (Proveedores)
- THEN `setPage()` is NOT called; no navigation occurs

#### Scenario: Disabled card click #2 (unchanged)

- GIVEN Dashboard is displayed
- WHEN A user clicks card #5 (Pedidos)
- THEN `setPage()` is NOT called; no navigation occurs
