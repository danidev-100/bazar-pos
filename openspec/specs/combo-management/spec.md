# Combo Management Specification

## Purpose

Admins can create product bundles (combos) with special pricing. A combo groups multiple products with required quantities and a discounted bundle price.

## Requirements

### Requirement: Create Combo

The system MUST allow admins to create a combo with a name, a special combo price, and a selection of 1 or more products with quantities.

#### Scenario: Create a valid combo
- GIVEN the user is on the Combos admin section
- WHEN the user enters a name, selects 2 products with quantity 1 each, enters a combo price lower than the sum of individual prices, and clicks Save
- THEN the combo is created and appears in the combo list

#### Scenario: Combo must have at least one product
- GIVEN the user is creating a combo
- WHEN the user tries to save without selecting any products
- THEN the system SHALL show an error "Combo must have at least one product"

#### Scenario: Combo price must be lower than sum of items
- GIVEN the user is creating a combo
- WHEN the user enters a combo price equal to or higher than the sum of individual product prices
- THEN the system SHOULD warn that the combo should offer a discount

### Requirement: Edit Combo

The system MUST allow editing an existing combo's name, products, quantities, and price.

#### Scenario: Edit combo successfully
- GIVEN an existing combo
- WHEN the user modifies the name, adds/removes products, changes quantities, updates the price, and saves
- THEN the combo is updated in the list

### Requirement: Delete Combo

The system MUST allow deleting a combo.

#### Scenario: Delete combo successfully
- GIVEN an existing combo
- WHEN the user clicks Delete and confirms
- THEN the combo is removed from the list

### Requirement: List Combos

The system MUST list all combos for the active store.

#### Scenario: View combos
- GIVEN the user is in the Combos admin section
- WHEN there are combos for the current store
- THEN the system SHALL display them in a list showing name, product count, and combo price
- AND the user can click any combo to edit or delete it
