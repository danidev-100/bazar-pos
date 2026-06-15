import { useAppStore, type Page } from "@/store";
import { StoreProvider } from "@/store/context";
import NavigationBar from "@/components/NavigationBar";
import ProductsPage from "@/pages/ProductsPage";
import POSPage from "@/pages/POSPage";
import CashClosingPage from "@/pages/CashClosingPage";
import BillingPage from "@/pages/BillingPage";
import StatsPage from "@/pages/StatsPage";

// ──────────────────────────────────────────────
// Page router — maps enum to component
// ──────────────────────────────────────────────

const PAGE_COMPONENTS: Record<Page, () => JSX.Element> = {
  pos: POSPage,
  products: ProductsPage,
  "cash-closing": CashClosingPage,
  billing: BillingPage,
  stats: StatsPage,
};

// ──────────────────────────────────────────────
// App shell
// ──────────────────────────────────────────────

export default function App() {
  const page = useAppStore((s) => s.page);
  const PageComponent = PAGE_COMPONENTS[page];

  return (
    <StoreProvider initialStoreId="store_1">
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        {/* Navigation bar — fixed at top */}
        <NavigationBar />

        {/* Main content area — switches page by state */}
        <main className="flex-1 overflow-auto p-4">
          <PageComponent />
        </main>
      </div>
    </StoreProvider>
  );
}
