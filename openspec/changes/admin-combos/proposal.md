# Proposal: Admin Combos — Bundle Discount Auto-Detection

## Intent

Allow admins to create product bundles (combos) with a discounted price, and automatically detect when a POS cart fulfills all items of a combo to apply the discount — no manual combo selection, no separate "combo mode".

## Scope

### In Scope
- New `combos` + `combo_items` DB tables with store_id scoping
- Admin "Combos" section: CRUD combo groups, select products, set combo price
- POS auto-detection: during checkout, scan cart against active combos; if all combo products present, apply the combo price as discount
- Cart total recalculates with combined per-item + global + combo discounts
- Combo items must be added individually — the discount appears automatically when the set is complete

### Out of Scope
- Combo-only checkout mode or combo-as-a-line-item
- Barcode scanning for combos
- Combo stock tracking (combos are virtual groupings, not inventory items)
- Time-limited or event-based promo combos

## Capabilities

### New Capabilities
- `combo-management`: CRUD for combo groups, product selection per combo, combo pricing, store-scoped

### Modified Capabilities
- `pos-sales`: auto-detect combo fulfillment during checkout and apply discount; update `sale_items` to track applied combo_id

## Approach

1. **DB layer**: Add `combos` (id, name, combo_price, store_id, timestamps) and `combo_items` (id, combo_id, product_id, quantity) tables in `ensureTables()`
2. **Zustand store**: New `useCombosStore` with CRUD actions, load from DB in `init-stores.ts`
3. **Admin UI**: Register "combos" in `SectionId`, `SECTIONS`, `ACCENTS` in `AdminPage.tsx`; build `CombosSection` component with a combo list, create/edit form with product multi-select, and combo price input
4. **POS detection**: Add `detectActiveCombos()` function in a new `src/lib/combos.ts` — on every cart change, scan loaded combos, check if all combo_items exist in cart with sufficient quantity, return matched combos
5. **Cart total**: In `cartTotal()`, apply the best combo discount (lowest total) on top of per-item discounts, before global discount
6. **Sale recording**: Store `combo_id` in `sale_items` when a combo discount was applied

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/db.ts` | Modified | Add `combos` + `combo_items` CREATE TABLE + indexes |
| `src/store/combos.ts` | New | Zustand store for combos |
| `src/lib/init-stores.ts` | Modified | Load combos from DB on startup |
| `src/pages/AdminPage.tsx` | Modified | Add "combos" to SectionId, SECTIONS, ACCENTS, render condition |
| `src/components/NavigationBar.tsx` | Unchanged | Combo admin lives inside AdminPage, not as a top-level page |
| `src/store/index.ts` | Modified | `cartTotal()` and `checkout()` combo detection logic |
| `src/components/CheckoutModal.tsx` | Modified | Show applied combo discount info |
| `src/lib/combos.ts` | New | Combo detection + discount calculation logic |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Performance impact on every cart change | Low | Combos list is small (<100); O(n*m) scan is negligible |
| Multiple combos match same cart | Low | Pick the one with lowest total price (biggest saving) |
| Combo items removed after detection | Low | Re-scan on every `addItem`/`removeItem`/`updateQuantity` |

## Rollback Plan

Revert the `combos` and `combo_items` CREATE TABLE statements from `ensureTables()`, delete the store file, revert AdminPage changes, and revert `cartTotal()` / `checkout()` to previous logic. Since combos store only references to existing products, no data is lost — just combo definitions.

## Dependencies

- Products must exist before creating combos (FK `combo_items.product_id` → `products.id`)
- Existing POS checkout flow must remain stable

## Success Criteria

- [ ] Admin can create, edit, delete combos with product selection and combo price
- [ ] Adding all products of a combo to the cart auto-applies the combo discount in the total
- [ ] Removing any combo product from the cart removes the discount
- [ ] Combo discount is additive with per-item and global discounts
- [ ] All existing POS tests continue to pass
