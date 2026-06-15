import { useState, useMemo } from "react";
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
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ProductGrid({ onAddToCart }: ProductGridProps) {
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
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or barcode…"
          aria-label="Search products"
          className="w-full border border-pos-muted/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-surface"
        />
      </div>

      {/* Product grid */}
      {hasNoProducts ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-pos-muted italic">
            No products in this store. Add products in the Products page first.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-pos-muted italic">
            No products match "{search}"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto auto-rows-max pr-1">
          {filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => handleTap(product)}
              className="flex flex-col items-center justify-center bg-pos-surface border border-pos-muted/10 rounded-xl p-4 touch-target hover:border-pos-secondary/50 hover:shadow-sm transition-all active:scale-95"
              aria-label={`Add ${product.name} to cart`}
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

              {product.stock <= 5 && (
                <span className="text-xs text-pos-danger mt-1 font-medium">
                  {product.stock === 0 ? "Out of stock" : `Only ${product.stock} left`}
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
