# Delta for pos-sales

## ADDED Requirements

### Requirement: Auto-Detect Combo Fulfillment

When items are added to the cart, the system MUST check if the current cart fulfills any active combo.

#### Scenario: Combo detected in cart
- GIVEN an active combo with products A and B at a discounted price
- WHEN the user adds product A and product B to the cart
- THEN the system SHALL detect the combo and apply the combo price
- AND the total SHALL reflect the combo discount

#### Scenario: Combo discount removed when item removed
- GIVEN a cart with a fulfilled combo
- WHEN the user removes one product that is part of the combo
- THEN the combo discount SHALL be removed from the total

#### Scenario: Multiple combos in cart
- GIVEN two active combos: Combo1 (A+B) and Combo2 (C+D)
- WHEN the user adds products A, B, C, and D to the cart
- THEN the system SHALL detect and apply discounts for both combos when they are independent

#### Scenario: Combo not applied for partial fulfillment
- GIVEN an active combo with products A and B
- WHEN the user adds only product A to the cart
- THEN the system MUST NOT apply the combo discount

## MODIFIED Requirements

### Requirement: Cart Total Calculation (from existing pos-sales spec)

The system MUST calculate the cart total including item subtotals, per-item discounts, combo discounts (when applicable), and optional global discount.
(Previously: Cart total was calculated from item subtotals, per-item discounts, and global discount only)

#### Scenario: Total with combo discount
- GIVEN a cart with products fulfilling a combo
- WHEN the user views the total
- THEN the total SHALL reflect items at their individual prices MINUS the combo discount (sum of individual prices minus the combo special price)

#### Scenario: Combo + global discount stacking
- GIVEN a cart fulfilling a combo with a global discount applied
- WHEN the user views the total
- THEN the total SHALL be: combo price (individual sum minus combo savings) MINUS global discount applied on the total

### Requirement: Sale Item Recording (from existing pos-sales spec)

The system MUST record a `combo_id` on each sale_item that was part of an applied combo discount.
(Previously: Sale items only stored product_id, quantity, unit_price, subtotal)

#### Scenario: Save combo info with sale
- GIVEN a completed sale with a combo discount applied
- WHEN the sale items are persisted
- THEN each item that was part of the combo SHALL have its `combo_id` field set
