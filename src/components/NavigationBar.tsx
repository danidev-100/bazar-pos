import { useCallback } from "react";
import { useAppStore, useAuthStore, type Page } from "@/store";
import { type Permission } from "@/store/auth";
import { getSyncState, triggerSync } from "@/hooks/useSync";
import ThemeToggle from "@/components/ThemeToggle";

// ──────────────────────────────────────────────
// Page definitions
// ──────────────────────────────────────────────

type PageDef = {
  id: Page;
  label: string;
  icon: string; // emoji as placeholder — replace with SVG or icon component later
  permission?: Permission; // optional — if set, user needs this permission to see the page
};

const ALL_PAGES: PageDef[] = [
  // ── Principal ──
  { id: "dashboard", label: "Inicio", icon: "🏠" },
  { id: "pos", label: "POS", icon: "🛒", permission: "ventas" },
  { id: "cash-closing", label: "Caja", icon: "💰", permission: "caja" },

  // ── Gestión ──
  { id: "products", label: "Productos", icon: "📦", permission: "productos" },
  { id: "customers", label: "Clientes", icon: "👥", permission: "clientes" },
  { id: "proveedores", label: "Proveedores", icon: "🏭", permission: "proveedores" },
  { id: "pedidos", label: "Pedidos", icon: "📋", permission: "pedidos" },

  // ── Documentos ──
  { id: "billing", label: "Facturación", icon: "🧾", permission: "facturacion" },
  { id: "comprobantes", label: "Comprobantes", icon: "📄", permission: "comprobantes" },

  // ── Finanzas ──
  { id: "expenses", label: "Gastos", icon: "💸", permission: "gastos" },
  { id: "stats", label: "Estadísticas", icon: "📊", permission: "estadisticas" },

  // ── Sistema ──
  { id: "admin", label: "Admin", icon: "🔒", permission: "admin" },
];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function NavigationBar() {
  const page = useAppStore((s) => s.page);
  const setPage = useAppStore((s) => s.setPage);
  const currentUser = useAuthStore((s) => s.currentUser);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const logout = useAuthStore((s) => s.logout);

  // Filter pages by user permissions
  const pages = ALL_PAGES.filter((p) => {
    if (!p.permission) return true;
    return hasPermission(p.permission);
  });

  // Manual sync trigger — uses the shared triggerSync from useSync
  const handleSync = useCallback(() => {
    triggerSync();
  }, []);

  // Sync status from the shared sync state
  const syncState = getSyncState();
  const syncStatus = syncState.status;
  const syncError = syncState.error;
  const lastSync = syncState.lastSyncedAt
    ? new Date(syncState.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;
  const lastSyncDisplay = lastSync ?? "—";
  const syncIcon =
    syncStatus === "syncing"
      ? "🔄"
      : syncStatus === "success"
        ? "☁️"
        : syncStatus === "error"
          ? "⚠️"
          : "☁️";

  function handleLogout() {
    logout();
    setPage("login");
  }

  return (
    <nav className="flex items-center justify-between bg-pos-primary/95 backdrop-blur-sm text-white px-2 sm:px-4 py-2 shadow-md gap-2">
      {/* Page switcher */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {pages.map((p) => (
          <button
            key={p.id}
            onClick={() => setPage(p.id)}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              page === p.id
                ? "bg-pos-secondary text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <span className="text-base" role="img" aria-label={p.label}>
              {p.icon}
            </span>
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        ))}
      </div>

      {/* Right: sync status + user info + theme toggle + store selector */}
      <div className="flex items-center gap-3">
        {/* Sync status indicator */}
        <button
          onClick={handleSync}
          className="text-xs text-white/60 hover:text-white transition-colors touch-target flex items-center gap-1 px-2 py-1"
          title={
            syncStatus === "syncing"
              ? "Sincronizando..."
              : syncStatus === "success"
                ? `Última sincro: ${lastSyncDisplay}`
                : syncStatus === "error"
                  ? `Error: ${syncError}`
                  : "Sincronizar ahora"
          }
        >
          <span>{syncIcon}</span>
          {syncStatus === "syncing" && (
            <span className="hidden sm:inline text-xs">Sync...</span>
          )}
        </button>

        {currentUser && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/80 hidden sm:inline">
              {currentUser.name}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-white/60 hover:text-white transition-colors touch-target px-2 py-1"
            >
              Salir
            </button>
          </div>
        )}
        <ThemeToggle compact />
      </div>
    </nav>
  );
}
