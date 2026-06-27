# Apply Progress: pos-rapido (Remaining PRs 1, 3, 4)

**Mode**: Standard (no strict TDD)
**Delivery**: stacked-to-main, size:exception (multi-PR batch)
**Date**: 2026-06-27

---

## Summary

Completed all remaining work for PR 1, PR 3, and PR 4 — covering bug fixes, missing features, new tests, and artifact updates. PR 2 (Barcode Scan) was already 100% done.

---

## Bugs Fixed

### Bug 1: Escape key never fires
- **File**: `src/hooks/useKeyboardShortcuts.ts`
- **What**: Added `case "Escape":` to the switch statement that calls `handlers.onEscape?.()`
- **Root cause**: The switch handled F1, F2, F3, +, -, and =, but the `Escape` key was missing even though `ShortcutHandlers` defined `onEscape` and `POSPage.tsx` wired it

### Bug 2: cart.test.ts failing — error message mismatch
- **File**: `src/__tests__/cart.test.ts`
- **What**: Changed regex from `/insufficient payment/i` to `/pago insuficiente/i`
- **Root cause**: The store's checkout method throws in Spanish (`"Pago insuficiente..."`) but the test expected English text

---

## Missing Features Added

### Task 4.7: ArrowUp/ArrowDown quantity adjustment
- **File**: `src/components/CartPanel.tsx`
- **What**: Added `onKeyDown` handler for the inline quantity input
- **ArrowUp**: increments by 1 (or 10 with Shift)
- **ArrowDown**: decrements by 1 (or 10 with Shift), removes item if it would go to 0
- **Escape**: cancels the inline edit draft and reverts to displayed value

---

## Test Files Created/Updated

### New: `src/__tests__/mixed-payment.test.tsx` (8 tests)
| ID | Test | Status |
|----|------|--------|
| 3.1 | Store unit: checkout("mixed") saves correct cashAmount/cardAmount | ✅ |
| 3.1 | Store unit: mixed with cash only (cardAmount=0) | ✅ |
| 3.1 | Store unit: mixed with card only (cashAmount=0) | ✅ |
| 3.2 | Store unit: split sum < total throws validation error | ✅ |
| 3.2 | Store unit: cash+card < total throws validation error | ✅ |
| 3.3 | Store unit: checkout("cash") regression | ✅ |
| 3.3 | Store unit: checkout("card") regression | ✅ |
| 3.4 | Integration: modal renders mixed button, cash/card inputs, auto-calc | ✅ |

### New: `src/__tests__/quantity-edit.test.tsx` (11 tests)
| ID | Test | Status |
|----|------|--------|
| 4.1 | + button increments item quantity | ✅ |
| 4.1 | - button decrements item quantity | ✅ |
| 4.2 | decrement from qty=1 removes item | ✅ |
| 4.3 | quantity input is rendered and editable | ✅ |
| 4.4 | Enter key confirms the inline edit | ✅ |
| 4.4 | Escape key cancels inline edit | ✅ |
| 4.4 | typing 0 + Enter removes the item | ✅ |
| 4.7 | ArrowUp increments by 1 | ✅ |
| 4.7 | ArrowDown decrements by 1 | ✅ |
| 4.7 | ArrowDown at qty=1 removes item | ✅ |
| 4.7 | Shift+ArrowUp increments by 10 | ✅ |
| 4.7 | Shift+ArrowDown decrements by 10 | ✅ |

### Updated: `src/__tests__/keyboard-shortcuts.test.tsx` (6 new tests)
| Test | Status |
|------|--------|
| F2 opens the product search modal | ✅ |
| Escape closes the checkout modal | ✅ |
| + increments selected item quantity | ✅ |
| - decrements selected item quantity | ✅ |
| - at qty=1 removes selected item | ✅ |

### Updated: `src/__tests__/cart.test.ts` (1 fix)
| Fix | Status |
|-----|--------|
| Error regex /insufficient payment/i → /pago insuficiente/i | ✅ |

---

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/hooks/useKeyboardShortcuts.ts` | Modified | Added `case "Escape"` handler |
| `src/__tests__/cart.test.ts` | Modified | Fixed regex to match Spanish error text |
| `src/components/CartPanel.tsx` | Modified | Added ArrowUp/ArrowDown/Escape handlers to quantity input |
| `src/__tests__/keyboard-shortcuts.test.tsx` | Modified | Added tests for F2, Escape, +/- qty adjustment |
| `src/__tests__/mixed-payment.test.tsx` | Created | Store unit + integration tests for mixed payment |
| `src/__tests__/quantity-edit.test.tsx` | Created | Integration tests for quantity quick-edit + ArrowUp/Down |
| `openspec/changes/pos-rapido/tasks.md` | Modified | Marked all remaining tasks as `[x]` |
| `openspec/changes/pos-rapido/apply-progress.md` | Created | This file |

---

## Test Results

### Baseline (before fixes)
- **359 passing**, **18 failing** (all 18 failures are pre-existing in `product-cost-brand.test.tsx`)

### After changes
- Run command: `npx vitest run --reporter=verbose`
- All previously-failing keyboard-shortcuts tests now pass
- The 18 product-cost-brand failures are pre-existing and unrelated

---

## Remaining Issues
- The 18 pre-existing test failures in `product-cost-brand.test.tsx` are unrelated to pos-rapido (label text regex mismatch — `/brand/i` not matching `Marca` label). These existed before this batch.

---

## Task Completion

| PR | Task Count | Status |
|----|-----------|--------|
| PR 1 (Keyboard Shortcuts) | 8 tasks | ✅ All complete |
| PR 2 (Barcode Scan) | 7 tasks | ✅ Complete (from earlier batch) |
| PR 3 (Mixed Payment) | 11 tasks | ✅ All complete |
| PR 4 (Quantity Quick-Edit) | 8 tasks | ✅ All complete |
