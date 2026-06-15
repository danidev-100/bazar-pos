import { useAppStore, type Page } from "@/store";
import { useActiveStore } from "@/store/context";

// ──────────────────────────────────────────────
// Page definitions
// ──────────────────────────────────────────────

type PageDef = {
  id: Page;
  label: string;
  icon: string; // emoji as placeholder — replace with SVG or icon component later
};

const PAGES: PageDef[] = [
  { id: "pos", label: "POS", icon: "🛒" },
  { id: "products", label: "Productos", icon: "📦" },
  { id: "cash-closing", label: "Caja", icon: "💰" },
  { id: "billing", label: "Facturación", icon: "🧾" },
  { id: "stats", label: "Estadísticas", icon: "📊" },
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
  const { storeId, setStoreId } = useActiveStore();

  function handleStoreChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStore = e.target.value;
    if (newStore === storeId) return;

    // Clearing cart on store switch per store-isolation spec (R3: Switch store)
    clearCart();
    setStoreId(newStore);
  }

  return (
    <nav className="flex items-center justify-between bg-pos-primary text-white px-4 py-2 shadow-md">
      {/* Page switcher */}
      <div className="flex items-center gap-1">
        {PAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPage(p.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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

      {/* Store selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="store-selector" className="text-sm text-white/70">
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
    </nav>
  );
}
