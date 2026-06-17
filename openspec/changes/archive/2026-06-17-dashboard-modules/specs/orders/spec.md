# Orders Specification

> **STATUS: PLACEHOLDER** — This capability is not yet implemented. The dashboard includes a disabled "Pedidos" card that indicates this module is coming soon. No CRUD, routes, or backend logic exist.

## Purpose

Future module for order management (gestión de pedidos a proveedores). Once implemented, this module will allow users to create purchase orders, track delivery status, and manage order history.

## Current Behavior

| Aspect | Value |
|--------|-------|
| Dashboard card | Present at card #7, label "Pedidos" |
| Card state | Disabled, shows "Próximamente" |
| Navigation | No `setPage()` call — card is inert |
| Page component | Not registered in `PAGE_COMPONENTS` |
| Backend | None |

## Future Requirements (Not Yet Specified)

When this capability is implemented in a future SDD cycle, it will need specs for:

- Order CRUD (create, read, update, delete/cancel)
- Order status workflow (pending → approved → shipped → received)
- Supplier and product line-item association
- Delivery date tracking
- Store-scoped data (store_id)
- Offline sync support
