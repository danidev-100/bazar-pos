import { useEffect } from "react";
import { useAppStore, type Page } from "@/store";
import { useAdminStore } from "@/store/admin";
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

// ──────────────────────────────────────────────
// Page router — maps enum to component
// ──────────────────────────────────────────────

const PAGE_COMPONENTS: Record<Page, () => JSX.Element> = {
  pos: POSPage,
  products: ProductsPage,
  "cash-closing": CashClosingPage,
  billing: BillingPage,
  customers: CustomersPage,
  stats: StatsPage,
  admin: AdminPage,
};

// ──────────────────────────────────────────────
// App shell
// ──────────────────────────────────────────────

export default function App() {
  const page = useAppStore((s) => s.page);
  const theme = useAdminStore((s) => s.theme);
  const PageComponent = PAGE_COMPONENTS[page];

  // Sync theme class on mount and on change
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <StoreProvider initialStoreId="store_1">
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        {/* Navigation bar — fixed at top */}
        <NavigationBar />

        {/* Main content area — switches page by state */}
        <main className="flex-1 overflow-auto p-4">
          {page === "admin" ? (
            <AdminRoute>
              <PageComponent />
            </AdminRoute>
          ) : (
            <PageComponent />
          )}
        </main>
      </div>
    </StoreProvider>
  );
}
