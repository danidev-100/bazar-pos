# Brands Specification

## Purpose

Manage product brands for categorization and filtering. Brands are scoped per store and used as a FK target for products.

## Requirements

### B1: Create Brand

The system MUST allow creating a brand with a name and store_id. The combination of name + store_id MUST be unique.

#### Scenario: Happy path

- GIVEN store X has no brand named "Coca-Cola"
- WHEN a user creates brand "Coca-Cola" for store X
- THEN the brand is saved with name="Coca-Cola" and store_id=X

#### Scenario: Duplicate brand name

- GIVEN store X has brand "Coca-Cola"
- WHEN a user tries to create "Coca-Cola" again in store X
- THEN the system MUST reject with a duplicate error

### B2: Read Brands

The system MUST list brands filtered by store_id, ordered alphabetically by name.

#### Scenario: List brands

- GIVEN store X has brands "Pepsi" and "Coca-Cola"
- WHEN a user opens the brands page for store X
- THEN brands display as "Coca-Cola" then "Pepsi" (alphabetical)

#### Scenario: Empty list

- GIVEN store X has no brands
- WHEN a user opens the brands page
- THEN an empty state message SHOULD be shown

### B3: Update Brand

The system MUST allow renaming a brand within the same store.

#### Scenario: Rename brand

- GIVEN brand "Coca-Cola" exists in store X
- WHEN a user renames it to "Coca-Cola Zero"
- THEN the brand name updates; existing product references remain intact

### B4: Delete Brand

The system MUST allow deleting a brand. Deleting a brand that is referenced by products MUST set those products' brand_id to null (SET NULL).

#### Scenario: Delete brand with products

- GIVEN brand "Coca-Cola" is assigned to 3 products
- WHEN a user deletes the brand
- THEN the brand is removed; all 3 products have brand_id = null

#### Scenario: Delete unused brand

- GIVEN a brand with no product references
- WHEN a user deletes it
- THEN the brand is removed without side effects
