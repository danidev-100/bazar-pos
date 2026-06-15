# POS Sales Specification

## Purpose

Touch-friendly point-of-sale interface: cart management, checkout, receipt generation. All sales scoped by store_id. Must work fully offline.

## Requirements

### R1: Cart Management

The cart MUST support add, update quantity, and remove line items.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | A product with price $100 exists | A user taps the product | A line item with qty=1, price=$100 is added to cart |
| Update quantity | Cart has 1x $100 item | A user changes qty to 3 | Subtotal updates to $300 |
| Remove item | Cart has 2 line items | A user swipes/taps remove on one | That line item is removed; total recalculates |
| Empty product | A product has no price set | A user taps it | The system MUST show an error "Product has no price" |

### R2: Checkout

The system MUST process payment and finalize the sale atomically in local SQLite.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Cash payment | Cart total is $550 | User enters $600 cash | Change = $50 is displayed; sale is saved with status "completed" |
| Card payment | Cart total is $550 | User selects "card" | Sale is saved with payment_method="card"; no change displayed |
| Zero connectivity | Device is offline | User completes a sale | Sale is saved to local SQLite; sync queued |
| Empty cart | Cart has 0 items | User taps "checkout" | The system MUST disable checkout or show "Cart is empty" |

### R3: Receipt

A receipt MUST be generated for every completed sale.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | Sale #42 completed | System generates receipt | Receipt shows: items, totals, payment method, date, store |
| Reprint | Receipt already printed | User taps "reprint" | The system SHALL allow reprinting from sale history |

### R4: Multi-store Scope

All sales MUST be scoped by store_id. The POS SHALL filter products and record sales for the active store.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | User is on store_id=1 | User completes a sale | Sale is saved with store_id=1 |
| Cross-store | User switches to store_id=2 | User views sales history | Only sales with store_id=2 are shown |
