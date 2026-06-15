# POS Rápido Specification

## Purpose

Speed up POS for employees: keyboard shortcuts, barcode scanning, mixed payment, improved search, and quantity quick-edit. All additions MUST NOT break existing POS flows.

## Requirements

### R1: Keyboard Shortcuts

The system MUST handle F1 (checkout), F2 (focus search), F3 (clear cart), `+`/`-` (adjust qty), and Escape (close modals). All handled keys MUST call `preventDefault()`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| F1 opens checkout | Cart has ≥1 item | User presses F1 | CheckoutModal opens; focused on payment |
| F2 focuses search | POSPage loaded | User presses F2 | Cursor moves to search input |
| F3 clears cart | Cart has items | User presses F3 | Cart empties; new sale starts |
| `+` increments qty | Cart item has qty=1 | User presses `+` | Item qty becomes 2 |
| `-` decrements qty | Cart item has qty=2 | User presses `-` | Item qty becomes 1 |
| Escape closes modal | CheckoutModal open | User presses Escape | Modal closes; no sale saved |
| F1 with empty cart | Cart has 0 items | User presses F1 | Nothing happens |

### R2: Barcode Scan & Auto-Add

The system MUST capture scanner input via a hidden auto-focused input. On input, SHALL debounce 250ms then match against product barcodes. On match, auto-add with green flash. On miss, show error toast.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy match | Product with barcode "789123" exists | Scanner inputs "789123" | Product added to cart; green flash |
| Barcode not found | No product for barcode "000000" | Scanner inputs "000000" | Error toast: "Product not found" |
| Debounce window | Scanner feeds chars one-by-one | Chars arrive within 250ms | No match attempted until silence |
| Rapid sequential scans | Two products scanned | First resolves, second arrives | Both products added sequentially |

### R3: Mixed Payment

CheckoutModal MUST support split cash/card. Two inputs: `cash_amount` and `card_amount`. Entering cash auto-calculates `card = total - cash`. System MUST validate split equals total before saving. Sale saves with `payment_method="mixed"`, `cash_amount`, and `card_amount`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Cash + card split | Total is $550 | User enters cash $200 | Card auto-fills to $350; sale saves as "mixed" |
| Cash over total | Total is $550 | User enters cash $600 | Card shows $0; change = $50 displayed |
| Validation fails | Total is $550 | User enters cash $200 + card $300 | Error: "Split does not equal total" |
| Existing methods unchanged | Sale uses "cash" | Existing flow runs | Saved without mixed fields |

### R4: Search Improvements

Product search MUST match on name AND barcode. Search results SHALL display barcode alongside name and price.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Search by name | Product "Coca-Cola" exists | User types "cola" | Product appears in results |
| Search by barcode | Product with barcode "789123" exists | User types "789" | Product appears in results |
| Barcode visible | Product "Coca-Cola" (barcode "789123") | Results render | Each card shows barcode |

### R5: Quantity Quick-Edit

Each cart line item SHALL have `+` and `-` buttons. Clicking the quantity display SHALL activate inline text input for direct entry.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| `+` increments | Cart has 1x item A | User clicks `+` | Qty becomes 2; subtotal doubles |
| `-` decrements | Cart has 2x item A | User clicks `-` | Qty becomes 1 |
| `-` at qty=1 | Cart has 1x item A | User clicks `-` | Item removed from cart |
| Inline edit | Cart has 3x item A | User clicks "3" | Input appears with "3" selected |
| Inline set to 0 | Cart has 3x item A | User enters "0" and confirms | Item removed from cart |

### R6: Regression Guard

All existing POS flows (tap-add, cash/card checkout, receipt, cart operations) MUST continue to work unchanged.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Cash checkout | Cart total $550 | Select cash, enter $600 | Change = $50; sale saves as "cash" |
| Card checkout | Cart total $550 | Select card | Sale saves as "card"; no change |
| Tap-add | Product exists | User taps product | Added to cart with qty=1 |
| Receipt | Sale #42 completed | Receipt generates | Shows items, totals, payment, date |
