# Archive Report: dashboard-modules

**Archived**: 2026-06-17
**Verification**: PASS WITH WARNINGS — 256/256 tests pass, tsc clean. Known spec mismatch corrected during archive.

## Intent

Dashboard landing page with 8-card responsive navigation grid replacing POS as the default launch page.

## Archive Contents

| Artifact | Status |
|----------|--------|
| proposal.md | ✅ |
| specs/dashboard-layout/spec.md | ✅ (corrected at archive time) |
| specs/suppliers/spec.md | ✅ (placeholder — not promoted to main) |
| specs/orders/spec.md | ✅ (placeholder — not promoted to main) |
| design.md | ✅ |
| tasks.md | ✅ (8/8 tasks complete) |
| apply-progress.md | ✅ |

## Spec Corrections Applied at Archive Time

The delta spec at `specs/dashboard-layout/spec.md` contained wrong page targets and card labels that did not match the implementation. Corrected per the DESIGN:

| In Spec (WRONG) | Corrected TO |
|-----------------|--------------|
| "products-stock" target | "products" |
| "sales-statistics" target | "stats" |
| "internal-billing" target | (removed — not a card) |
| "cash-closing" card | Clientes card |
| "Facturación Interna" card | Configuración card |
| "POS" label | "Ventas" |
| "Productos" label | "Inventario" |
| Card #3 Estadísticas → "sales-statistics" | Card #6 Estadísticas → "stats" |
| Card #4 Cierre de Caja → "cash-closing" | Card #3 Clientes → "customers" |
| Card #5 Facturación Interna → "internal-billing" | Card #7 Configuración → "admin" |

All scenario tables in R3 and R4 updated to match corrected card numbers and targets.

## Specs Synced to Main

| Domain | Action | Details |
|--------|--------|---------|
| dashboard-layout | Created | Copied corrected delta spec to `openspec/specs/dashboard-layout/spec.md` |

## SDD Cycle Status

- [x] Propose: Complete
- [x] Spec: Complete (corrected at archive)
- [x] Design: Complete
- [x] Tasks: Complete (8/8)
- [x] Apply: Complete (PR 1 + PR 2)
- [x] Verify: Complete (256 tests, tsc clean)
- [x] Archive: Complete

The `suppliers` and `orders` placeholder specs remain as stubs in the archive. They will receive proper specs when those modules are implemented in future SDD cycles.

## Source of Truth

The following main spec now reflects the new behavior:
- `openspec/specs/dashboard-layout/spec.md`
