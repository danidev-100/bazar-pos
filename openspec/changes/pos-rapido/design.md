# Design: POS Rápido — Keyboard, Barcode, Mixed Payment

## Technical Approach

Five independent features layered on the existing React + Zustand architecture. Two new custom hooks (`useKeyboardShortcuts`, `useBarcodeScan`), store type extensions (`CompletedSale`), and component modifications (CartPanel, CheckoutModal). Search R4 is **already implemented** — barcode filtering and display exist in `ProductGrid`. No new dependencies.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| Keyboard handler location | (a) POSPage `useEffect` inline; (b) custom hook; (c) per-component | (b) is testable, decoupled, and reusable | **Custom hook** `useKeyboardShortcuts` in `src/hooks/` |
| Input-conflict prevention | (a) check `event.target.tagName`; (b) `event.target.closest()`; (c) ignore | (a) simplest and sufficient — inputs/textarea are the only conflict source | **Check `(el.tagName === 'INPUT' \|\| el.tagName === 'TEXTAREA')`** |
| `selectedCartItemId` location | (a) Zustand store; (b) local state in CartPanel | (b) keeps store lean; keyboard hook needs store access | **Local state in CartPanel**, exposed via a `ref` or store callback |
| Barcode buffer mechanism | (a) hidden input with onChange; (b) `keydown` accumulator ref | (b) avoids focus management issues with the hidden input, works when any element is focused | **`keydown` accumulator + debounce** in custom hook |
| Green flash feedback | (a) CSS animation class; (b) inline style toggle | (a) reusable, no JS timers for animation | **CSS keyframe animation** toggled via state |
| Mixed payment as new method | (a) third button "Mixto"; (b) toggle after cash selection | (a) clearer UX, visible upfront | **Third button** alongside "Efectivo" and "Tarjeta" |
| Checkout `paymentMethod` type | (a) union `"cash" \| "card" \| "mixed"`; (b) separate field | (a) additive change, existing types work unchanged | **Extend union** — no existing code breaks |
| Quantity inline edit state | (a) local `editingProductId` in CartPanel; (b) store field | (a) UI-only concern, doesn't need persistence | **Local `useState`** per CartPanel instance |

## Data Flow

```
POSPage
 ├── useKeyboardShortcuts()       ← global keydown listener
 │    ├── F1 → setShowCheckout(true) [if cart not empty]
 │    ├── F2 → searchInputRef.current.focus()
 │    ├── F3 → confirm() → clearCart()
 │    ├── +/- → updateQuantity(selectedCartItemId, ±1)
 │    └── Escape → setShow*(false)
 │
 ├── useBarcodeScan()             ← keydown accumulator + 250ms debounce
 │    └── onMatch(product) → addItem() + greenFlash
 │    └── onMiss(barcode) → showNotification("no encontrado")
 │
 ├── ProductGrid (modified: barcode already shown)
 ├── CartPanel (modified: click-to-edit qty, selected highlight)
 └── CheckoutModal (modified: mixed payment step)
      └── store.checkout("mixed", { cashAmount, cardAmount }, storeId)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useKeyboardShortcuts.ts` | Create | Global keydown handler, input-gate, modifier guard |
| `src/hooks/useBarcodeScan.ts` | Create | Key accumulator, 250ms debounce, match/miss callbacks |
| `src/pages/POSPage.tsx` | Modify | Wire hooks, add search ref, green flash state, hint toast |
| `src/components/CartPanel.tsx` | Modify | Click-to-edit qty, selected-item highlight, keyboard nav |
| `src/components/CheckoutModal.tsx` | Modify | Mixed payment step (cash/card inputs, auto-calc, validation) |
| `src/store/index.ts` | Modify | `CompletedSale.paymentMethod` → `"mixed"`, `cashAmount`, `cardAmount`; `checkout()` signature |

## Interfaces / Contracts

```typescript
// Store: CompletedSale type extension
type PaymentMethod = "cash" | "card" | "mixed";

type CompletedSale = {
  // ... existing fields ...
  paymentMethod: PaymentMethod;
  /** For "mixed" — cash portion of the payment */
  cashAmount?: number;
  /** For "mixed" — card portion of the payment */
  cardAmount?: number;
};

// checkout() signature change
checkout: (
  paymentMethod: PaymentMethod,
  amount?: number | { cashAmount: number; cardAmount: number },
  storeId?: string,
  customerName?: string,
) => CompletedSale;

// Hooks
function useKeyboardShortcuts(shortcuts: ShortcutMap): void;
function useBarcodeScan(
  onMatch: (product: Product) => void,
  onMiss: (barcode: string) => void,
  options?: { bufferTime?: number }
): { flash: boolean; buffer: string };
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (store) | `checkout("mixed")` saves correct cashAmount/cardAmount | Vitest — verify store state matches inputs |
| Unit (store) | Mixed validation — sum !== total throws | Vitest — existing pattern |
| Unit (store) | `selectedCartItemId` selection and clearing | Vitest |
| Integration | F1 opens checkout, F2 focuses search, F3 clears | RTL — mount POSPage, fire keyboard events |
| Integration | +/- adjusts selected item qty | RTL — add items, select one, press +/– |
| Integration | Barcode scan adds product | RTL — feed chars via keydown, assert cart item added |
| Integration | Click-to-edit qty inline input | RTL — click qty span, type value, assert update |
| Visual | Green flash animation on barcode match | CSS only — animation class toggling |
| Regression | Existing cart.test.ts, checkout flows | All existing tests MUST pass unchanged |

## Implementation Order

1. **Store types** — extend `PaymentMethod`, `CompletedSale`, `checkout()` signature (foundation for mixed payment, no UI yet)
2. **`useKeyboardShortcuts` hook** — standalone, testable independently
3. **Keyboard shortcuts in POSPage** — F1/F2/F3/Escape + hint toast
4. **CartPanel: selected item + keyboard +/-** — add selected state, visual highlight, wire from keyboard hook
5. **CartPanel: click-to-edit qty** — inline input on quantity span
6. **`useBarcodeScan` hook** — standalone, testable
7. **Barcode scan in POSPage** — hidden input autofocus, green flash, error toast
8. **CheckoutModal: mixed payment** — third button, cash/card inputs, auto-calc, validation
9. **Store: mixed checkout wiring** — connect modal to store's extended `checkout()`
10. **Verify R4** — confirm barcode search+display already works, add test coverage

## Open Questions

- [ ] `+`/`-` on keyboard: should it wrap around the cart items list (end → start)? Or no-op at boundaries?
- [ ] F3 new sale confirmation: browser `confirm()` acceptable, or custom modal needed?
- [ ] Barcode buffer: should we flush the buffer when focus leaves POSPage? (Prevents leftover chars from other inputs)
