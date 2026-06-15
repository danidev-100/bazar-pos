# Bulk Price Increase Specification

## Purpose

Apply percentage-based price increases to multiple products at once. Admin sets filters (category, brand, or all), picks target fields (cost, selling, or both), sees a preview of affected products, then commits in a single transaction.

## Requirements

### P1: Filter Selection

The system MUST support filtering products by category, brand, category + brand combined, or all products. Filters SHALL be scoped to the active store.

#### Scenario: Filter by category only

- GIVEN store X has 20 products in "Bebidas" and 10 in "Limpieza"
- WHEN a user selects category "Bebidas"
- THEN the preview shows only the 20 "Bebidas" products

#### Scenario: Filter by brand only

- GIVEN store X has 5 Coca-Cola products and 8 Pepsi products
- WHEN a user selects brand "Coca-Cola"
- THEN the preview shows only the 5 Coca-Cola products

#### Scenario: Filter by brand + category

- GIVEN store X has 3 Coca-Cola products in "Bebidas" and 2 in "Gaseosas"
- WHEN a user selects brand "Coca-Cola" AND category "Bebidas"
- THEN the preview shows only the 3 products matching both filters

### P2: Target Field Selection

The system MUST support selecting which price fields to update: cost_price only, selling price only, or both.

#### Scenario: Update both prices

- GIVEN 3 products each with cost_price=100 and selling_price=150
- WHEN a user applies a 10% increase targeting both fields
- THEN each product's cost_price becomes 110 and selling_price becomes 165

#### Scenario: Update selling price only

- GIVEN a product with cost_price=100 and selling_price=150
- WHEN a user applies a 20% increase targeting selling price only
- THEN cost_price stays 100; selling_price becomes 180

### P3: Preview Before Commit

Before applying, the system MUST show a preview table with product name, current prices, new prices, and the absolute change. The preview MUST NOT modify the database.

#### Scenario: Preview matches commit

- GIVEN a filter shows 5 products
- WHEN a user reviews the preview and confirms
- THEN the actual database changes MUST match the preview values exactly

#### Scenario: Cancel before commit

- GIVEN a preview is shown for 10 products
- WHEN a user cancels instead of confirming
- THEN no products are modified

### P4: Atomic Commit

The update MUST execute as a single database transaction. If any row fails, ALL changes MUST roll back.

#### Scenario: Transaction rollback

- GIVEN a bulk update targets 100 products
- WHEN one product fails to update due to a constraint error
- THEN all 100 products retain their original prices
