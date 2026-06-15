import { useState } from "react";
import { useActiveStore } from "@/store/context";
import { useProductsStore, type Product, type Category } from "@/store/products";
import CategoryTree from "@/components/CategoryTree";
import BrandList from "@/components/BrandList";
import ProductForm from "@/components/ProductForm";
import StockMovementLog from "@/components/StockMovementLog";

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

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [centerView, setCenterView] = useState<CenterView>({ kind: "list" });

  const storeProducts = products.filter((p) => p.store_id === storeId);
  const storeCategories = categories.filter((c) => c.store_id === storeId);

  // Filter products by selected category (include subcategory products)
  const filteredProducts = selectedCategoryId
    ? storeProducts.filter((p) => {
        // Check if product's category is the selected one or a descendant
        const descendantIds = new Set<number>();
        const collectDescendants = (parentId: number) => {
          storeCategories
            .filter((c) => c.parent_id === parentId)
            .forEach((c) => {
              descendantIds.add(c.id);
              collectDescendants(c.id);
            });
        };
        collectDescendants(selectedCategoryId);
        descendantIds.add(selectedCategoryId);

        return p.category_id !== null && descendantIds.has(p.category_id);
      })
    : storeProducts;

  const selectedProduct = selectedProductId
    ? storeProducts.find((p) => p.id === selectedProductId) ?? null
    : null;

  function handleCategoryEdit(cat: Category) {
    setCenterView({ kind: "edit-category", category: cat });
  }

  function handleCategorySelect(id: number | null) {
    setSelectedCategoryId(id);
    setSelectedProductId(null);
    setCenterView({ kind: "list" });
  }

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
      {/* ── Left panel: Category tree + Brands ── */}
      <aside className="w-full lg:w-64 flex-shrink-0 bg-pos-surface rounded-xl border border-pos-muted/10 p-3 overflow-y-auto max-h-48 lg:max-h-full">
        <CategoryTree
          selectedId={selectedCategoryId}
          onSelect={handleCategorySelect}
          onEdit={handleCategoryEdit}
        />
        <hr className="my-3 border-pos-muted/20" />
        <BrandList />
      </aside>

      {/* ── Center panel: Product list / form ── */}
      <section className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-3 overflow-y-auto">
        {centerView.kind === "list" && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
                Productos
                {selectedCategoryId && (
                  <span className="text-pos-muted font-normal normal-case ml-1">
                    (filtrados)
                  </span>
                )}
                <span className="text-pos-muted font-normal normal-case ml-1">
                  — {filteredProducts.length}
                </span>
              </h2>
              <button
                onClick={() => setCenterView({ kind: "create" })}
                className="text-xs px-3 py-1.5 bg-pos-secondary text-white rounded-lg touch-target hover:opacity-90"
              >
                + Agregar Producto
              </button>
            </div>

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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-pos-muted border-b border-pos-muted/20">
                      <th className="text-left py-2 pr-2 font-medium">Nombre</th>
                      <th className="text-left py-2 px-2 font-medium">
                        Código
                      </th>
                      <th className="text-right py-2 px-2 font-medium">
                        Precio
                      </th>
                      <th className="text-right py-2 px-2 font-medium">
                        Stock
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
                    {filteredProducts.map((p) => {
                      const cat = storeCategories.find(
                        (c) => c.id === p.category_id,
                      );
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
                          <td className="py-2 pr-2 font-medium text-pos-text">
                            {p.name}
                          </td>
                          <td className="py-2 px-2 text-pos-muted font-mono text-xs">
                            {p.barcode ?? "—"}
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            ${p.price.toFixed(2)}
                          </td>
                          <td
                            className={`py-2 px-2 text-right font-mono font-bold ${
                              p.stock < 0
                                ? "text-pos-danger"
                                : "text-pos-success"
                            }`}
                          >
                            {p.stock}
                          </td>
                          <td className="py-2 px-2 text-pos-muted text-xs truncate max-w-[100px]">
                            {cat?.name ?? "—"}
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
              </div>
            )}
          </>
        )}

        {centerView.kind === "create" && (
          <ProductForm
            editProduct={null}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        )}

        {centerView.kind === "edit" && (
          <ProductForm
            editProduct={centerView.product}
            onSaved={handleSaved}
            onCancel={handleCancel}
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
