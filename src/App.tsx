import { useAppStore, type Page } from "@/store";
import { StoreProvider } from "@/store/context";
import NavigationBar from "@/components/NavigationBar";
import ProductsPage from "@/pages/ProductsPage";

// ──────────────────────────────────────────────
// Page placeholders (implemented in later PRs)
// ──────────────────────────────────────────────

function POSPage() {
  return (
    <div className="flex items-center justify-center h-full text-pos-muted">
      <p className="text-lg">POS — coming in PR 3</p>
    </div>
  );
}

function CashClosingPage() {
  return (
    <div className="flex items-center justify-center h-full text-pos-muted">
      <p className="text-lg">Cash Closing — coming in PR 4</p>
    </div>
  );
}

function BillingPage() {
  return (
    <div className="flex items-center justify-center h-full text-pos-muted">
      <p className="text-lg">Billing — coming in PR 5</p>
    </div>
  );
}

function StatsPage() {
  return (
    <div className="flex items-center justify-center h-full text-pos-muted">
      <p className="text-lg">Statistics — coming in PR 6</p>
    </div>
  );
}

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
