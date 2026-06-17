## Exploration: Stock Deduction During Sales

### Current State

**STOCK IS NEVER DEDUCTED DURING SALES.** This is the single most important finding.

The `checkout()` function in `src/store/index.ts` (lines 218-255) records a sale in memory but **never calls `recordMovement()`** to deduct stock. The product stock quantity stays frozen at its initial value forever.

The spec at `openspec/specs/products-stock/spec.md` explicitly states: *"A POS sale deducts 3 units"* — but this was never wired up.

### Affected Areas

- `src/store/index.ts` — `checkout()` function (lines 218-255): no stock deduction, no stock validation
- `src/components/CheckoutModal.tsx` — calls `checkout()` then `onComplete()`, no stock operations
- `src/store/products.ts` — `recordMovement()` (lines 245-267): exists, works perfectly, but is NEVER called from the sales flow
- `src/pages/POSPage.tsx` — orchestrates POS flow (add to cart → checkout → receipt), no stock awareness
- `src/components/ProductGrid.tsx` — shows `stock` badges ("Solo quedan X") but stock is never updated
- `openspec/specs/products-stock/spec.md` — spec says sale deduction should happen but implementation is missing
- `openspec/specs/pos-sales/spec.md` — checkout spec doesn't mention stock deduction

### Sale Flow Step by Step

```
1. POSPage renders ProductGrid + CartPanel
2. User taps product          →  addItem(id, name, price)     [app store]
3. User adjusts quantity      →  updateQuantity(productId, qty) [app store]
4. User taps "Cobrar"        →  CheckoutModal opens
5. User selects payment       →  handles cash amount or card
6. User taps "Confirmar"     →  checkout(paymentMethod, amount, storeId, customerName)
                                       │
                                       ▼
                               checkout() in store/index.ts:
                                 │
                                 ├── Calculates total, change
                                 ├── Validates payment >= total
                                 ├── Creates CompletedSale record
                                 ├── Clears cart (items = [])
                                 ├── Pushes to completedSales[]
                                 └── ✗ NEVER deducts stock ✗
                                       │
                                       ▼
7. ReceiptPreview shown       →  lastCompletedSale displayed
8. Optional: generate invoice →  useInvoicesStore.generateInvoice(sale)
```

### Approaches

1. **Wire stock deduction into `checkout()`** — The fix
   - Pros: Single change point, guarantees deduction always happens
   - Cons: Tightens coupling between app store and products store
   - Effort: Low — add ~10 lines in `checkout()` to iterate items and call `recordMovement()` for each

2. **Move stock deduction to the CheckoutModal (`handleConfirm`)** — Decoupled approach
   - Pros: Keeps stores independent
   - Cons: Easy to forget — every checkout pathway must manually deduct
   - Effort: Low-Medium

3. **Build a full stock reservation system** — Hold stock when added to cart, confirm on payment
   - Pros: Real-world accuracy, prevents overselling
   - Cons: Massive scope increase, cart complexity, UX issues (what happens on abandonment?)
   - Effort: High

### Recommendation

**Approach 1** — wire stock deduction directly into the `checkout()` function. It's the minimal, correct fix:

```typescript
// Inside checkout(), after creating the sale record, add:
const productsStore = useProductsStore.getState();
for (const item of items) {
  productsStore.recordMovement({
    product_id: item.productId,
    type: "sale",
    quantity: item.quantity,
    delta: -item.quantity,
    reference_id: `sale_${sale.id}`,
    user_id: null,
    store_id: storeId ?? "store_1",
  });
}
```

This is a 10-line change that matches the existing pattern (the tests already test this exact scenario). The `recordMovement()` function both creates a `stock_movements` entry AND updates `product.stock` in one call.

### Risks

- **No stock validation**: The current spec allows negative stock ("track shortage" — R3 in products-stock spec). The fix should NOT block sales due to insufficient stock, per existing requirements. Only add validation if explicitly requested.
- **Race conditions**: In-memory Zustand store means concurrent sales from different POS instances don't see each other's stock until sync. Acceptable in offline-first design.
- **Missing `sale_items` persistence**: The `sale_items` DB table exists in the schema but is never written to. Only the in-memory `CompletedSale` record exists. If the user refreshes, sales are lost.
- **All data is in-memory**: Zustand stores are not persisted to SQLite yet. Reloading the page loses everything.

### Ready for Proposal

**Yes.** The finding is clear: stock deduction is missing. The fix is small, well-understood, and has existing test coverage to validate against. Ready to create a proposal for this change.
