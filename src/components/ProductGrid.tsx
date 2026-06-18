import { useState, useMemo, type RefObject } from "react";
import { useActiveStore } from "@/store/context";
import { useProductsStore } from "@/store/products";

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

type ProductGridProps = {
  onAddToCart: (product: {
    id: number;
    name: string;
    price: number;
  }) => void;
  /** Optional ref for keyboard-shortcut focus (F2) */
  searchInputRef?: React.Ref<HTMLInputElement>;
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ProductGrid({ onAddToCart, searchInputRef }: ProductGridProps) {
  const { storeId } = useActiveStore();
  const products = useProductsStore((s) => s.products);
  const [search, setSearch] = useState("");

  const storeProducts = useMemo(
    () => products.filter((p) => p.store_id === storeId),
    [products, storeId],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return storeProducts;

    const q = search.toLowerCase();
    return storeProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode !== null && p.barcode.toLowerCase().includes(q)),
    );
  }, [storeProducts, search]);

  function handleTap(product: (typeof storeProducts)[number]) {
    if (!product.price || product.price <= 0) {
      return; // caller may show a toast; we just silently guard
    }
    onAddToCart({ id: product.id, name: product.name, price: product.price });
  }

  const hasNoProducts = storeProducts.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="mb-3">
        <input
          ref={searchInputRef as React.Ref<HTMLInputElement>}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscá por nombre o código…"
          aria-label="Buscar productos"
          className="w-full border border-pos-muted/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-surface"
        />
      </div>

      {/* Product grid */}
      {hasNoProducts ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-pos-muted italic">
            No hay productos en esta tienda. Agregá productos desde la página Productos.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-pos-muted italic">
            No hay productos que coincidan con "{search}"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto overflow-x-auto auto-rows-max pr-1">
          {filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => handleTap(product)}
              className={`flex flex-col items-center justify-center bg-pos-surface border rounded-xl p-4 touch-target transition-all active:scale-95 ${
                product.stock < 25
                  ? "border-pos-danger/50 hover:border-pos-danger bg-pos-danger/5"
                  : "border-pos-muted/10 hover:border-pos-secondary/50 hover:shadow-sm"
              }`}
              aria-label={`Agregar ${product.name} al carrito`}
            >
              {/* Product emoji placeholder — replace with actual image later */}
              <span className="text-3xl mb-2" role="img" aria-hidden="true">
                📦
              </span>

              <span className="text-sm font-semibold text-pos-text text-center leading-tight line-clamp-2">
                {product.name}
              </span>

              <span className="text-lg font-bold text-pos-secondary mt-1 font-mono">
                ${product.price.toFixed(2)}
              </span>

              {product.stock < 25 && (
                <span className="text-xs text-pos-danger mt-1 font-medium">
                  {product.stock === 0 ? "Sin stock" : `Stock: ${product.stock}`}
                </span>
              )}

              {product.barcode && (
                <span className="text-[10px] text-pos-muted mt-1 font-mono truncate max-w-full">
                  {product.barcode}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
