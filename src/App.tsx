import { useEffect } from "react";
import { useAppStore, type Page } from "@/store";
import { useAdminStore } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { usePermission } from "@/hooks/usePermission";
import { useSync } from "@/hooks/useSync";
import { StoreProvider } from "@/store/context";
import AdminRoute from "@/components/AdminRoute";
import NavigationBar from "@/components/NavigationBar";
import ProductsPage from "@/pages/ProductsPage";
import POSPage from "@/pages/POSPage";
import CashClosingPage from "@/pages/CashClosingPage";
import BillingPage from "@/pages/BillingPage";
import CustomersPage from "@/pages/CustomersPage";
import StatsPage from "@/pages/StatsPage";
import AdminPage from "@/pages/AdminPage";
import DashboardPage from "@/pages/DashboardPage";
import UserManagementPage from "@/pages/UserManagementPage";
import LoginPage from "@/pages/LoginPage";

// ──────────────────────────────────────────────
// Page router — maps enum to component
// ──────────────────────────────────────────────

const PAGE_COMPONENTS: Record<Page, () => JSX.Element> = {
  dashboard: DashboardPage,
  pos: POSPage,
  products: ProductsPage,
  "cash-closing": CashClosingPage,
  billing: BillingPage,
  customers: CustomersPage,
  stats: StatsPage,
  admin: AdminPage,
  login: LoginPage,
  "user-management": UserManagementPage,
};

// ──────────────────────────────────────────────
// Pages that require admin permission
// ──────────────────────────────────────────────

const ADMIN_PAGES: Page[] = ["admin", "user-management", "cash-closing"];

// ──────────────────────────────────────────────
// App shell
// ──────────────────────────────────────────────

export default function App() {
  const page = useAppStore((s) => s.page);
  const setPage = useAppStore((s) => s.setPage);
  const theme = useAdminStore((s) => s.theme);
  const currentUser = useAuthStore((s) => s.currentUser);
  const init = useAuthStore((s) => s.init);
  const hasAccess = usePermission(page);

  // Hydrate auth store on mount
  useEffect(() => {
    init();
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
      {isAuthenticated ? (
        <div className="flex flex-col h-screen w-screen overflow-hidden">
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
    </StoreProvider>
  );
}
