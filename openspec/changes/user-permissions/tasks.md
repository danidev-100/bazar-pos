# Tasks: User Permissions

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Auth + Login → PR 2: User Mgmt + Nav → PR 3: Integration |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Auth foundation + Login + Permission gate | PR 1 (→ main) | Full auth system: login works, routes gated, default admin bootstrap. Base: main. |
| 2 | User management + NavBar + Admin cleanup | PR 2 (→ main) | User CRUD page, user context in nav, PIN removal from admin store. Base: main. |
| 3 | Integration tests + final polish | PR 3 (→ main) | Full flow tests, migration scenarios, remaining `isUnlocked` cleanup. Base: main. |

## Phase 1: Auth Foundation

- [x] 1.1 Create `src/store/auth.ts` — `useAuthStore` with users array, SHA-256 hashing, localStorage persistence, currentUser session, first-run bootstrap (admin with all permissions), PIN migration from `admin_pin_hash`, login/logout, user CRUD, `hasPermission()`
- [x] 1.2 Add `"login"` and `"user-management"` to the `Page` union in `src/store/index.ts`
- [x] 1.3 Create `src/hooks/usePermission.ts` — maps a `Page` to the required `Permission` via `PAGE_PERMISSIONS` map, calls `useAuthStore().hasPermission()`

## Phase 2: Login & Auth Flow

- [x] 2.1 Create `src/pages/LoginPage.tsx` — full-screen login form with name input, password input, error display; renders without NavBar when `currentUser === null`
- [x] 2.2 Modify `src/App.tsx` — add `LoginPage` to `PAGE_COMPONENTS`; add permission gate that redirects to dashboard when user lacks page permission; render `LoginPage` without NavBar when unauthenticated
- [x] 2.3 Modify `src/components/AdminRoute.tsx` — replace PIN gate with `hasPermission("configuracion")` check; redirect to `/dashboard` if denied

## Phase 3: User Management

- [x] 3.1 Create `src/pages/UserManagementPage.tsx` — user table + add/edit modal with name, password, permission checkboxes, active toggle, delete button; admin user protected from deletion/deactivation
- [x] 3.2 Modify `src/pages/AdminPage.tsx` — remove PIN change form from settings tab; add "Gestionar Usuarios" link navigating to `user-management` page
- [x] 3.3 Modify `src/components/NavigationBar.tsx` — show current user name + logout button; filter nav items by `usePermission()`; replace `isUnlocked`-based admin icon with permission-aware icon

## Phase 4: Migration & Cleanup

- [ ] 4.1 Modify `src/store/admin.ts` — remove `isUnlocked`, `pinHash`, `setPin`, `unlock`, `lock`, `changePin`, `hashPin` helper, and localStorage PIN helpers; keep theme + bulk pricing logic intact
- [ ] 4.2 Grep codebase for remaining `isUnlocked` references; replace with `hasPermission("configuracion")` or `currentUser !== null` as appropriate

## Phase 5: Tests

- [x] 5.1 Auth store tests: login success/fail, logout clears session, first-run bootstraps admin with all permissions, old PIN migration, `hasPermission()` checks, user CRUD validation
- [x] 5.2 LoginPage tests: renders full screen when unauthenticated, form submit calls login, error display on wrong credentials, redirect on success
- [ ] 5.3 UserManagementPage tests: user table render, add/edit modal CRUD, permission checkbox toggling, admin protection on delete/deactivate
- [x] 5.4 Integration tests: route guard redirects unpermitted pages to dashboard, navigation bar hides items without permission, full login → navigate flow, migration from old PIN to user account
