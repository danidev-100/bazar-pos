import { useState, useMemo, type RefObject } from "react";
import { useAppStore } from "@/store";
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
  const cartItems = useAppStore((s) => s.items);
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
    const inCart = cartItems
      .filter((i) => i.productId === product.id)
      .reduce((sum, i) => sum + i.quantity, 0);
    if (!product.price || product.price <= 0 || product.stock - inCart <= 0) {
      return;
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
        <div className="flex flex-col gap-1 overflow-y-auto pr-1">
          {filtered.map((product) => {
            const cartQty = cartItems
              .filter((i) => i.productId === product.id)
              .reduce((sum, i) => sum + i.quantity, 0);
            const availableStock = product.stock - cartQty;
            const outOfStock = availableStock <= 0;
            return (
              <button
                key={product.id}
                onClick={() => handleTap(product)}
                disabled={outOfStock}
                className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg border touch-target transition-all active:scale-[0.99] ${
                  outOfStock
                    ? "border-pos-muted/10 opacity-40 cursor-not-allowed"
                    : availableStock < 25
                      ? "border-pos-danger/30 hover:border-pos-danger bg-pos-danger/5"
                      : "border-pos-muted/10 hover:border-pos-secondary/40 hover:bg-pos-secondary/5"
                }`}
                aria-label={outOfStock ? `${product.name} — sin stock` : `Agregar ${product.name} al carrito`}
              >
                {/* Stock indicator dot */}
                <span className={`shrink-0 w-2 h-2 rounded-full ${
                  outOfStock ? "bg-pos-muted/30" : availableStock < 25 ? "bg-pos-danger" : availableStock < 50 ? "bg-pos-accent" : "bg-pos-success"
                }`} />

                {/* Name + barcode */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-pos-text truncate">{product.name}</p>
                  {product.barcode && (
                    <p className="text-[10px] text-pos-muted/50 font-mono truncate">{product.barcode}</p>
                  )}
                </div>

                {/* Stock */}
                <span className={`shrink-0 text-xs font-medium ${
                  outOfStock ? "text-pos-muted" : availableStock < 25 ? "text-pos-danger" : "text-pos-muted"
                }`}>
                  {outOfStock ? "Sin stock" : `${availableStock} uds`}
                </span>

                {/* Price */}
                <span className="shrink-0 text-base font-bold font-mono text-pos-secondary min-w-[80px] text-right">
                  ${product.price.toFixed(2)}
                </span>

                {/* Add icon */}
                {!outOfStock && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-pos-muted/40 shrink-0">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
