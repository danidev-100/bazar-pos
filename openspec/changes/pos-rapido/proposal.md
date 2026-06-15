# Proposal: POS Rápido — Keyboard, Barcode, Mixed Payment

## Intent

Employees need the POS to feel instant. Current flows require too many taps/clicks — no keyboard shortcuts, no barcode scanning, no mixed payment. Staff prefer paper.

## Scope

### In Scope
- Keyboard: F1 (checkout), F2 (search), F3 (clear), `+`/`-` (qty), Escape (close)
- Barcode: hidden input, 250ms debounce, auto-add, flash feedback
- Mixed payment: split cash/card in checkout
- Search: barcode already in filter — show in results grid
- Quantity: click qty to inline edit, `+`/`-` per item

### Out of Scope
- Customer selection changes
- Receipt printing
- Sale history
- Barcode label printing

## Capabilities

### New Capabilities
- `pos-keyboard-shortcuts`: POS-wide keyboard bindings (F1/F2/F3/+/-/Escape)
- `pos-barcode-scan`: Hidden input buffer, debounced auto-add, visual feedback
- `pos-mixed-payment`: Split cash/card checkout with validation

### Modified Capabilities
- `pos-sales`: Add `"mixed"` to payment method enum; store `cash_amount`/`card_amount`

## Approach

**Keyboard**: `useEffect` + `keydown` on POSPage — `preventDefault` on POS keys to avoid browser conflicts. Hint toast rendered once on first mount.

**Barcode**: Hidden `<input autofocus>` with 250ms debounce — on match call `addItem()` + green flash; on miss show error toast.

**Mixed payment**: New step in CheckoutModal after method selection — two number inputs (`cash_amount`, `card_amount`), auto-calc `card_amount = total - cash_amount`, validate sum equals total. Save as `payment_method="mixed"` with both amounts.

**Quantity**: Already has `+`/`-` buttons — add click-to-edit inline input on the quantity display.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/pages/POSPage.tsx` | Modified | Shortcuts, barcode buffer, hint toast |
| `src/components/CheckoutModal.tsx` | Modified | Mixed payment UI + validation |
| `src/components/CartPanel.tsx` | Modified | Click-to-edit qty, keyboard qty controls |
| `src/store/index.ts` | Modified | `checkout()` accepts `"mixed"`, `CompletedSale` type union |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Barcode debounce too fast/slow | Med | 250ms tested; expose as tunable if needed |
| Key conflicts with browser/Tauri | Low | `preventDefault` on all handled keys |
| Mixed payment breaks existing sales | Low | Additive type — `"cash"|"card"` records unchanged |

## Rollback Plan

Revert the PR. Each feature is independently revertible via separate commits. No schema migration involved.

## Dependencies

None. Pure frontend — React + Zustand only.

## Success Criteria

- [ ] F1 opens checkout, F2 focuses search bar, F3 clears cart
- [ ] `+` and `-` adjust selected cart item quantity
- [ ] Barcode scan adds product without pressing Enter — green flash on success
- [ ] Mixed payment (cash + card) completes and saves with correct split
- [ ] All existing tests pass, no regressions in POS flow
