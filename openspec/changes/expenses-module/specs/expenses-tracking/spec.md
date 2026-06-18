# Expenses Tracking Specification

## Purpose

Record, edit, and delete daily operational expenses per store with monthly aggregation by category and payment method. Gated under `"configuracion"` permission.

## Requirements

### R1: Create Expense

The system MUST allow creating an expense with: description, amount, category (fixed enum), date (YYYY-MM-DD), payment method (cash/card), and store_id.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Create successfully | User has "configuracion" permission | They submit valid expense data | The expense is persisted with unique id and `createdAt` |
| Missing permission | User does NOT have "configuracion" | They access the expenses page | The system denies access |

### R2: List Expenses

The system MUST list expenses for a store with optional filtering by date range, category, or month.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Filter by date range | Expenses exist on 2026-06-01 and 2026-06-15 | User filters 2026-06-01 to 2026-06-10 | Only the 2026-06-01 expense is returned |
| Filter by category | Expenses with categories "Insumos" and "Servicios" | User filters by "Insumos" | Only "Insumos" expenses returned |
| Filter by month | Expenses exist in May and June 2026 | User selects month 2026-05 | Only May expenses returned |

### R3: Edit Expense

The system MUST allow editing any field of an existing expense by its id.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Edit fields | Expense exists with description "Café", amount 1500 | User updates to "Café grande", 2000 | Expense reflects new values; `updatedAt` set |
| Non-existent | No expense with id = 999 exists | User attempts to update id 999 | Error "Gasto no encontrado" |

### R4: Delete Expense

The system MUST allow deleting an expense by its id.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Delete existing | Expense id = 5 exists | User deletes it | Expense removed from lists and summaries |
| Non-existent | No expense with id = 999 exists | User attempts to delete id 999 | Error "Gasto no encontrado" |

### R5: Monthly Summary

The system MUST provide a monthly summary with totals grouped by category and payment method for a given store and month.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Totals by category | June 2026 expenses: 10000 "Insumos", 5000 "Servicios" | User views summary for 2026-06 | Report shows each category with its total |
| Totals by payment method | June 2026: cash = 8000, card = 7000 | User views summary for 2026-06 | Report shows payment method totals |
| Empty month | No expenses in June 2025 | User views summary for 2025-06 | All categories and payment methods show 0 |

### R6: Data Validation

The system MUST validate: amount > 0, description non-empty, category from fixed enum, date valid YYYY-MM-DD, payment method "cash" or "card". Categories: "Alquiler", "Servicios", "Insumos", "Sueldos", "Impuestos", "Marketing", "Mantenimiento", "Varios".

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Amount must be positive | Amount = 0 | User submits | Rejected: "El importe debe ser mayor a 0" |
| Description required | Empty description | User submits | Rejected: "La descripción es requerida" |
| Invalid category | Category "Invalida" | User submits | Rejected: "Categoría inválida" |
| Invalid date | Date "18-06-2026" | User submits | Rejected: "Fecha inválida (use YYYY-MM-DD)" |
| Invalid payment method | payment_method "bitcoin" | User submits | Rejected: "Medio de pago inválido" |
