# Tasks: Admin Combos — Bundle Discount Auto-Detection

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450-500 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Phase 1: DB Layer

- [x] 1.1 Add `combos` CREATE TABLE (id, name, combo_price, store_id, created_at, updated_at, sync_status) to `ensureTables()` in `src/lib/db.ts`
- [x] 1.2 Add `combo_items` CREATE TABLE (id, combo_id, product_id, quantity, store_id, created_at, updated_at, sync_status) to `ensureTables()` in `src/lib/db.ts`
- [x] 1.3 Add indexes (`idx_combos_store`, `idx_combo_items_combo`, `idx_combo_items_product`) in `src/lib/db.ts`
- [x] 1.4 Add migration `ALTER TABLE sale_items ADD COLUMN combo_id INTEGER` in migrations block of `src/lib/db.ts`

## Phase 2: Store + Logic

- [x] 2.1 Create `src/store/combos.ts` — `Combo`/`ComboItem` types, `useCombosStore` with `addCombo()`, `updateCombo()`, `deleteCombo()`, `loadCombos()`, following products.ts CRUD + `execute()`/`enqueueSync()` pattern
- [x] 2.2 Create `src/lib/combos.ts` — `detectActiveCombos(cart, combos, products) → ComboMatch[]` (exact match by product_id + quantity, picks lowest combo_price), `calculateComboSavings()` helper
- [x] 2.3 Modify `src/lib/init-stores.ts` — Add `initCombos()` loading combos + combo_items with nested mapping, call from `initAllStores()`

## Phase 3: POS Integration

- [x] 3.1 Modify `src/store/index.ts` — `cartTotal()` calls `detectActiveCombos()`, applies combo savings after per-item discounts and before global discount; `checkout()` writes `combo_id` to each `sale_items` row when combo discount applied
- [x] 3.2 Modify `src/components/CheckoutModal.tsx` — Show applied combo name and savings amount in the discount/price breakdown section below the global discount row

## Phase 4: Admin UI

- [x] 4.1 Modify `src/pages/AdminPage.tsx` — Add `"combos"` to `SectionId` type, `SECTIONS` entry with `CombosIcon`, `ACCENTS` color, and render condition for `CombosSection`
- [x] 4.2 Create `CombosSection` inline component in `src/pages/AdminPage.tsx` — combo list with name/product-count/combo-price, create/edit form with product multi-select (from useProductsStore), combo price input, and delete with confirmation

## Phase 5: Tests

- [x] 5.1 Write unit tests for `detectActiveCombos()` — exact match, partial match, quantity mismatch, multiple independent combos, empty cart, no active combos
- [x] 5.2 Write unit tests for `cartTotal()` with combo discount — verify total = subtotal - per-item discounts - combo savings - global discount
- [x] 5.3 Write integration tests for combo CRUD + POS auto-detection flow — create combo, add match items to cart, verify discount, remove item, verify discount removed
