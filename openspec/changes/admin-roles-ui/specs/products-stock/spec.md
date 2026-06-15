# Delta for Products & Stock

## ADDED Requirements

### R5: Cost Price

Products MUST support a nullable `cost_price` field (decimal). The system SHALL display cost price in admin product forms and grids, and SHALL hide cost price from non-admin POS views.

When cost_price is absent, margin calculations MUST be omitted rather than showing zero.

#### Scenario: Admin sets cost price

- GIVEN a user is in admin mode editing a product
- WHEN they set cost_price to 150.00 and save
- THEN the product is saved with cost_price = 150.00

#### Scenario: Cost hidden from POS

- GIVEN admin mode is off
- WHEN the product grid renders
- THEN cost_price MUST NOT be visible in any column

### R6: Brand Association

Products MUST support an optional `brand_id` FK referencing the `brands` table. The system SHALL display brand as a select dropdown in product forms, populated from brands in the same store.

#### Scenario: Assign brand to product

- GIVEN store X has brands "Coca-Cola" and "Pepsi"
- WHEN a user selects "Coca-Cola" for a product and saves
- THEN the product's brand_id points to the Coca-Cola brand record

#### Scenario: Unassign brand

- GIVEN a product has brand_id set
- WHEN the user clears the brand dropdown and saves
- THEN brand_id is set to null

## MODIFIED Requirements

### R2: Barcodes

The system MUST support unique barcodes per product per store. Products SHALL also display cost_price and brand name in admin product details.

(Previously: only barcode uniqueness; no cost_price or brand display)

#### Scenario: Happy path

- GIVEN a store has no product with barcode "77912345"
- WHEN a user adds a product with that barcode, cost_price 250.00, and brand "Coca-Cola"
- THEN the product and barcode are saved with brand and cost_price

#### Scenario: Duplicate barcode

- GIVEN a product with barcode "77912345" exists
- WHEN a user adds another product with same barcode
- THEN the system MUST reject with a duplicate error

#### Scenario: Empty barcode

- GIVEN a product has no barcode
- WHEN a user saves the product
- THEN the system SHALL accept it (barcode is optional)
