import { useState, useEffect } from "react";
import {
  useProductsStore,
  type Product,
  type Category,
} from "@/store/products";
import { useBrandsStore } from "@/store/brands";
import { useAdminStore } from "@/store/admin";
import { useActiveStore } from "@/store/context";

// ──────────────────────────────────────────────
// Form state
// ──────────────────────────────────────────────

type FormData = {
  name: string;
  barcode: string;
  price: string;
  costPrice: string;
  brandId: string; // string because select value
  category_id: string; // string because select value
};

const INITIAL_FORM: FormData = {
  name: "",
  barcode: "",
  price: "0",
  costPrice: "0",
  brandId: "",
  category_id: "",
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function flattenCategories(
  cats: Category[],
  parentId: number | null,
  depth: number,
  result: { id: number; label: string }[],
): { id: number; label: string }[] {
  cats
    .filter((c) => c.parent_id === parentId)
    .forEach((c) => {
      result.push({
        id: c.id,
        label: `${"  ".repeat(depth)}${c.name}`,
      });
      flattenCategories(cats, c.id, depth + 1, result);
    });
  return result;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

interface ProductFormProps {
  editProduct: Product | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function ProductForm({
  editProduct,
  onSaved,
  onCancel,
}: ProductFormProps) {
  const { storeId } = useActiveStore();
  const categories = useProductsStore((s) => s.categories);
  const addProduct = useProductsStore((s) => s.addProduct);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const brands = useBrandsStore((s) => s.brands);
  const isUnlocked = useAdminStore((s) => s.isUnlocked);

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const storeCategories = categories.filter((c) => c.store_id === storeId);
  const flatCategories = flattenCategories(storeCategories, null, 0, []);
  const storeBrands = brands
    .filter((b) => b.store_id === storeId)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Populate form when editing
  useEffect(() => {
    if (editProduct) {
      setForm({
        name: editProduct.name,
        barcode: editProduct.barcode ?? "",
        price: String(editProduct.price),
        costPrice: String(editProduct.costPrice),
        brandId: editProduct.brandId != null ? String(editProduct.brandId) : "",
        category_id: editProduct.category_id != null ? String(editProduct.category_id) : "",
      });
      setError(null);
    } else {
      setForm(INITIAL_FORM);
      setError(null);
    }
  }, [editProduct]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = form.name.trim();
    if (!trimmed) {
      setError("El nombre del producto es obligatorio");
      return;
    }

    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      setError("El precio debe ser un número no negativo");
      return;
    }

    const categoryId = form.category_id ? Number(form.category_id) : null;
    const costPrice = parseFloat(form.costPrice);
    const brandId = form.brandId ? Number(form.brandId) : null;

    if (isNaN(costPrice) || costPrice < 0) {
      setError("El costo debe ser un número no negativo");
      return;
    }

    setSaving(true);
    try {
      if (editProduct) {
        updateProduct(editProduct.id, {
          name: trimmed,
          barcode: form.barcode.trim() || null,
          price,
          costPrice,
          brandId,
          category_id: categoryId,
          store_id: storeId,
        });
      } else {
        addProduct({
          name: trimmed,
          barcode: form.barcode.trim() || null,
          price,
          costPrice,
          brandId,
          stock: 0,
          category_id: categoryId,
          store_id: storeId,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el producto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
        {editProduct ? "Editar Producto" : "Nuevo Producto"}
      </h2>

      {/* Error */}
      {error && (
        <div className="bg-pos-danger/10 border border-pos-danger/30 text-pos-danger text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label
          htmlFor="product-name"
          className="block text-sm font-medium text-pos-text mb-1"
        >
          Nombre *
        </label>
        <input
          id="product-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nombre del producto"
          required
          className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
        />
      </div>

      {/* Barcode */}
      <div>
        <label
          htmlFor="product-barcode"
          className="block text-sm font-medium text-pos-text mb-1"
        >
          Código de barras
          <span className="text-pos-muted ml-1">(opcional)</span>
        </label>
        <input
          id="product-barcode"
          value={form.barcode}
          onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          placeholder="ej. 77912345"
          className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
        />
      </div>

      {/* Price */}
      <div>
        <label
          htmlFor="product-price"
          className="block text-sm font-medium text-pos-text mb-1"
        >
          Precio
        </label>
        <input
          id="product-price"
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
        />
      </div>

      {/* Cost Price (admin only) */}
      {isUnlocked && (
        <div>
          <label
            htmlFor="product-cost-price"
            className="block text-sm font-medium text-pos-text mb-1"
          >
            Cost Price
            <span className="text-pos-muted ml-1">(opcional)</span>
          </label>
          <input
            id="product-cost-price"
            type="number"
            min="0"
            step="0.01"
            value={form.costPrice}
            onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
          />
        </div>
      )}

      {/* Brand (admin only) */}
      {isUnlocked && (
        <div>
          <label
            htmlFor="product-brand"
            className="block text-sm font-medium text-pos-text mb-1"
          >
            Brand
            <span className="text-pos-muted ml-1">(opcional)</span>
          </label>
          <select
            id="product-brand"
            value={form.brandId}
            onChange={(e) => setForm({ ...form, brandId: e.target.value })}
            className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
          >
            <option value="">— No brand —</option>
            {storeBrands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Category */}
      <div>
        <label
          htmlFor="product-category"
          className="block text-sm font-medium text-pos-text mb-1"
        >
          Categoría
          <span className="text-pos-muted ml-1">(opcional)</span>
        </label>
        <select
          id="product-category"
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
        >
          <option value="">— Sin categoría —</option>
          {flatCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-4 py-2 bg-pos-secondary text-white rounded-lg font-medium text-sm touch-target hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Guardando..." : editProduct ? "Actualizar Producto" : "Crear Producto"}
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
