import { useState, useMemo, useEffect, useRef } from "react";
import { useAppStore } from "@/store";
import { useActiveStore } from "@/store/context";
import { useProductsStore } from "@/store/products";

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

type ProductSearchModalProps = {
  onAddToCart: (product: {
    id: number;
    name: string;
    price: number;
  }) => void;
  onClose: () => void;
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ProductSearchModal({
  onAddToCart,
  onClose,
}: ProductSearchModalProps) {
  const { storeId } = useActiveStore();
  const products = useProductsStore((s) => s.products);
  const cartItems = useAppStore((s) => s.items);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  // Auto-focus search on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const product = filtered[selectedIndex];
        if (!product) return;
        const inCart = cartItems
          .filter((i) => i.productId === product.id)
          .reduce((sum, i) => sum + i.quantity, 0);
        if (!product.price || product.price <= 0 || product.stock - inCart <= 0)
          return;
        onAddToCart({ id: product.id, name: product.name, price: product.price });
        // Keep modal open — refocus search for next product
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onAddToCart, filtered, selectedIndex, cartItems]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function handleTap(product: (typeof storeProducts)[number]) {
    const inCart = cartItems
      .filter((i) => i.productId === product.id)
      .reduce((sum, i) => sum + i.quantity, 0);
    if (!product.price || product.price <= 0 || product.stock - inCart <= 0)
      return;
    onAddToCart({ id: product.id, name: product.name, price: product.price });
    // Keep modal open for fast consecutive adds
    inputRef.current?.focus();
  }

  const hasNoProducts = storeProducts.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-24 bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-pos-surface rounded-2xl shadow-2xl border border-pos-muted/10 overflow-hidden mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Search header ── */}
        <div className="p-4 border-b border-pos-muted/10">
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-pos-muted/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscá por nombre o código de barras…"
              aria-label="Buscar productos"
              className="w-full border border-pos-muted/30 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary bg-pos-background"
            />
          </div>
          <p className="text-xs text-pos-muted/50 mt-2 text-center">
            También podés escanear el código de barras directamente
          </p>
        </div>

        {/* ── Product list ── */}
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {hasNoProducts ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-pos-muted italic">
                No hay productos en esta tienda. Agregá productos desde la
                página Productos.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-pos-muted italic">
                No hay resultados para "{search}"
              </p>
            </div>
          ) : (
            <div ref={listRef} className="flex flex-col gap-1">
              {filtered.map((product, idx) => {
                const isSelected = idx === selectedIndex;
                const cartQty = cartItems
                  .filter((i) => i.productId === product.id)
                  .reduce((sum, i) => sum + i.quantity, 0);
                const availableStock = product.stock - cartQty;
                const outOfStock = availableStock <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => handleTap(product)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    disabled={outOfStock}
                    className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg border touch-target transition-all active:scale-[0.99] ${
                      isSelected
                        ? "border-pos-secondary ring-2 ring-pos-secondary/40 bg-pos-secondary/10"
                        : outOfStock
                          ? "border-pos-muted/10 opacity-40 cursor-not-allowed"
                          : availableStock < 25
                            ? "border-pos-danger/30 hover:border-pos-danger bg-pos-danger/5"
                            : "border-pos-muted/10 hover:border-pos-secondary/40 hover:bg-pos-secondary/5"
                    }`}
                    aria-label={
                      outOfStock
                        ? `${product.name} — sin stock`
                        : `${product.name} — $${product.price} — Enter para agregar`
                    }
                  >
                    {/* Stock dot */}
                    <span
                      className={`shrink-0 w-2 h-2 rounded-full ${
                        outOfStock
                          ? "bg-pos-muted/30"
                          : availableStock < 25
                            ? "bg-pos-danger"
                            : availableStock < 50
                              ? "bg-pos-accent"
                              : "bg-pos-success"
                      }`}
                    />

                    {/* Name + barcode + price inline */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-pos-text truncate">
                          {product.name}
                        </p>
                        <span className="shrink-0 text-sm font-bold font-mono text-pos-secondary tabular-nums">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {product.barcode && (
                          <p className="text-[10px] text-pos-muted/50 font-mono truncate">
                            {product.barcode}
                          </p>
                        )}
                        <span
                          className={`shrink-0 text-[10px] font-medium ${
                            outOfStock
                              ? "text-pos-muted"
                              : availableStock < 25
                                ? "text-pos-danger"
                                : "text-pos-muted/60"
                          }`}
                        >
                          {outOfStock ? "Sin stock" : `${availableStock} uds`}
                        </span>
                      </div>
                    </div>

                    {/* Add icon */}
                    {!outOfStock && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4 text-pos-muted/40 shrink-0"
                      >
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

        {/* ── Footer ── */}
        <div className="p-3 border-t border-pos-muted/10 flex items-center justify-between">
          <span className="text-xs text-pos-muted/40">
            {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-pos-muted hover:text-pos-text touch-target rounded-lg hover:bg-pos-background/50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
