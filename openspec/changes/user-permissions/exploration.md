## Exploration: User Management with Role-Based Permissions

### Current State

**Auth today is a single binary gate:**
- A single numeric PIN (SHA-256 hashed, stored in `localStorage`) controls admin access
- `useAdminStore.isUnlocked` is a boolean — unlocked or not
- `AdminRoute` wraps only the AdminPage; admin-only UI (cost columns, brand fields) uses `isUnlocked` checks in `ProductsPage`
- **No concept of individual users**, roles, or granular permissions
- Session state (`isUnlocked`) is in-memory only — clears on page reload
- PIN hash persists across sessions (`localStorage` key `admin_pin_hash`)

**Relevant existing effort:** The `admin-roles-ui` change (already implemented and verified) was explicitly scoped **out**: *"Multi-user roles (admin/not-admin only)"* — meaning this is the natural next step.

**Data persistence patterns used in codebase:**
| Pattern | Used By | Persistence |
|---------|---------|-------------|
| In-memory Zustand only | products, brands | Ephemeral (cleared on reload) |
| Zustand + localStorage | admin PIN + theme, customers | `localStorage` read on init, written on mutation |
| Drizzle schema (SQLite) | DB schema at `db/schema.ts` | Used by Tauri sync engine (Rust); frontend does NOT query DB directly |

**Pages that require some form of auth today:**
| Page | Current Guard | Permission Needed |
|------|--------------|-------------------|
| Admin (brands, bulk price, settings) | `AdminRoute` — PIN gate | Configuración |
| Products (cost columns, edit) | `isUnlocked` in ProductsPage | Productos (existing) + admin-only fields |
| Stats | None | Estadísticas |
| Customers | None | Clientes |
| POS / Dashboard | None | Ventas (universal access) |

### Affected Areas

- `src/store/admin.ts` — Will be replaced/refactored; current PIN, unlock, theme, bulk price live here
- `src/components/AdminRoute.tsx` — Currently binary PIN gate; needs to become permission-aware
- `src/store/index.ts` — `Page` enum; may need no changes, or may need login/logout actions
- `src/App.tsx` — How AdminRoute wraps pages; may need nested guards per page
- `src/components/NavigationBar.tsx` — Admin lock icon shows unlock state; needs user context
- `src/pages/AdminPage.tsx` — Settings tab will host user management CRUD
- `src/pages/ProductsPage.tsx` — `isUnlocked` checks for cost columns → replace with permission check
- `src/db/schema.ts` — May add users / permissions tables
- `drizzle/local/` — New migration needed if schema changes
- `src/pages/StatsPage.tsx`, `src/pages/CustomersPage.tsx` — Currently unprotected; will need permission guards
- `src/__tests__/` — Admin store tests, route guard tests need updating

### Approaches

#### Approach 1: Zustand Store + localStorage (matches existing patterns)

Add a `useAuthStore` (or extend `useAdminStore`) with:
- **Users array**: `{ id, name, passwordHash, permissions: { ventas, clientes, estadisticas, configuracion } }`
- **Current user**: `{ userId | null }` (in-memory session)
- **Password hashing**: Web Crypto SHA-256 (same as current PIN)
- **Login/logout actions**: Verify hash, set current user
- **Permission check**: `hasPermission(page)` utility replacing `isUnlocked`
- **User CRUD**: In Admin settings tab (only users with `configuracion` permission can manage users)
- **Persistence**: Users array in `localStorage` (like customers); session in-memory

| Pros | Cons |
|------|------|
| Matches existing patterns (customers, admin PIN) | Passwords in localStorage — no real security boundary |
| Zero backend changes | No sync capability for users across devices |
| Offline-first by nature | Permission checks rely on frontend state (no server enforcement) |
| No Drizzle migration needed | Users lost on localStorage clear |
| Simple, fast to implement | Manual hash comparison only |

**Effort**: Medium

#### Approach 2: Drizzle Schema + Zustand Store + localStorage

Add to `db/schema.ts`:
- **`users` table**: `id`, `name`, `password_hash`, `store_id`, sync columns
- **`user_permissions` table**: `user_id`, `permission` (enum: ventas|clientes|estadisticas|configuracion), `granted` boolean
- Load users into Zustand from DB on app init
- Same login/permission logic as approach 1
- Generate Drizzle migration

| Pros | Cons |
|------|------|
| Real DB storage — queryable, syncable | Frontend doesn't currently query DB directly — needs new init pattern |
| Referential integrity with stores | Tauri backend change needed for password verification in Rust? |
| Sync engine could propagate users | Heavier migration for what's essentially local auth |
| More secure (DB access control at Tauri level) | Current pattern doesn't load from DB on frontend — inconsistent |
| Production-ready foundation | Over-engineered for single-device POS |

**Effort**: High

### Recommendation

**Approach 1: Zustand + localStorage** — start here.

Rationale:
1. **Consistency**: Matches how customers, admin PIN, and theme are persisted today
2. **Offline-first**: No dependency on DB connection or sync engine for auth
3. **Minimal blast radius**: No schema changes, no migration, no Tauri backend changes
4. **Iterative path**: Can migrate to DB-backed auth later if multi-device sync is needed
5. **The frontend is the security boundary**: In a local POS app, permission enforcement is UI-layer — same as today's PIN gate

However, **if the user plans to sync user accounts across multiple devices** (e.g., same credentials on Sucursal 2), then Approach 2 is the right choice from the start.

### Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| localStorage password hashes are extractable | Medium | Same risk as current PIN system; acceptable for local POS. Document threat model. |
| Users forget passwords (no recovery) | Medium | Add "reset to default" mechanism accessible from physical access to the device |
| First-user bootstrapping (who creates the first admin?) | Medium | First-run creates a default admin account with all permissions; changeable on first login |
| Permission check scattered across components | Low | Create a single `usePermission()` hook + `<PermissionRoute page={...}>` component |
| localStorage user list desyncs from customers, products, etc. | Low | All data is local-only today; no cross-referencing needed |

### Ready for Proposal

**Yes** — the exploration is complete. The orchestrator should tell the user:

> The codebase is ready for a `user-permissions` change. The investigation confirmed:
> 1. **No users table exists** in DB or localStorage — clean slate
> 2. **Two viable approaches**: Zustand+localStorage (recommended) or Drizzle+Zustand
> 3. **Previous `admin-roles-ui` change** explicitly scoped this out — it's the natural next step
> 4. **4 permissions** map directly to existing pages: Ventas (POS), Clientes, Estadísticas, Configuración
> 5. **The binary PIN (`isUnlocked`)** gets replaced entirely by user authentication + granular permission checks
>
> Recommend starting with a proposal that defines the user model, permission structure, and migration from the current PIN system.
