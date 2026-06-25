import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useActiveStore } from "@/store/context";
import { useProductsStore, type Product, type Category } from "@/store/products";
import { useBrandsStore } from "@/store/brands";
import { useAuthStore } from "@/store/auth";
import { useBarcodeInput } from "@/hooks/useBarcodeInput";
import ProductForm from "@/components/ProductForm";
import StockMovementLog from "@/components/StockMovementLog";
import ImportProductsModal from "@/components/ImportProductsModal";
import BulkPriceIncreaseModal from "@/components/BulkPriceIncreaseModal";
import BulkCategoryModal from "@/components/BulkCategoryModal";
import { exportTableToPdf, exportToExcel, type ExportColumn } from "@/lib/export-utils";

const RENDER_BATCH = 200;

// ──────────────────────────────────────────────
// Views for the center panel
// ──────────────────────────────────────────────

type CenterView =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; product: Product }
  | { kind: "edit-category"; category: Category };

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ProductsPage() {
  const { storeId } = useActiveStore();
  const products = useProductsStore((s) => s.products);
  const categories = useProductsStore((s) => s.categories);
  const brandsList = useBrandsStore((s) => s.brands);
  const isUnlocked = useAuthStore((s) => s.hasPermission("productos"));
  const adjustStock = useProductsStore((s) => s.adjustStock);
  const deleteProduct = useProductsStore((s) => s.deleteProduct);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [editingStockVal, setEditingStockVal] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [stockFilter, setStockFilter] = useState<"all" | "critical" | "medium">("all");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [centerView, setCenterView] = useState<CenterView>({ kind: "list" });
  const [showImport, setShowImport] = useState(false);
  const [showBulkPrice, setShowBulkPrice] = useState(false);
  const [showBulkCategory, setShowBulkCategory] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [renderCount, setRenderCount] = useState(RENDER_BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const storeProducts = useMemo(
    () => products.filter((p) => p.store_id === storeId),
    [products, storeId],
  );

  // ── Barcode scanning in product form ──
  const [scannedBarcode, setScannedBarcode] = useState("");

  useBarcodeInput({
    active: centerView.kind === "create" || centerView.kind === "edit",
    onBarcode: useCallback(
      (barcode: string) => {
        if (centerView.kind === "create") {
          const existing = storeProducts.find((p) => p.barcode === barcode);
          if (existing) {
            // Product already exists — navigate to edit
            setSelectedProductId(existing.id);
            setCenterView({ kind: "edit", product: existing });
            return;
          }
        }
        setScannedBarcode(barcode);
      },
      [centerView.kind, storeProducts],
    ),
  });

  // Reset scanned barcode when the form closes
  useEffect(() => {
    if (centerView.kind !== "create" && centerView.kind !== "edit") {
      setScannedBarcode("");
    }
  }, [centerView.kind]);

  const storeCategories = useMemo(
    () => categories.filter((c) => c.store_id === storeId),
    [categories, storeId],
  );

  // Pre-compute category lookup + descendant map once
  const catById = useMemo(() => new Map(storeCategories.map((c) => [c.id, c])), [storeCategories]);
  const brandById = useMemo(() => new Map(brandsList.map((b) => [b.id, b.name])), [brandsList]);

  const catDescendants = useMemo(() => {
    const childrenOf = new Map<number, number[]>();
    for (const c of storeCategories) {
      if (c.parent_id != null) {
        const list = childrenOf.get(c.parent_id) ?? [];
        list.push(c.id);
        childrenOf.set(c.parent_id, list);
      }
    }
    // Pre-compute full descendant set for every category
    const allDescendants = new Map<number, Set<number>>();
    function getDescendants(id: number): Set<number> {
      let cached = allDescendants.get(id);
      if (cached) return cached;
      const set = new Set<number>([id]);
      for (const childId of childrenOf.get(id) ?? []) {
        for (const d of getDescendants(childId)) set.add(d);
      }
      allDescendants.set(id, set);
      return set;
    }
    for (const c of storeCategories) getDescendants(c.id);
    return allDescendants;
  }, [storeCategories]);

  // Filter products by search
  const bySearch = useMemo(() => {
    if (!search.trim()) return storeProducts;
    const q = search.toLowerCase();
    return storeProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)),
    );
  }, [storeProducts, search]);

  // Filter products by selected category (include subcategory products)
  const byCategory = selectedCategoryId
    ? bySearch.filter((p) => {
        const ids = catDescendants.get(selectedCategoryId);
        return p.category_id !== null && ids?.has(p.category_id);
      })
    : bySearch;

  // Filter products by selected brand
  const byBrand = selectedBrandId
    ? byCategory.filter((p) => p.brandId === selectedBrandId)
    : byCategory;

  // Filter products by stock level
  const filteredProducts = useMemo(() => {
    if (stockFilter === "all") return byBrand;
    return byBrand.filter((p) => {
      if (stockFilter === "critical") return p.minStock > 0 && p.stock <= p.minStock;
      if (stockFilter === "medium") return p.midStock > 0 && p.stock <= p.midStock;
      return true;
    });
  }, [byBrand, stockFilter]);

  // Reset render limit when filters change
  useEffect(() => {
    setRenderCount(RENDER_BATCH);
  }, [search, selectedCategoryId, selectedBrandId, stockFilter]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || renderCount >= filteredProducts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRenderCount((prev) => Math.min(prev + RENDER_BATCH, filteredProducts.length));
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredProducts.length, renderCount]);

  const selectedProduct = selectedProductId
    ? storeProducts.find((p) => p.id === selectedProductId) ?? null
    : null;

  const productExportColumns: ExportColumn[] = [
    { header: "Código", key: "codigo" },
    { header: "Nombre", key: "nombre" },
    { header: "Precio", key: "precio" },
    ...(isUnlocked ? [{ header: "Costo", key: "costo" }] : []),
    { header: "Stock", key: "stock" },
    { header: "Marca", key: "marca" },
    { header: "Categoría", key: "categoria" },
  ];

  const exportProductData = useCallback(() => {
    const data = filteredProducts.map((p) => {
      const catName = p.category_id != null ? catById.get(p.category_id)?.name : undefined;
      const brandName = p.brandId != null ? brandById.get(p.brandId) : undefined;
      return {
        codigo: p.barcode ?? "—",
        nombre: p.name,
        precio: `$${p.price.toFixed(2)}`,
        ...(isUnlocked ? { costo: `$${p.costPrice.toFixed(2)}` } : {}),
        stock: p.stock,
        marca: brandName ?? "—",
        categoria: catName ?? "—",
      };
    });
    exportTableToPdf(data, productExportColumns, "Productos");
  }, [filteredProducts, catById, brandById, isUnlocked]);

  const exportProductExcel = useCallback(() => {
    const data = filteredProducts.map((p) => {
      const catName = p.category_id != null ? catById.get(p.category_id)?.name : undefined;
      const brandName = p.brandId != null ? brandById.get(p.brandId) : undefined;
      return {
        codigo: p.barcode ?? "",
        nombre: p.name,
        precio: p.price,
        ...(isUnlocked ? { costo: p.costPrice } : {}),
        stock: p.stock,
        marca: brandName ?? "",
        categoria: catName ?? "",
      };
    });
    exportToExcel(data, productExportColumns, "Productos");
  }, [filteredProducts, catById, brandById, isUnlocked]);

  function handleProductSelect(id: number) {
    setSelectedProductId(id);
    setCenterView({ kind: "list" });
  }

  function handleCancel() {
    setCenterView({ kind: "list" });
  }

  function handleSaved() {
    setCenterView({ kind: "list" });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* ── Product list / form ── */}
      <section className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-3 overflow-y-auto">
        {centerView.kind === "list" && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
                Productos
                {(selectedCategoryId || selectedBrandId) && (
                  <span className="text-pos-muted font-normal normal-case ml-1">
                    (filtrados)
                  </span>
                )}
                <span className="text-pos-muted font-normal normal-case ml-1">
                  — {filteredProducts.length}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {filteredProducts.length > 0 && (
                  <>
                    <button
                      onClick={exportProductExcel}
                      className="text-xs px-3 py-1.5 border border-pos-muted/30 text-pos-text rounded-lg touch-target hover:bg-pos-background/50"
                    >
                      Excel
                    </button>
                    <button
                      onClick={exportProductData}
                      className="text-xs px-3 py-1.5 border border-pos-muted/30 text-pos-text rounded-lg touch-target hover:bg-pos-background/50"
                    >
                      PDF
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowImport(true)}
                  className="text-xs px-3 py-1.5 border border-pos-muted/30 text-pos-text rounded-lg touch-target hover:bg-pos-background/50"
                >
                  + Importar
                </button>
                <button
                  onClick={() => setCenterView({ kind: "create" })}
                  className="text-xs px-3 py-1.5 bg-pos-secondary text-white rounded-lg touch-target hover:opacity-90"
                >
                  + Agregar Producto
                </button>
              </div>
            </div>

            {/* Search + stock filter */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o código de barras…"
                className="flex-1 border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
              />
              <button
                onClick={() => {
                  if (stockFilter === "all") setStockFilter("critical");
                  else if (stockFilter === "critical") setStockFilter("medium");
                  else setStockFilter("all");
                }}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium touch-target transition-all border ${
                  stockFilter === "critical"
                    ? "bg-pos-danger/10 border-pos-danger/40 text-pos-danger ring-1 ring-pos-danger/20"
                    : stockFilter === "medium"
                      ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-600 ring-1 ring-yellow-500/20"
                      : "border-pos-muted/20 text-pos-muted hover:border-pos-muted/40 hover:text-pos-text"
                }`}
              >
                {stockFilter === "critical"
                  ? "🔴 Crítico"
                  : stockFilter === "medium"
                    ? "🟡 Medio"
                    : "📊 Stock"}
              </button>
            </div>

            {/* Bulk actions */}
            {selectedProductIds.length > 0 && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-pos-secondary/10 border border-pos-secondary/30 rounded-lg">
                <span className="text-xs font-medium text-pos-text mr-1">
                  {selectedProductIds.length} seleccionado{selectedProductIds.length !== 1 ? "s" : ""}
                </span>

                <button
                  onClick={() => setShowBulkPrice(true)}
                  className="text-xs px-2.5 py-1.5 bg-pos-accent text-white rounded-lg touch-target hover:opacity-90"
                >
                  +% Precio
                </button>

                <button
                  onClick={() => setShowBulkCategory(true)}
                  className="text-xs px-2.5 py-1.5 bg-pos-secondary text-white rounded-lg touch-target hover:opacity-90"
                >
                  Categoría
                </button>

                <button
                  onClick={() => setShowBulkDelete(true)}
                  className="text-xs px-2.5 py-1.5 bg-pos-danger text-white rounded-lg touch-target hover:opacity-90"
                >
                  Eliminar
                </button>

                <button
                  onClick={() => setSelectedProductIds([])}
                  className="text-xs px-2.5 py-1.5 border border-pos-muted/30 text-pos-muted rounded-lg touch-target hover:bg-pos-background/50 ml-auto"
                >
                  Limpiar
                </button>
              </div>
            )}

            {/* Product table */}
            {filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-pos-muted italic">
                  {selectedCategoryId
                    ? "No hay productos en esta categoría"
                    : "Todavía no hay productos. Hacé clic en \"+ Agregar Producto\" para crear uno."}
                </p>
              </div>
            ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-xm">
                    <thead>
                    <tr className="text-pos-muted border-b border-pos-muted/20 ">
                      <th className="w-8 py-2 pr-1">
                        <input
                          type="checkbox"
                          checked={
                            filteredProducts.length > 0 &&
                            selectedProductIds.length === filteredProducts.length
                          }
                          onChange={() => {
                            if (selectedProductIds.length === filteredProducts.length) {
                              setSelectedProductIds([]);
                            } else {
                              setSelectedProductIds(filteredProducts.map((p) => p.id));
                            }
                          }}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="text-left py-2 pr-2 font-medium font-mono text-xs">
                        Código
                      </th>
                      <th className="text-left py-2 px-2 font-medium">
                        Nombre
                      </th>
                      <th className="text-right py-2 px-2 font-medium">
                        Precio
                      </th>
                      {isUnlocked && (
                        <th className="text-right py-2 px-2 font-medium">
                          Costo
                        </th>
                      )}
                      <th className="text-right py-2 px-2 font-medium">
                        Stock
                      </th>
                      <th className="text-left py-2 px-2 font-medium">
                        Marca
                      </th>
                      <th className="text-left py-2 px-2 font-medium">
                        Categoría
                      </th>
                      <th className="text-right py-2 pl-2 font-medium">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.slice(0, renderCount).map((p) => {
                      const catName = p.category_id != null ? catById.get(p.category_id)?.name : undefined;
                      const brandName = p.brandId != null ? brandById.get(p.brandId) : undefined;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => handleProductSelect(p.id)}
                          className={`border-b border-pos-muted/10 cursor-pointer transition-colors hover:bg-pos-background/50 ${
                            selectedProductId === p.id
                              ? "bg-pos-secondary/10"
                              : ""
                          }`}
                        >
                          <td className="w-8 py-2 pr-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(p.id)}
                              onChange={() => {
                                setSelectedProductIds((prev) =>
                                  prev.includes(p.id)
                                    ? prev.filter((id) => id !== p.id)
                                    : [...prev, p.id],
                                );
                              }}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="py-2 pr-2 text-pos-muted font-mono text-xs">
                            {p.barcode ?? "—"}
                          </td>
                          <td className="py-2 px-2 font-medium text-pos-text">
                            {p.name}
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            ${p.price.toFixed(2)}
                          </td>
                          {isUnlocked && (
                            <td className="py-2 px-2 text-right font-mono text-pos-muted">
                              ${p.costPrice.toFixed(2)}
                            </td>
                          )}
                          <td
                            className={`py-2 px-2 text-right font-mono font-bold ${
                              p.stock <= p.minStock && p.minStock > 0
                                ? "text-pos-danger"
                                : p.midStock > 0 && p.stock <= p.midStock
                                  ? "text-yellow-500"
                                  : "text-pos-success"
                            }`}
                          >
                            {editingStockId === p.id ? (
                              <input
                                type="number"
                                min={0}
                                value={editingStockVal}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "" || /^\d+$/.test(val)) {
                                    setEditingStockVal(val);
                                  }
                                }}
                                onBlur={() => {
                                  const qty = parseInt(editingStockVal, 10);
                                  if (!isNaN(qty) && qty >= 0 && qty !== p.stock) {
                                    adjustStock(p.id, qty, currentUser?.name);
                                  }
                                  setEditingStockId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                  if (e.key === "Escape") {
                                    setEditingStockId(null);
                                  }
                                }}
                                className="w-16 text-right text-xs font-bold font-mono bg-pos-background border border-pos-secondary rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-pos-secondary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingStockId(p.id);
                                  setEditingStockVal(String(p.stock));
                                }}
                                className="hover:bg-pos-background/50 px-1 -mx-1 rounded transition-colors cursor-text"
                              >
                                {p.stock}
                              </button>
                            )}
                            {editingStockId !== p.id && p.minStock > 0 && p.stock <= p.minStock && (
                              <span className="text-[10px] text-pos-muted ml-1">🔴</span>
                            )}
                            {editingStockId !== p.id && p.minStock > 0 && p.stock > p.minStock && p.midStock > 0 && p.stock <= p.midStock && (
                              <span className="text-[10px] text-pos-muted ml-1">🟡</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-pos-muted text-xs truncate max-w-[100px]">
                            {brandName ?? "—"}
                          </td>
                          <td className="py-2 px-2 text-pos-muted text-xs truncate max-w-[100px]">
                            {catName ?? "—"}
                          </td>
                          <td className="py-2 pl-2 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCenterView({ kind: "edit", product: p });
                              }}
                              className="text-xs px-2 py-1 text-pos-secondary hover:bg-pos-secondary/10 rounded touch-target"
                              aria-label="Editar producto"
                            >
                              ✎ Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Sentinel for infinite scroll */}
                <div
                  ref={sentinelRef}
                  className="flex items-center justify-center py-3 text-xs text-pos-muted/40"
                >
                  {renderCount < filteredProducts.length
                    ? `${filteredProducts.length - renderCount} más… seguí scrolleando`
                    : filteredProducts.length > RENDER_BATCH
                      ? `Mostrando ${filteredProducts.length} productos`
                      : ""}
                </div>
              </div>
            )}
          </>
        )}

        {centerView.kind === "create" && (
          <ProductForm
            editProduct={null}
            onSaved={handleSaved}
            onCancel={handleCancel}
            scannedBarcode={scannedBarcode}
          />
        )}

        {centerView.kind === "edit" && (
          <ProductForm
            editProduct={centerView.product}
            onSaved={handleSaved}
            onCancel={handleCancel}
            scannedBarcode={scannedBarcode}
          />
        )}

        {centerView.kind === "edit-category" && (
          <EditCategoryForm
            category={centerView.category}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        )}
      </section>

      {/* ── Right panel: Stock movement log ── */}
      <aside className="w-full lg:w-80 flex-shrink-0 bg-pos-surface rounded-xl border border-pos-muted/10 p-3 overflow-y-auto max-h-48 lg:max-h-full">
        <StockMovementLog
          product={selectedProduct}
          emptyState={
            <p className="text-xs text-pos-muted italic">
              Select a product to view stock movements
            </p>
          }
        />
      </aside>

      {/* ── Import Products Modal ── */}
      {showImport && (
        <ImportProductsModal
          onClose={() => setShowImport(false)}
          onImported={() => setShowImport(false)}
        />
      )}

      {/* ── Bulk Price Modal ── */}
      {showBulkPrice && (
        <BulkPriceIncreaseModal
          products={storeProducts}
          selectedIds={selectedProductIds}
          onApply={(pct) => {
            for (const id of selectedProductIds) {
              const prod = products.find((p) => p.id === id);
              if (prod) {
                const newPrice = Math.round(prod.price * (1 + pct / 100) * 100) / 100;
                updateProduct(id, { price: newPrice, store_id: storeId });
              }
            }
            setSelectedProductIds([]);
          }}
          onClose={() => setShowBulkPrice(false)}
        />
      )}

      {/* ── Bulk Category Modal ── */}
      {showBulkCategory && (
        <BulkCategoryModal
          categories={storeCategories}
          selectedIds={selectedProductIds}
          currentCategoryId={null}
          onApply={(catId) => {
            for (const id of selectedProductIds) {
              updateProduct(id, { category_id: catId, store_id: storeId });
            }
            setSelectedProductIds([]);
          }}
          onClose={() => setShowBulkCategory(false)}
        />
      )}

      {/* ── Bulk Delete Confirmation ── */}
      {showBulkDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowBulkDelete(false)}
        >
          <div
            className="w-full max-w-sm bg-pos-surface rounded-2xl shadow-2xl border border-pos-muted/10 mx-4 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-5xl mb-4">🗑️</div>
              <h3 className="text-base font-bold text-pos-text mb-1">
                Eliminar Productos
              </h3>
              <p className="text-sm text-pos-muted/70 mb-6">
                ¿Eliminar {selectedProductIds.length} producto
                {selectedProductIds.length !== 1 ? "s" : ""}? No se puede
                deshacer.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDelete(false)}
                className="flex-1 px-4 py-2.5 border border-pos-muted/20 text-pos-muted rounded-xl text-sm font-medium touch-target hover:bg-pos-background/50 hover:text-pos-text transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  for (const id of selectedProductIds) {
                    deleteProduct(id);
                  }
                  setSelectedProductIds([]);
                  setShowBulkDelete(false);
                }}
                className="flex-1 px-4 py-2.5 bg-pos-danger text-white rounded-xl text-sm font-bold touch-target transition-all hover:shadow-lg"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Inline: Edit Category form
// ──────────────────────────────────────────────

function EditCategoryForm({
  category,
  onSaved,
  onCancel,
}: {
  category: Category;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const updateCategory = useProductsStore((s) => s.updateCategory);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("El nombre de la categoría no puede estar vacío");
      return;
    }

    try {
      updateCategory(category.id, { name: trimmed });
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar la categoría",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
        Editar Categoría
      </h2>

      {error && (
        <div className="bg-pos-danger/10 border border-pos-danger/30 text-pos-danger text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="edit-cat-name"
          className="block text-sm font-medium text-pos-text mb-1"
        >
          Nombre
        </label>
        <input
          id="edit-cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-pos-secondary text-white rounded-lg font-medium text-sm touch-target hover:opacity-90"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-pos-muted/30 text-pos-text rounded-lg font-medium text-sm touch-target hover:bg-pos-background"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
