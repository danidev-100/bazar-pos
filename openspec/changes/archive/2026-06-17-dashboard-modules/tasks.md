# Tasks: Dashboard Modules

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150–185 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Page + Store → PR 2: Wiring + Tests |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation + DashboardPage source | PR 1 | Store type, default, new page component. Branch: feature/dashboard-modules |
| 2 | Integration + tests | PR 2 | Wire into App.tsx + NavBar, add tests. Depends on PR 1 |

## Phase 1: Foundation

- [x] 1.1 Add `| "dashboard"` to `Page` union in `src/store/index.ts`; change default `page: "pos"` → `"dashboard"` (line 129)

## Phase 2: Dashboard Page

- [x] 2.1 Create `src/pages/DashboardPage.tsx` with `ModuleConfig` type, `MODULES` array (8 entries), inline SVG icon components, and `ModuleCard` sub-component
- [x] 2.2 Implement responsive grid layout (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4`) rendering `ModuleCard` for each `MODULES` entry

## Phase 3: Integration

- [x] 3.1 Import `DashboardPage` in `src/App.tsx`; add `dashboard: DashboardPage` to `PAGE_COMPONENTS`
- [x] 3.2 Add `{ id: "dashboard", label: "Inicio", icon: <svg> }` as first entry in `NavigationBar`'s `PAGES` array in `src/components/NavigationBar.tsx`

## Phase 4: Tests

- [x] 4.1 Write test: default page is `"dashboard"` (`expect(useAppStore.getState().page).toBe("dashboard")`)
- [x] 4.2 Write test: `DashboardPage` renders 8 cards (`screen.getAllByRole("button")` → length 8)
- [x] 4.3 Write test: active cards call `setPage(target)` on click with `vi.spyOn`
- [x] 4.4 Write test: disabled cards do NOT call `setPage` and show "Próximamente" badge
- [x] 4.5 Verify: `pnpm test` passes, `tsc --noEmit` succeeds
