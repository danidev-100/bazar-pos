# Design: Admin Roles & UI

## Technical Approach

Four independent slices: (1) Drizzle schema additions (brands + product cols), (2) Zustand store slices (brands, admin, bulk-price, theme), (3) Admin route guard wrapping the existing page router, (4) Dark theme via Tailwind `dark:` class toggled on `<html>`. Each slice has its own file — no monolithic changes.

## Architecture Decisions

### Decision: PIN Storage

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **localStorage SHA-256 hash** | No server needed, survives restart, offline-safe | ✅ **Chosen** |
| Hardcoded/compile-time PIN | Zero flexibility, requires rebuild to change | ❌ Rejected |
| Tauri secure-store plugin | Adds native dependency, overkill for single PIN | ❌ Rejected |

### Decision: Dark Theme Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Tailwind `dark:` variant + CSS vars** | Zero runtime cost, per-component control, matches existing Tailwind usage | ✅ **Chosen** |
| CSS-only media query | Ignores user toggle, can't persist preference | ❌ Rejected |
| CSS-in-JS theme context | Runtime overhead, coupling to React | ❌ Rejected |

### Decision: Bulk Price Flow

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Zustand: preview → confirm (2-step)** | Zero DB writes during preview, users verify before commit, matches existing store pattern | ✅ **Chosen** |
| Direct DB mutation | Can't preview, hard to undo | ❌ Rejected |
| Server-side transaction | No server, this is local-first | ❌ Rejected |

### Decision: Admin Route Guard

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Wrapper component in App.tsx page map** | Simple, no router needed, reuses existing pattern | ✅ **Chosen** |
| React Router guards | Adding router for one route is overkill | ❌ Rejected |
| Per-page HOC | Diffuse logic, easy to miss pages | ❌ Rejected |

## Schema Changes

```typescript
// db/schema.ts — additions
export const brands = sqliteTable("brands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  ...syncColumns,          // store_id, created_at, etc.
}, (table) => ({
  storeNameIdx: uniqueIndex("idx_brands_store_name").on(table.store_id, table.name),
}));

// products — new columns
brand_id: integer("brand_id").references(() => brands.id),
cost_price: real("cost_price").notNull().default(0),
```

## Component Architecture

```
App.tsx
├── NavigationBar          ← + Admin toggle button (dropdown)
├── <AdminRoute>           ← NEW: wraps admin-only pages, checks PIN
│   ├── AdminPage          ← NEW: brands CRUD + bulk price + settings
│   │   ├── BrandForm      ← NEW: create/edit brand
│   │   ├── BrandList      ← NEW: table of brands per store
│   │   ├── BulkPriceModal ← NEW: filter form + preview table + confirm
│   │   └── ThemeToggle    ← NEW: dark/light switch
│   └── ProductsPage       ← MODIFIED: add cost_price + brand columns
└── POSPage, etc.
```

### Admin Page Routing

A `Page` union type gets a new `"admin"` literal. The `PAGE_COMPONENTS` map conditionally renders `<AdminRoute>` which checks `useAdminStore.isUnlocked`. If locked, it renders the PIN entry screen. The admin page itself (AdminPage) contains the settings/brands/bulk sub-views via local tab state — no sub-routing needed.

## Data Flow: Bulk Price Preview → Confirm

```
User picks filter (category/brand) + % + target
        │
        ▼
Zustand: bulkPricePreview(filter, percent, target)
        │
        ▼
Store iterates products[], calculates new price (no mutation)
        │
        ▼
Returns BulkPreviewItem[]  ← displayed in modal table
        │
User clicks "Aplicar"
        │
        ▼
Zustand: bulkPriceConfirm()
        │
        ▼
Maps preview items back to updateProduct() calls
Toast: "Precios actualizados"
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `db/schema.ts` | Modify | Add `brands` table + `cost_price`/`brand_id` on products |
| `db/migrations/` | Create | Drizzle migration for new table + columns |
| `src/store/index.ts` | Modify | Add `"admin"` to `Page` union type |
| `src/store/admin.ts` | Create | Zustand store: PIN hash, unlock state, theme preference, bulk price logic |
| `src/store/brands.ts` | Create | Zustand store: brands CRUD (matches products.ts pattern) |
| `src/components/NavigationBar.tsx` | Modify | Add admin nav button with PIN lock icon |
| `src/components/AdminRoute.tsx` | Create | Wraps admin pages; checks PIN before rendering children |
| `src/pages/AdminPage.tsx` | Create | Tabbed page: Brands, Bulk Price, Settings |
| `src/components/BrandForm.tsx` | Create | Create/edit brand (mirrors ProductForm pattern) |
| `src/components/BrandList.tsx` | Create | Table of brands per store |
| `src/components/BulkPriceModal.tsx` | Create | Modal: filter + preview table + confirm button |
| `src/components/ThemeToggle.tsx` | Create | Dark/light switch (sun/moon icon) |
| `src/components/ProductForm.tsx` | Modify | Add cost_price input + brand selector dropdown |
| `src/pages/ProductsPage.tsx` | Modify | Add cost_price + brand columns to product table |
| `src/App.tsx` | Modify | Add AdminPage to page map, wrap with AdminRoute |
| `tailwind.config.js` | Modify | Add `darkMode: "class"` + dark color overrides |
| `src/styles.css` | Modify | Add CSS custom properties for dark theme |

## Interfaces / Contracts

```typescript
// src/store/admin.ts
type AdminStore = {
  isUnlocked: boolean;
  pinHash: string | null;       // SHA-256 hex
  theme: "light" | "dark";
  // PIN
  setPin: (pin: string) => void;  // hashes + stores
  unlock: (pin: string) => boolean;
  lock: () => void;
  // Theme
  toggleTheme: () => void;
  // Bulk price
  preview: BulkPreviewItem[] | null;
  bulkPricePreview: (opts: BulkPriceOpts) => BulkPreviewItem[];
  bulkPriceConfirm: () => void;
};

type BulkPriceOpts = {
  filter: "all" | "category" | "brand";
  filterId?: number;
  percent: number;            // e.g. 10 = +10%
  target: "cost" | "selling" | "both";
  storeId: string;
};

type BulkPreviewItem = {
  productId: number;
  name: string;
  currentPrice: number;
  newPrice: number;
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Brands CRUD | Zustand store tests (follow `products.test.ts` pattern — `useBrandsStore.getState()` + `setState()` reset) |
| Unit | PIN hash & unlock | Store with known hash input; verify wrong PIN returns false, correct PIN unlocks |
| Unit | Bulk price preview | Store-level: mock 5 products, run preview with various filter/percent combos, assert computed prices match |
| Unit | Bulk price confirm | Call preview then confirm; assert products in store have updated prices |
| Unit | Dark theme toggle | Store: toggle theme, assert value flips; verify body class updates |
| Integration | Admin route guard | Render AdminRoute with store locked → PIN screen; unlock → children render |
| Integration | Product form + brand | Render ProductForm with brands in store; verify brand select renders options |

## Migration / Rollout

No data migration required — brands is a new table, cost_price/brand_id default to 0/null. Admin PIN starts unset (no PIN = no admin access). Dark theme defaults to light.

## Open Questions

- [ ] Should the PIN be required before the admin nav button is visible, or should the button always show and redirect to the PIN entry screen? Decision from proposal: show button, redirect to PIN entry.
