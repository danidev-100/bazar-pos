import { useAuthStore, type Permission } from "@/store/auth";
import type { Page } from "@/store";

// ──────────────────────────────────────────────
// Page → Permission mapping
// ──────────────────────────────────────────────

const PAGE_PERMISSIONS: Partial<Record<Page, Permission>> = {
  pos: "ventas",
  "cash-closing": "ventas",
  customers: "clientes",
  stats: "estadisticas",
  products: "configuracion",
  billing: "configuracion",
  admin: "configuracion",
  expenses: "configuracion",
  "user-management": "configuracion",
};

// Pages that require no permission (just needs auth)
const PUBLIC_PAGES: Page[] = ["dashboard", "login"];

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export function usePermission(page: Page): boolean {
  const currentUser = useAuthStore((s) => s.currentUser);

  // Login page always accessible
  if (page === "login") return true;

  // Public pages: just need to be authenticated
  if (PUBLIC_PAGES.includes(page)) {
    return currentUser !== null;
  }

  // Permission-gated pages
  const requiredPermission = PAGE_PERMISSIONS[page];
  if (!requiredPermission) return false;

  if (!currentUser) return false;
  return currentUser.permissions.includes(requiredPermission);
}
