# Design: User Permissions

## Technical Approach

Replace the binary PIN system with a Zustand + localStorage multi-user auth store. New `useAuthStore` manages users, sessions, and permission checks. Login page replaces the PIN gate. Page-level permissions filter the NavBar and App routing. Matches existing patterns (separate store per domain, localStorage persistence, Web Crypto SHA-256).

## Architecture Decisions

| Option | Alternative | Decision | Rationale |
|--------|-------------|----------|-----------|
| **New `useAuthStore`** | Extend `useAdminStore` | New store | Auth is a separate concern from admin theme/bulk pricing. Matches `useCustomersStore` pattern (separate store per domain). Keeps `admin.ts` focused on its remaining concerns. |
| **Persist session in localStorage** | In-memory only | `currentUserId` in LS | Spec requires session survival across refresh (AA-LOGIN). Users array always persisted. Session restored by looking up `currentUserId` on init. |
| **LoginPage (full page)** | Modal / Overlay | Full page gate | Spec: unauthenticated → redirect to `/login`. Cleaner auth boundary — App renders `LoginPage` when `currentUser === null`, no content leaks. |
| **`usePermission(page)` hook** | HOC / Wrapper component | Hook | Matches existing React hooks pattern. App.tsx uses it for route guards. `<PermissionGate>` wrapper optional but not needed — one check point in App. |
| **First-run in store init** | App.tsx `useEffect` | Store init | `loadUsers()` handles first-run + PIN migration synchronously during store creation. Zero-config — store is self-bootstrapping. |
| **`"login"` + `"user-management"` in Page enum** | No new pages | Add both | `"login"` for auth gate, `"user-management"` for dashboard card #8 per dashboard-layout spec. |
| **Standalone UserManagementPage** | Admin tab only | Standalone page | Spec says card #8 → `setPage("user-management")`. Admin settings still gets a link to it. |

## Data Flow

```
App loads
  → useAuthStore.init()
    → loadUsers() from localStorage
      → if empty → check old admin_pin_hash → create default admin (all permissions)
    → loadCurrentUser() from currentUserId in localStorage
      → if user not found / deactivated → set currentUser = null

App renders
  → currentUser === null → LoginPage (no NavBar, full screen)
  → currentUser !== null → NavigationBar + <PageComponent>

NavigationBar
  → reads currentUser.permissions → hide/show nav items

App routing
  → checks PAGE_PERMISSIONS map → currentUser.hasPermission() → render or redirect to dashboard
```

## Permission Model

```ts
export type Permission = "ventas" | "clientes" | "estadisticas" | "configuracion";
```

### Page → Permission mapping

| Page(s) | Required Permission | Notes |
|---------|-------------------|-------|
| `pos`, `billing` | `"ventas"` | Sales and invoicing |
| `customers` | `"clientes"` | Customer management |
| `stats` | `"estadisticas"` | Statistics |
| `admin`, `cash-closing`, `user-management` | `"configuracion"` | Admin functions |
| `dashboard`, `products`, `login` | None | Authenticated only |

## Interfaces

```ts
// ── Permission ──
export type Permission = "ventas" | "clientes" | "estadisticas" | "configuracion";

// ── Auth user ──
export type AuthUser = {
  id: string;            // crypto.randomUUID()
  name: string;          // display/login name
  passwordHash: string;  // SHA-256 hex
  permissions: Permission[];
  active: boolean;       // soft disable
  createdAt: string;     // ISO 8601
};

// ── Login result ──
export type LoginResult = {
  success: boolean;
  error?: string;  // "Credenciales inválidas" | "Usuario desactivado"
};

// ── Store ──
export type AuthStore = {
  users: AuthUser[];
  currentUser: AuthUser | null;

  login: (name: string, password: string) => Promise<LoginResult>;
  logout: () => void;

  addUser: (data: { name: string; password: string; permissions: Permission[]; active: boolean }) => Promise<void>;
  updateUser: (id: string, data: { name?: string; password?: string; permissions?: Permission[]; active?: boolean }) => Promise<void>;
  deleteUser: (id: string) => void;

  hasPermission: (permission: Permission) => boolean;
};
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/store/auth.ts` | Create | `useAuthStore` — users, currentUser, login/logout, CRUD, permission checks, localStorage init |
| `src/store/admin.ts` | Modify | Remove `isUnlocked`, `pinHash`, PIN actions (`setPin`, `unlock`, `lock`, `changePin`). Keep theme + bulk pricing. |
| `src/store/index.ts` | Modify | Add `"login"` and `"user-management"` to `Page` union. Update re-exports. |
| `src/pages/LoginPage.tsx` | Create | Full-screen login: name input, password input, error display, submit handler |
| `src/pages/UserManagementPage.tsx` | Create | User table + add/edit modal: name, password, permission checkboxes, active toggle, delete |
| `src/hooks/usePermission.ts` | Create | `usePermission(page: Page): boolean` — maps page to required permission, checks store |
| `src/components/AdminRoute.tsx` | Modify | Replace PIN gate with permission check (`currentUser.hasPermission("configuracion")`). Redirect to dashboard if denied. |
| `src/components/NavigationBar.tsx` | Modify | Show current user name + logout. Filter nav items by `currentUser.permissions`. |
| `src/App.tsx` | Modify | Add `"login"` and `"user-management"` to `PAGE_COMPONENTS`. Permission gate on page render (redirect to dashboard). Login page renders without NavBar. |
| `src/pages/AdminPage.tsx` | Modify | Remove PIN change form. Keep theme toggle + lock/logout. Add "Gestionar Usuarios" link. |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Auth store: login success/fail, logout, user CRUD, permission checks, first-run bootstrap, PIN migration | Pure store with `mockLocalStorage` helper |
| Unit | `usePermission(page)` | Mount with mocked `useAuthStore` |
| Integration | Login flow: LoginPage → submit → App renders target page | Component + store |
| Integration | Route guard: navigate to page without permission → redirect to dashboard | App + store |
| Integration | User CRUD: add/edit/delete users updates store and localStorage | UserManagementPage + store |
| Migration | Old `admin_pin_hash` present → auto-creates admin user with all permissions | Init store with fake LS state |

## Migration Plan

1. **No data loss**: Old `admin_pin_hash` in localStorage is preserved but ignored by the new auth system.
2. **First run bootstrap**: If `users[]` is empty on app init, auto-create user "admin" with password "admin" and all permissions. This covers both fresh installs and PIN-system upgrades.
3. **`isUnlocked` cleanup**: Global grep for `isUnlocked`. Replace with `currentUser !== null` (for login state) or `hasPermission(...)` (for permission gating).
4. **`pinHash` removal**: Remove from `AdminStore` type, delete `loadPinHash`/`savePinHash` helpers, remove localStorage key reads.
5. **PIN actions removed**: `setPin`, `unlock`, `lock`, `changePin` deleted from `admin.ts`.

## Open Questions

- [ ] Confirm: should `UserManagementPage` replace the admin settings "Usuarios" tab, or supplement it? (Design follows dashboard spec — standalone page.)
- [ ] Products cost column: currently gated by `isUnlocked`. Should it require "configuracion" permission, or remain accessible to all authenticated users?
- [ ] Dashboard card #8: should it be hidden from users without "configuracion", or shown and redirect on click?
