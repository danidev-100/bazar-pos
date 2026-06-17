# Proposal: User Permissions

## Intent

Replace the binary admin PIN gate with a multi-user permission system. The current `isUnlocked` boolean cannot support granular access control. Multiple cashiers need individual accounts with scoped permissions for POS pages.

## Scope

### In Scope
- User accounts CRUD (name, password, active status) in admin settings
- Page-level permissions: ventas, clientes, estadisticas, configuracion
- `usePermission(page)` hook replacing `isUnlocked`
- Permission-aware guards on routes + navigation bar
- First-user bootstrap (default admin on first run)
- Migration: existing PIN hash → auto-create initial admin account

### Out of Scope
- Multi-device user sync (requires DB-backed auth — future)
- Role hierarchies (flat permissions only — no admin/manager/cashier roles)
- Password recovery (physical device reset only)
- Tauri backend changes or Drizzle schema updates

## Capabilities

### New Capabilities
- `user-management`: CRUD users with password hashing (Web Crypto SHA-256) and active/inactive toggle
- `permissions`: Granular page-level permission model + `usePermission()` hook

### Modified Capabilities
- `admin-auth`: Binary PIN → multi-user with permission checks (behavioral change; no existing spec — delta defines the new behavior)
- `dashboard-layout`: Card #8 (Usuarios) navigates to user management, not generic admin. Delta spec needed.

## Approach

Zustand + localStorage (matches customers pattern). Web Crypto SHA-256 for passwords. Replace `isUnlocked` with `usePermission(page)` hook + `<PermissionRoute>` guard. First run bootstraps a default admin account; existing PIN hash auto-creates the initial user.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/store/admin.ts` | Refactored | PIN logic → users + permissions store |
| `src/components/AdminRoute.tsx` | Modified | Binary gate → permission-aware guard |
| `src/components/NavigationBar.tsx` | Modified | Admin lock → user context + conditional nav items |
| `src/pages/AdminPage.tsx` | Extended | Add user management tab |
| `src/App.tsx` | Modified | Per-page permission checks in route definitions |
| `src/pages/StatsPage.tsx` | Modified | Add permission guard |
| `src/pages/CustomersPage.tsx` | Modified | Add permission guard |
| `src/pages/ProductsPage.tsx` | Modified | `isUnlocked` → `usePermission()` for cost columns |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| localStorage password hashes extractable | Med | Same risk as current PIN — acceptable for local POS |
| First-user bootstrap creates orphan state | Med | Auto-create default admin with all permissions on first run |
| Components still reference `isUnlocked` | Low | Grep-audit all `isUnlocked` usages across codebase |
| Pending admin-roles-ui PR 5 (dark theme) | Med | Coordinate merge order; proposal depends on that layout |

## Rollback Plan

1. Revert changes to `src/store/admin.ts` and all permission-related files
2. Restore original `AdminRoute.tsx` and `App.tsx` routing
3. Restore `NavigationBar.tsx` lock icon behavior
4. Keep users data in localStorage (no auto-cleanup — manual clear if rollback needed)
5. PIN gate behavior is fully restored

## Success Criteria

- [ ] Multi-user login: each user sees only their permitted pages
- [ ] `usePermission(page)` returns correct boolean for every page
- [ ] NavigationBar shows/hides items based on current user permissions
- [ ] First run creates default admin account automatically
- [ ] Admin settings include user management (CRUD + permission toggles)
- [ ] All existing tests pass; new tests cover user CRUD and permission checks
