import { useState, useEffect, useMemo } from "react";
import { useActiveStore } from "@/store/context";
import { useProveedoresStore } from "@/store/proveedores";
import { useProductsStore } from "@/store/products";
import { usePedidosStore, type Pedido } from "@/store/pedidos";

interface ItemRow {
  key: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface PedidoFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

let nextItemKey = 1;

export default function PedidoForm({ onSaved, onCancel }: PedidoFormProps) {
  const { storeId } = useActiveStore();
  const proveedores = useProveedoresStore((s) => s.proveedores);
  const products = useProductsStore((s) => s.products);
  const addPedido = usePedidosStore((s) => s.addPedido);

  const [proveedorId, setProveedorId] = useState<number | "">("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    { key: nextItemKey++, product_id: null, product_name: "", quantity: 1, unit_price: 0, subtotal: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const storeProveedores = useMemo(
    () => proveedores.filter((p) => p.store_id === storeId).sort((a, b) => a.name.localeCompare(b.name)),
    [proveedores, storeId],
  );

  const storeProducts = useMemo(
    () => products.filter((p) => p.store_id === storeId),
    [products, storeId],
  );

  const total = useMemo(
    () => Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100,
    [items],
  );

  function addRow() {
    setItems([
      ...items,
      { key: nextItemKey++, product_id: null, product_name: "", quantity: 1, unit_price: 0, subtotal: 0 },
    ]);
  }

  function removeRow(key: number) {
    if (items.length <= 1) return;
    setItems(items.filter((r) => r.key !== key));
  }

  function updateRow(key: number, field: keyof ItemRow, value: string | number | null) {
    setItems(
      items.map((r) => {
        if (r.key !== key) return r;

        const updated = { ...r, [field]: value };

        if (field === "product_id" && typeof value === "number") {
          const prod = storeProducts.find((p) => p.id === value);
          if (prod) {
            updated.product_name = prod.name;
            updated.unit_price = prod.costPrice;
          }
        }

        if (field === "quantity" || field === "unit_price") {
          updated.subtotal = Math.round(updated.quantity * updated.unit_price * 100) / 100;
        }

        return updated;
      }),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!proveedorId) {
      setError("Seleccioná un proveedor");
      return;
    }

    const validItems = items.filter((r) => r.product_name.trim() && r.quantity > 0);
    if (validItems.length === 0) {
      setError("Agregá al menos un producto con cantidad mayor a 0");
      return;
    }

    const proveedor = storeProveedores.find((p) => p.id === proveedorId);
    if (!proveedor) {
      setError("Proveedor no encontrado");
      return;
    }

    setSaving(true);
    try {
      addPedido({
        proveedor_id: proveedor.id,
        proveedor_name: proveedor.name,
        date,
        notes,
        store_id: storeId,
        items: validItems.map((r) => ({
          product_id: r.product_id,
          product_name: r.product_name,
          quantity: r.quantity,
          unit_price: r.unit_price,
          subtotal: r.subtotal,
        })),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el pedido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
        Nuevo Pedido
      </h3>

      {error && (
        <div className="bg-pos-danger/10 border border-pos-danger/30 text-pos-danger text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="ped-proveedor" className="block text-sm font-medium text-pos-text mb-1">
            Proveedor <span className="text-pos-danger">*</span>
          </label>
          <select
            id="ped-proveedor"
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value ? Number(e.target.value) : "")}
            required
            className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
          >
            <option value="">Seleccionar proveedor…</option>
            {storeProveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ped-date" className="block text-sm font-medium text-pos-text mb-1">
            Fecha
          </label>
          <input
            id="ped-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
          />
        </div>

        <div>
          <label htmlFor="ped-notes" className="block text-sm font-medium text-pos-text mb-1">
            Notas
          </label>
          <input
            id="ped-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas del pedido"
            className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
          />
        </div>
      </div>

      {/* Items table */}
      <div className="bg-pos-background/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-pos-text">Productos</label>
          <button
            type="button"
            onClick={addRow}
            className="text-xs px-3 py-1.5 bg-pos-secondary text-white rounded-lg touch-target hover:opacity-90"
          >
            + Agregar producto
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-pos-muted border-b border-pos-muted/20">
                <th className="text-left py-1 pr-1 font-medium w-1/3">Producto</th>
                <th className="text-left py-1 px-1 font-medium w-16">Cant</th>
                <th className="text-left py-1 px-1 font-medium w-20">P. Unit</th>
                <th className="text-left py-1 px-1 font-medium w-20">Subtotal</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.key} className="border-b border-pos-muted/10">
                  <td className="py-1 pr-1">
                    <select
                      value={row.product_id ?? ""}
                      onChange={(e) =>
                        updateRow(row.key, "product_id", e.target.value ? Number(e.target.value) : null)
                      }
                      className="w-full border border-pos-muted/30 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-pos-secondary"
                    >
                      <option value="">Seleccionar…</option>
                      {storeProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${p.costPrice.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 px-1">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={row.quantity}
                      onChange={(e) =>
                        updateRow(row.key, "quantity", Math.max(0, Number(e.target.value)))
                      }
                      className="w-full border border-pos-muted/30 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-pos-secondary"
                    />
                  </td>
                  <td className="py-1 px-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.unit_price}
                      onChange={(e) =>
                        updateRow(row.key, "unit_price", Math.max(0, Number(e.target.value)))
                      }
                      className="w-full border border-pos-muted/30 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-pos-secondary"
                    />
                  </td>
                  <td className="py-1 px-1 text-right font-mono text-xs text-pos-text">
                    ${row.subtotal.toFixed(2)}
                  </td>
                  <td className="py-1 pl-1">
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      disabled={items.length <= 1}
                      className="text-xs px-1.5 py-1 text-pos-danger hover:bg-pos-danger/10 rounded touch-target disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-right mt-2 font-semibold text-pos-text">
          Total: ${total.toFixed(2)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-pos-secondary text-white rounded-lg font-medium text-sm touch-target hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Crear Pedido"}
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
