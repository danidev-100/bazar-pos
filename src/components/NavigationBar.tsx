import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, useAuthStore, type Page } from "@/store";
import { type Permission } from "@/store/auth";
import { useActiveStore } from "@/store/context";
import { getSyncState } from "@/hooks/useSync";
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
  { id: "dashboard", label: "Inicio", icon: "🏠" },
  { id: "pos", label: "POS", icon: "🛒", permission: "ventas" },
  { id: "cash-closing", label: "Caja", icon: "💰", permission: "ventas" },
  { id: "products", label: "Productos", icon: "📦", permission: "configuracion" },
  { id: "billing", label: "Facturación", icon: "🧾", permission: "configuracion" },
  { id: "expenses", label: "Gastos", icon: "💸", permission: "configuracion" },
  { id: "customers", label: "Clientes", icon: "👥", permission: "clientes" },
  { id: "stats", label: "Estadísticas", icon: "📊", permission: "estadisticas" },
  { id: "admin", label: "Admin", icon: "🔒", permission: "configuracion" },
];

// ──────────────────────────────────────────────
// Store options (static for now — will be populated from DB in PR 2)
// ──────────────────────────────────────────────

const STORE_OPTIONS = [
  { id: "store_1", name: "Tienda Principal" },
  { id: "store_2", name: "Sucursal 2" },
  { id: "store_3", name: "Sucursal 3" },
];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function NavigationBar() {
  const page = useAppStore((s) => s.page);
  const setPage = useAppStore((s) => s.setPage);
  const clearCart = useAppStore((s) => s.clearCart);
  const currentUser = useAuthStore((s) => s.currentUser);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const logout = useAuthStore((s) => s.logout);
  const { storeId, setStoreId } = useActiveStore();

  // Filter pages by user permissions
  const pages = ALL_PAGES.filter((p) => {
    if (!p.permission) return true;
    return hasPermission(p.permission);
  });

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    try {
      const databaseUrl = import.meta.env.VITE_SYNC_DATABASE_URL as string | undefined;
      await invoke("sync_now", { databaseUrl: databaseUrl || null });
    } catch {
      // Error is handled by the useSync hook's state
    }
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

  function handleStoreChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStore = e.target.value;
    if (newStore === storeId) return;

    // Clearing cart on store switch per store-isolation spec (R3: Switch store)
    clearCart();
    setStoreId(newStore);
  }

  function handleLogout() {
    logout();
    setPage("login");
  }

  return (
    <nav className="flex items-center justify-between bg-pos-primary text-white px-2 sm:px-4 py-2 shadow-md gap-2">
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
          onClick={triggerSync}
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
        <div className="flex items-center gap-2">
          <label htmlFor="store-selector" className="text-sm text-white/70 hidden sm:inline">
            Tienda:
          </label>
          <select
            id="store-selector"
            value={storeId}
            onChange={handleStoreChange}
            className="bg-pos-secondary text-white text-sm rounded-lg px-3 py-1.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-pos-accent"
          >
            {STORE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </nav>
  );
}
