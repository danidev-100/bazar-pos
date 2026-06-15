# Tasks: POS Rápido

## Pre-Flight Checklist

- [x] Read `design.md` — architecture, data flow, file changes
- [x] Read `spec.md` — R1–R6 requirements and scenarios
- [x] Verify R4 (barcode search/display) — already implemented in ProductGrid ✅
- [x] Run `pnpm test` — baseline confirmed: **213 tests passing** across 9 test files

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~680 (across 4 stacked PRs) |
| 400-line budget risk | Low per PR, Medium overall |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain |
| Review budget per PR | 800 lines |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Keyboard Shortcuts Hook | PR 1 | Base: `main`; `useKeyboardShortcuts`, store types, POSPage wiring, hint toast |
| 2 | Barcode Scan Hook | PR 2 | Base: `main`; `useBarcodeScan`, green flash CSS, POSPage wiring |
| 3 | Mixed Payment | PR 3 | Base: `main`; CheckoutModal mixed UI, store `"mixed"` type, validation |
| 4 | Quantity Quick-Edit | PR 4 | Base: `main`; CartPanel inline edit, +/- buttons, selected highlight |

---

## Remaining Admin Roles Tasks (context — finish before or after pos-rapido)

- [ ] 1.2 Generate Drizzle migration from schema (`admin-roles-ui` PR 1)
- [ ] 1.7 Component tests: BrandList empty state, BrandForm submit validation
- [ ] 5.1–5.7 Dark theme & number styling (`admin-roles-ui` PR 5)

---

## PR 1: Keyboard Shortcuts Hook

**TDD: write test → implement → verify. All tests live with the code.**

- [ ] 1.1 Extend `PaymentMethod` union to `"cash" | "card" | "mixed"` in `src/store/index.ts`
- [ ] 1.2 Add `selectedCartItemId` to AppStore (`string | null`), `selectCartItem(id)` / `clearSelectedCartItem()` actions
- [ ] 1.3 Write unit tests: store `selectedCartItemId` selection/clearing
- [ ] 1.4 Write integration tests (RTL): F1 opens checkout, F2 focuses search, F3 clears cart, Escape closes
- [ ] 1.5 Write integration tests: +/- adjusts selected item quantity
- [ ] 1.6 Write integration tests: input-gate (shortcuts do not fire when typing in an INPUT/TEXTAREA)
- [ ] 1.7 Create `src/hooks/useKeyboardShortcuts.ts` — keydown handler, input-gate, shortcut map
- [ ] 1.8 Modify `src/pages/POSPage.tsx` — wire `useKeyboardShortcuts`, add searchInputRef, hint toast on first mount
- [ ] 1.9 Verify: all 213 baseline tests still pass + new tests

## PR 2: Barcode Scan Hook

- [x] 2.1 Write integration tests (RTL): barcode chars accumulate → debounce → match → addItem
- [x] 2.2 Write integration tests: barcode not found → error toast
- [x] 2.3 Write integration tests: debounce does not fire during active chars
- [x] 2.4 Create `src/hooks/useBarcodeScan.ts` — keydown accumulator, 250ms debounce, match/miss callbacks
- [x] 2.5 Add `.scan-flash` CSS keyframe animation (`src/styles.css`)
- [x] 2.6 Modify `src/pages/POSPage.tsx` — wire `useBarcodeScan`, green flash state, error toast
- [x] 2.7 Verify: all baseline tests + barcode tests pass (236 total, 225 baseline + 11 new)

## PR 3: Mixed Payment

- [ ] 3.1 Write store unit tests: `checkout("mixed")` saves correct cashAmount/cardAmount
- [ ] 3.2 Write store unit tests: split sum !== total throws validation error
- [ ] 3.3 Write store unit tests: `checkout("cash")` and `checkout("card")` unchanged (regression)
- [ ] 3.4 Write integration tests: modal renders mixed button, cash/card inputs, auto-calc
- [ ] 3.5 Update `src/store/index.ts` — `checkout()` signature accepts `PaymentMethod`, `cashAmount`, `cardAmount`
- [ ] 3.6 Update `CompletedSale` type — `paymentMethod: PaymentMethod`, optional `cashAmount`/`cardAmount`
- [ ] 3.7 Modify `src/components/CheckoutModal.tsx` — add "Mixto" payment button, cash/card input fields
- [ ] 3.8 Implement auto-calc: entering cash auto-fills card = total - cash (vice versa)
- [ ] 3.9 Implement validation: split sum must equal total, show error otherwise
- [ ] 3.10 Wire mixed data through to `store.checkout()`
- [ ] 3.11 Verify: all baseline tests + mixed payment tests pass

## PR 4: Quantity Quick-Edit

- [ ] 4.1 Write integration tests: + button increments qty, - decrements
- [ ] 4.2 Write integration tests: - at qty=1 removes item
- [ ] 4.3 Write integration tests: click quantity → inline edit input appears
- [ ] 4.4 Write integration tests: inline edit enter confirms, Escape cancels, 0 removes
- [ ] 4.5 Modify `src/components/CartPanel.tsx` — add `+`/`-` buttons per cart item
- [ ] 4.6 Add click-to-edit: clicking quantity span shows inline input with current value selected
- [ ] 4.7 Add keyboard nav: arrow up/down adjust quantity when editing
- [ ] 4.8 Verify: all baseline tests + quantity edit tests pass
