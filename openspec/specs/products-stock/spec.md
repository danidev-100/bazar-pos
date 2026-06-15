# Products & Stock Specification

## Purpose

Manage product catalog with categories, barcodes, stock quantities, and movement history. Designed for touch-friendly counter use.

## Requirements

### R1: Categories

The system MUST support hierarchical product categories (name, parent_id, store_id).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | A store has no categories | A user creates "Bebidas" under store_id=X | The category is saved with store_id=X |
| Nested category | Category "Bebidas" exists | A user adds subcategory "Gaseosas" with parent="Bebidas" | The subcategory is linked via parent_id |
| Duplicate name | "Bebidas" exists in store X | A user creates "Bebidas" in same store | The system SHOULD reject the duplicate |

### R2: Barcodes

The system MUST support unique barcodes per product per store.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | A store has no product with barcode "77912345" | A user adds a product with that barcode | The product and barcode are saved |
| Duplicate barcode | Product with barcode "77912345" exists | A user adds another product with same barcode | The system MUST reject with a duplicate error |
| Empty barcode | A product has no barcode | A user saves the product | The system SHALL accept it (barcode is optional) |

### R3: Stock Quantities

Stock quantity MUST be tracked per product per store. Initial stock on creation is zero.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | A product exists with 10 units | A user checks stock | The system displays quantity = 10 |
| Negative stock | A product has 1 unit | A user sells 2 units offline | The system SHALL allow negative stock (track shortage) |

### R4: Stock Movements

All stock changes MUST be recorded as movements with type, quantity, timestamp, and user.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Purchase entry | A product has 5 units | A user records a purchase of +10 | A movement of type "purchase" is created; quantity becomes 15 |
| Sale deduction | Same product | A POS sale deducts 3 units | A movement of type "sale" is created with -3 |
| Manual adjustment | Stock count shows 12, system shows 10 | A user adjusts to 12 | A movement of type "adjustment" is created with delta +2 |
