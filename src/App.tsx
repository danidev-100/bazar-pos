import { useEffect, useState, useRef } from "react";
import { useAppStore, type Page } from "@/store";
import { useAdminStore } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { usePermission } from "@/hooks/usePermission";
import { useSync } from "@/hooks/useSync";
import { StoreProvider } from "@/store/context";
import { initAllStores } from "@/lib/init-stores";
import AdminRoute from "@/components/AdminRoute";
import NavigationBar from "@/components/NavigationBar";
import ConfirmModal from "@/components/ConfirmModal";

// Pages
import DashboardPage from "@/pages/DashboardPage";
import POSPage from "@/pages/POSPage";
import CashClosingPage from "@/pages/CashClosingPage";
import ProductsPage from "@/pages/ProductsPage";
import CustomersPage from "@/pages/CustomersPage";
import ProveedoresPage from "@/pages/ProveedoresPage";
import PedidosPage from "@/pages/PedidosPage";
import BillingPage from "@/pages/BillingPage";
import ComprobantesPage from "@/pages/ComprobantesPage";
import ExpensesPage from "@/pages/ExpensesPage";
import StatsPage from "@/pages/StatsPage";
import AdminPage from "@/pages/AdminPage";
import UserManagementPage from "@/pages/UserManagementPage";
import LoginPage from "@/pages/LoginPage";
import ActivationPage from "@/pages/ActivationPage";

// ──────────────────────────────────────────────
// Page router — maps enum to component
// ──────────────────────────────────────────────

const PAGE_COMPONENTS: Record<Page, () => JSX.Element> = {
  dashboard: DashboardPage,
  expenses: ExpensesPage,
  pos: POSPage,
  products: ProductsPage,
  "cash-closing": CashClosingPage,
  billing: BillingPage,
  customers: CustomersPage,
  stats: StatsPage,
  admin: AdminPage,
  login: LoginPage,
  "user-management": UserManagementPage,
  proveedores: ProveedoresPage,
  pedidos: PedidosPage,
  comprobantes: ComprobantesPage,
};

// ──────────────────────────────────────────────
// Pages that require admin permission
// ──────────────────────────────────────────────

const ADMIN_PAGES: Page[] = ["admin", "user-management", "cash-closing"];

// ──────────────────────────────────────────────
// App shell
// ──────────────────────────────────────────────

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

export default function App() {
  console.log(`[Bazar POS] v${__APP_VERSION__} built ${__BUILD_TIME__} — log de errores abajo`);
  const page = useAppStore((s) => s.page);
  const setPage = useAppStore((s) => s.setPage);
  const theme = useAdminStore((s) => s.theme);
  const currentUser = useAuthStore((s) => s.currentUser);
  const init = useAuthStore((s) => s.init);
  const hasAccess = usePermission(page);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [activationChecked, setActivationChecked] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  // Check license activation on mount — reads local SQLite via tauri-plugin-sql
  useEffect(() => {
    async function checkActivation() {
      try {
        const { getActivation } = await import("@/lib/db");
        const activation = await getActivation();
        setIsActivated(activation !== null);
      } catch {
        setIsActivated(false);
      } finally {
        setActivationChecked(true);
      }
    }
    checkActivation();
  }, []);

  // Hydrate auth store, restore session, load all data from SQLite
  useEffect(() => {
    init();
    initAllStores();
  }, [init]);

  // Start hourly sync
  useSync();

  // Sync theme class on mount and on change
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Intercept Tauri window close to show confirmation modal
  const closeUnlistenRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    async function setupCloseHandler() {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        unlisten = await win.onCloseRequested(async (event) => {
          event.preventDefault();
          setShowCloseConfirm(true);
        });
        closeUnlistenRef.current = unlisten;
      } catch {
        // Not running inside Tauri — ignore
      }
    }

    setupCloseHandler();

    return () => {
      unlisten?.();
    };
  }, []);

  async function handleConfirmClose() {
    setShowCloseConfirm(false);
    try {
      // Unregister the close handler first to avoid re-trigger loop
      closeUnlistenRef.current?.();
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {
      // Fallback: not in Tauri
    }
  }

  // Permission gate: redirect unpermitted pages to dashboard
  useEffect(() => {
    if (currentUser !== null && !hasAccess && page !== "login") {
      setPage("dashboard");
    }
  }, [currentUser, hasAccess, page, setPage]);

  // ── Render ──

  const isAuthenticated = currentUser !== null;
  const PageComponent = PAGE_COMPONENTS[page];
  const needsAdminGate = ADMIN_PAGES.includes(page);

  return (
    <StoreProvider initialStoreId="store_1">
      {!activationChecked ? (
        <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-gray-900">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : !isActivated ? (
        <ActivationPage />
      ) : isAuthenticated ? (
        <div className="flex h-screen w-screen overflow-hidden">
          <NavigationBar />
          <main className="flex-1 overflow-auto p-4">
            {needsAdminGate ? (
              <AdminRoute>
                <PageComponent />
              </AdminRoute>
            ) : (
              <PageComponent />
            )}
          </main>
        </div>
      ) : (
        <LoginPage />
      )}

      {/* Close window confirmation modal — only when activated */}
      {isActivated && showCloseConfirm && (
        <ConfirmModal
          title="Cerrar programa"
          message="¿Estás seguro de que querés cerrar el programa? Perderás la sesión actual."
          confirmText="Sí, cerrar"
          cancelText="Seguir acá"
          onConfirm={handleConfirmClose}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
    </StoreProvider>
  );
}
