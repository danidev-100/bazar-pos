# Design: Admin Combos — Bundle Discount Auto-Detection

## Technical Approach

Two new DB tables (`combos`, `combo_items`) created in `ensureTables()`, following the exact timestamp+sync_status pattern of every existing table. A new Zustand store (`src/store/combos.ts`) mirrors the products.ts CRUD pattern — add/update/delete combos in-memory then persist via `execute()` + `enqueueSync()`, with `combo_items` stored as a nested array inside each combo object. A new pure-function module (`src/lib/combos.ts`) exposes `detectActiveCombos(cart, combos) → ComboMatch[]`, called from `cartTotal()` every time the cart changes. The lowest-priced combo match wins. In `checkout()`, applied combo IDs propagate into `sale_items.combo_id` (new nullable column). The admin "Combos" section registers into `AdminPage.tsx` following the exact SectionId + SECTIONS + ACCENTS + render-switch pattern.

## Architecture Decisions

### Decision: Separate Zustand store vs. inline in AppStore
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline in AppStore | `cartTotal()` has direct access; violates single-responsibility; store file grows unbounded | Rejected |
| `useCombosStore` | Follows project convention (products, brands, customers, etc.); 1:1 with DB entity; CRUD isolated | **Chosen** |

### Decision: Detection in `cartTotal()` vs. `checkout()`
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Only in `checkout()` | No visual feedback until confirm; user sees full price then discount | Rejected |
| `cartTotal()` | Reactively shows/hides discount as cart changes; immediate UX | **Chosen** |

`detectActiveCombos()` is a pure function — no store coupling. `cartTotal()` calls it, passes result down through a returned `{ total, comboSavings }` tuple (breaking change to `cartTotal()` signature, but callers only read the total number, so the shape remains compatible with a narrow refactor).

### Decision: Lowest price when multiple combos match
When `detectActiveCombos()` finds multiple combos the cart fulfills, it picks the one with the **lowest `combo_price`** — i.e., maximum saving. This is the least surprising behavior for a discount system.

### Decision: `combo_items` stores `product_id + quantity`
A combo may require multiples of the same product (e.g., "6 empanadas"). Without `quantity`, only existence can be checked, not sufficiency.

### Decision: `sale_items.combo_id` as nullable column
Allows tracking which items were part of a combo discount. NULL means normal sale item. DB migration via `ALTER TABLE sale_items ADD COLUMN combo_id INTEGER` in the migrations block of `ensureTables()`.

## Data Flow

```
Admin creates/edits combo
  → useCombosStore.addCombo()
    → in-memory update (UI renders)
    → execute() INSERT + enqueueSync() (persistence)

POS cart changes (addItem/removeItem/updateQuantity)
  → cartTotal() called (every render)
    → detectActiveCombos(items, useCombosStore combos)
      → O(n*m) scan: for each combo, check all items + qty present in cart
      → returns ComboMatch[] (or empty)
    → if match found: total = subtotal - perItemDiscounts - comboSavings - globalDiscount
    → if no match: total unchanged from current logic

checkout()
  → calls cartTotal() (which already includes combo discount)
  → persists sale_items with combo_id column set
  → stock movements unaffected (combos are virtual)
```

```
  useCombosStore ──→ AdminPage (CombosSection)
       │
       ▼
  cartTotal() ←── detectActiveCombos()
       │
       ▼
  CheckoutModal ←── checkout() ←── sale_items.combo_id
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/store/combos.ts` | Create | Zustand store: `Combo` type (`{id, name, comboPrice, storeId, items: ComboItem[]}`), CRUD methods, SQLite persistence |
| `src/lib/combos.ts` | Create | `detectActiveCombos(cart, combos, products)` pure function, `ComboMatch` type |
| `src/lib/db.ts` | Modify | Add `combos` + `combo_items` CREATE TABLE + indexes, add `ALTER TABLE sale_items ADD COLUMN combo_id INTEGER` migration |
| `src/lib/init-stores.ts` | Modify | Add `initCombos()` and call from `initAllStores()` |
| `src/pages/AdminPage.tsx` | Modify | Extend `SectionId` with `"combos"`, add SECTIONS entry with CombosIcon, add ACCENTS color, add `CombosSection` component and render condition |
| `src/store/index.ts` | Modify | `cartTotal()` calls `detectActiveCombos()` and includes combo savings; `checkout()` writes `combo_id` to `sale_items` |
| `src/components/CheckoutModal.tsx` | Modify | Display applied combo name and savings amount in the discount section |

## Interfaces / Contracts

```typescript
// src/lib/combos.ts
export type ComboItem = {
  productId: number;
  quantity: number;
};

export type ComboMatch = {
  comboId: number;
  comboName: string;
  comboPrice: number;
  regularTotal: number;    // sum of individual product prices
  savings: number;         // regularTotal - comboPrice
};

export function detectActiveCombos(
  cart: CartItem[],
  combos: Combo[],
  products: Product[],
): ComboMatch[];

// src/store/combos.ts
export type Combo = {
  id: number;
  name: string;
  comboPrice: number;
  items: ComboItem[];
  storeId: string;
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `detectActiveCombos()` — exact match, partial match, quantity mismatch, multiple combos, no combos | Pure function, no mocks needed |
| Unit | `cartTotal()` with active combo discount — verify total = item sum - per-item discount - combo savings - global discount | Isolate store state, inject mock combos |
| Integration | Combo CRUD: create combo → verify DB row + store state; edit combo name/items → verify update; delete combo → verify removal | Full DB + store round-trip |
| Integration | POS flow: create combo → add matching items to cart → verify total reflects discount → remove one item → verify discount removed | End-to-end store interaction |
## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary changes.

## Migration / Rollout

No data migration required — `combos` table starts empty. The `sale_items.combo_id` column is nullable, so existing rows remain valid. No feature flag needed.

## Open Questions

- None.
