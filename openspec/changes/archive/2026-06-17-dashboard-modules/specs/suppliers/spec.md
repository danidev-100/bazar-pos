# Suppliers Specification

> **STATUS: PLACEHOLDER** — This capability is not yet implemented. The dashboard includes a disabled "Proveedores" card that indicates this module is coming soon. No CRUD, routes, or backend logic exist.

## Purpose

Future module for supplier management (alta, baja, modificación de proveedores). Once implemented, this module will allow users to manage supplier records including name, contact info, tax ID, and purchase history.

## Current Behavior

| Aspect | Value |
|--------|-------|
| Dashboard card | Present at card #6, label "Proveedores" |
| Card state | Disabled, shows "Próximamente" |
| Navigation | No `setPage()` call — card is inert |
| Page component | Not registered in `PAGE_COMPONENTS` |
| Backend | None |

## Future Requirements (Not Yet Specified)

When this capability is implemented in a future SDD cycle, it will need specs for:

- Supplier CRUD (create, read, update, delete)
- Supplier search/filter
- Contact info and tax ID management
- Purchase history per supplier
- Store-scoped data (store_id)
- Offline sync support
