import { useState, useMemo, useCallback, useRef } from "react";
import { useActiveStore } from "@/store/context";
import { useCustomersStore } from "@/store/customers";
import { useProductsStore } from "@/store/products";
import { useComprobantesStore, type Comprobante, type ComprobanteTipo, getTipoLabel } from "@/store/comprobantes";
import { exportTableToPdf, exportToExcel, type ExportColumn } from "@/lib/export-utils";
import { useAppStore } from "@/store";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type View =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "detail"; comprobante: Comprobante };

type ItemRow = {
  key: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

const TIPO_OPTIONS: { id: ComprobanteTipo; label: string; desc: string }[] = [
  { id: "factura", label: "Factura", desc: "Con IVA y CUIT del cliente" },
  { id: "boleta", label: "Boleta", desc: "Comprobante simple" },
  { id: "nota_credito", label: "Nota de Crédito", desc: "Anula parcial/total una factura" },
  { id: "nota_debito", label: "Nota de Débito", desc: "Incrementa el monto de una factura" },
  { id: "ticket", label: "Ticket", desc: "Comprobante térmico" },
];

const TIPO_COLORS: Record<ComprobanteTipo, string> = {
  factura: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
  boleta: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
  nota_credito: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30",
  nota_debito: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30",
  ticket: "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30",
};

let nextItemKey = 1;

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ComprobantesPage() {
  const { storeId } = useActiveStore();
  const comprobantes = useComprobantesStore((s) => s.comprobantes);
  const [view, setView] = useState<View>({ kind: "list" });
  const [search, setSearch] = useState("");

  const storeComprobantes = useMemo(
    () => comprobantes.filter((c) => c.store_id === storeId).sort((a, b) => b.id - a.id),
    [comprobantes, storeId],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return storeComprobantes;
    const q = search.toLowerCase();
    return storeComprobantes.filter(
      (c) =>
        c.numero.toLowerCase().includes(q) ||
        c.cliente_nombre.toLowerCase().includes(q) ||
        c.tipo.toLowerCase().includes(q),
    );
  }, [storeComprobantes, search]);

  const columns: ExportColumn[] = [
    { header: "N°", key: "numero" },
    { header: "Tipo", key: "tipo" },
    { header: "Cliente", key: "cliente" },
    { header: "Fecha", key: "fecha" },
    { header: "Total", key: "total" },
  ];

  const exportPdf = useCallback(() => {
    const data = filtered.map((c) => ({
      numero: c.numero,
      tipo: getTipoLabel(c.tipo),
      cliente: c.cliente_nombre,
      fecha: new Date(c.fecha).toLocaleDateString("es-AR"),
      total: `$${c.total.toFixed(2)}`,
    }));
    exportTableToPdf(data, columns, "Comprobantes");
  }, [filtered]);

  const exportExcel = useCallback(() => {
    const data = filtered.map((c) => ({
      numero: c.numero,
      tipo: getTipoLabel(c.tipo),
      cliente: c.cliente_nombre,
      fecha: c.fecha,
      total: c.total,
    }));
    exportToExcel(data, columns, "Comprobantes");
  }, [filtered]);

  function handleCancel() { setView({ kind: "list" }); }
  function handleSaved() { setView({ kind: "list" }); }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-pos-text">Comprobantes</h1>
        {view.kind === "list" && (
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <>
                <button onClick={exportExcel} className="text-xs px-3 py-1.5 border border-pos-muted/30 text-pos-text rounded-lg touch-target hover:bg-pos-background/50 whitespace-nowrap">Excel</button>
                <button onClick={exportPdf} className="text-xs px-3 py-1.5 border border-pos-muted/30 text-pos-text rounded-lg touch-target hover:bg-pos-background/50 whitespace-nowrap">PDF</button>
              </>
            )}
            <button onClick={() => setView({ kind: "create" })} className="text-xs px-3 py-1.5 bg-pos-secondary text-white rounded-lg touch-target hover:opacity-90 whitespace-nowrap">+ Nuevo Comprobante</button>
          </div>
        )}
      </div>

      {view.kind === "list" && (
        <>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por número, tipo o cliente…" className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target" />
          <div className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-3 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-pos-muted italic text-center">
                  {search ? "No se encontraron comprobantes" : "Todavía no hay comprobantes. Creá uno desde '+ Nuevo Comprobante'."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-pos-muted border-b border-pos-muted/20">
                      <th className="text-left py-2 pr-2 font-medium">N°</th>
                      <th className="text-left py-2 px-2 font-medium">Tipo</th>
                      <th className="text-left py-2 px-2 font-medium">Cliente</th>
                      <th className="text-left py-2 px-2 font-medium">Fecha</th>
                      <th className="text-right py-2 px-2 font-medium">Total</th>
                      <th className="text-right py-2 pl-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} className="border-b border-pos-muted/10 transition-colors hover:bg-pos-background/50 cursor-pointer" onClick={() => setView({ kind: "detail", comprobante: c })}>
                        <td className="py-2 pr-2 font-mono text-xs text-pos-muted">{c.numero}</td>
                        <td className="py-2 px-2">
                          <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded-full ${TIPO_COLORS[c.tipo]}`}>
                            {getTipoLabel(c.tipo)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-pos-text">{c.cliente_nombre}</td>
                        <td className="py-2 px-2 text-pos-muted">{new Date(c.fecha).toLocaleDateString("es-AR")}</td>
                        <td className="py-2 px-2 text-right font-mono text-pos-text">${c.total.toFixed(2)}</td>
                        <td className="py-2 pl-2 text-right">
                          <button onClick={(e) => { e.stopPropagation(); setView({ kind: "detail", comprobante: c }); }} className="text-xs px-2 py-1 text-pos-secondary hover:bg-pos-secondary/10 rounded touch-target">Ver</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {view.kind === "create" && (
        <div className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-4 overflow-y-auto">
          <ComprobanteForm onSaved={handleSaved} onCancel={handleCancel} />
        </div>
      )}

      {view.kind === "detail" && (
        <div className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-4 overflow-y-auto">
          <ComprobanteDetail comprobante={view.comprobante} onBack={() => setView({ kind: "list" })} />
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// ComprobanteForm
// ──────────────────────────────────────────────

function ComprobanteForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const { storeId } = useActiveStore();
  const customers = useCustomersStore((s) => s.customers);
  const products = useProductsStore((s) => s.products);
  const createComprobante = useComprobantesStore((s) => s.createComprobante);
  const showNotification = useAppStore((s) => s.showNotification);

  const storeCustomers = useMemo(() => customers.filter((c) => c.store_id === storeId), [customers, storeId]);
  const storeProducts = useMemo(() => products.filter((p) => p.store_id === storeId), [products, storeId]);

  const [tipo, setTipo] = useState<ComprobanteTipo | null>(null);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteCuit, setClienteCuit] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [ivaPercent, setIvaPercent] = useState(21);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    { key: nextItemKey++, product_id: null, product_name: "", quantity: 1, unit_price: 0, subtotal: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Hooks must be BEFORE the early return (React rule)
  const filteredCustomers = useMemo(
    () => storeCustomers.filter((c) => c.name.toLowerCase().includes(clienteSearch.toLowerCase())),
    [storeCustomers, clienteSearch],
  );

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const calculatedIva = tipo === "factura" ? Math.round(subtotal * ivaPercent / 100 * 100) / 100 : 0;
  const calculatedTotal = Math.round((subtotal + calculatedIva) * 100) / 100;

  function selectCustomer(cust: typeof storeCustomers[0]) {
    setClienteId(cust.id);
    setClienteNombre(cust.name);
    setClienteCuit(cust.cuit);
    setClienteDireccion(cust.address);
    setClienteSearch(cust.name);
    setShowClientDropdown(false);
  }

  function addRow() {
    setItems([...items, { key: nextItemKey++, product_id: null, product_name: "", quantity: 1, unit_price: 0, subtotal: 0 }]);
  }

  function updateItem(key: number, field: keyof ItemRow, value: string | number | null) {
    setItems(items.map((r) => {
      if (r.key !== key) return r;
      const updated = { ...r, [field]: value };
      if (field === "product_id" && typeof value === "number") {
        const prod = storeProducts.find((p) => p.id === value);
        if (prod) { updated.product_name = prod.name; updated.unit_price = prod.price; }
      }
      if (field === "quantity" || field === "unit_price") {
        updated.subtotal = Math.round(updated.quantity * updated.unit_price * 100) / 100;
      }
      return updated;
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!tipo) { setError("Seleccioná un tipo de comprobante"); return; }
    if (!clienteNombre.trim()) { setError("Seleccioná un cliente"); return; }
    if (tipo === "factura" && !clienteCuit.trim()) { setError("Para factura necesitás el CUIT del cliente"); return; }

    const validItems = items.filter((r) => r.product_name.trim() && r.quantity > 0);
    if (validItems.length === 0) { setError("Agregá al menos un producto"); return; }

    setSaving(true);
    try {
      createComprobante({
        tipo,
        cliente_nombre: clienteNombre.trim() || "Consumidor Final",
        cliente_cuit: clienteCuit.trim(),
        cliente_direccion: clienteDireccion.trim(),
        notes,
        store_id: storeId,
        items: validItems.map((r) => ({
          product_id: r.product_id ?? undefined,
          product_name: r.product_name,
          quantity: r.quantity,
          unit_price: r.unit_price,
          subtotal: r.subtotal,
        })),
        ivaPercent: tipo === "factura" ? ivaPercent : 0,
      });
      showNotification("Comprobante creado");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el comprobante");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──

  if (!tipo) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide">Nuevo Comprobante</h3>
        <p className="text-sm text-pos-muted">Seleccioná el tipo de comprobante:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TIPO_OPTIONS.map((opt) => (
            <button key={opt.id} onClick={() => setTipo(opt.id)}
              className="flex flex-col items-start p-4 border-2 border-pos-muted/20 rounded-xl touch-target hover:border-pos-secondary hover:bg-pos-secondary/5 transition-all text-left"
            >
              <span className="text-sm font-bold text-pos-text">{opt.label}</span>
              <span className="text-xs text-pos-muted mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
          Nuevo {getTipoLabel(tipo)}
        </h3>
        <button type="button" onClick={() => setTipo(null)} className="text-xs text-pos-muted hover:text-pos-text">Cambiar tipo</button>
      </div>

      {error && <div className="bg-pos-danger/10 border border-pos-danger/30 text-pos-danger text-sm rounded-lg px-3 py-2">{error}</div>}

      {/* Cliente search — todos los comprobantes */}
      <div className="relative">
        <label className="block text-sm font-medium text-pos-text mb-1">
          Cliente {tipo === "factura" && <span className="text-pos-danger">*</span>}
        </label>
        <input type="text" value={clienteSearch} onChange={(e) => { setClienteSearch(e.target.value); setClienteId(null); setShowClientDropdown(true); }}
          onFocus={() => setShowClientDropdown(true)} onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
          placeholder="Buscá cliente por nombre…" className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target" />
        {showClientDropdown && !clienteId && filteredCustomers.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 bg-pos-surface border border-pos-muted/20 rounded-lg shadow-xl max-h-40 overflow-y-auto">
            {filteredCustomers.map((c) => (
              <button key={c.id} type="button" onMouseDown={() => selectCustomer(c)}
                className="w-full text-left px-3 py-2 text-sm text-pos-text hover:bg-pos-background/50 transition-colors">
                {c.name} {c.cuit ? <span className="text-pos-muted">({c.cuit})</span> : ""}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cliente datos (todos los comprobantes) */}
      {clienteId && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-pos-text mb-1">Nombre</label>
            <input type="text" value={clienteNombre} readOnly className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm bg-pos-background/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-pos-text mb-1">CUIT {tipo === "factura" && <span className="text-pos-danger">*</span>}</label>
            <input type="text" value={clienteCuit} onChange={(e) => setClienteCuit(e.target.value)} placeholder="XX-XXXXXXXX-X" className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-pos-text mb-1">Dirección</label>
            <input type="text" value={clienteDireccion} readOnly className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm bg-pos-background/50" />
          </div>
        </div>
      )}

      {/* Manual client name when no search result selected */}
      {!clienteId && !clienteSearch.trim() && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-pos-text mb-1">Cliente</label>
            <input type="text" value={clienteNombre} onChange={(e) => { setClienteNombre(e.target.value); setClienteId(null); }} placeholder="Consumidor Final" className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target" />
          </div>
          <div>
            <label className="block text-sm font-medium text-pos-text mb-1">CUIT</label>
            <input type="text" value={clienteCuit} onChange={(e) => setClienteCuit(e.target.value)} placeholder="Opcional" className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target" />
          </div>
        </div>
      )}

      {/* IVA % for factura */}
      {tipo === "factura" && (
        <div>
          <label className="block text-sm font-medium text-pos-text mb-1">IVA %</label>
          <select value={ivaPercent} onChange={(e) => setIvaPercent(Number(e.target.value))} className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target">
            <option value={21}>21%</option>
            <option value={10.5}>10.5%</option>
            <option value={27}>27%</option>
            <option value={0}>0%</option>
          </select>
        </div>
      )}

      {/* Items */}
      <div className="bg-pos-background/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-pos-text">Productos</label>
          <button type="button" onClick={addRow} className="text-xs px-3 py-1.5 bg-pos-secondary text-white rounded-lg touch-target hover:opacity-90">+ Agregar</button>
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
                <ProductSearchRow
                  key={row.key}
                  row={row}
                  allProducts={storeProducts}
                  onSelect={(key, prodId) => updateItem(key, "product_id", prodId)}
                  onChange={updateItem}
                  onRemove={() => setItems(items.filter((r) => r.key !== row.key))}
                  canRemove={items.length > 1}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-right mt-2 space-y-1">
          <div className="text-sm text-pos-muted">Subtotal: <span className="font-mono">${subtotal.toFixed(2)}</span></div>
          {tipo === "factura" && <div className="text-sm text-pos-muted">IVA ({ivaPercent}%): <span className="font-mono">$${calculatedIva.toFixed(2)}</span></div>}
          <div className="text-base font-bold text-pos-text">Total: <span className="font-mono">${calculatedTotal.toFixed(2)}</span></div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-pos-text mb-1">Notas</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target" />
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-pos-secondary text-white rounded-lg font-medium text-sm touch-target hover:opacity-90 disabled:opacity-50">
          {saving ? "Guardando…" : `Crear ${getTipoLabel(tipo)}`}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-pos-muted/30 text-pos-text rounded-lg font-medium text-sm touch-target hover:bg-pos-background">Cancelar</button>
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────
// ProductSearchRow (reusable)
// ──────────────────────────────────────────────

function ProductSearchRow({
  row, allProducts, onSelect, onChange, onRemove, canRemove,
}: {
  row: ItemRow;
  allProducts: { id: number; name: string; price: number }[];
  onSelect: (key: number, productId: number) => void;
  onChange: (key: number, field: keyof ItemRow, value: string | number | null) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [search, setSearch] = useState(row.product_name);
  const [showDropdown, setShowDropdown] = useState(false);
  const filtered = useMemo(() => allProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())), [allProducts, search]);

  function handleSelect(productId: number) {
    onSelect(row.key, productId);
    const prod = allProducts.find((p) => p.id === productId);
    if (prod) setSearch(prod.name);
    setShowDropdown(false);
  }

  return (
    <tr className="border-b border-pos-muted/10">
      <td className="py-1 pr-1 relative">
        <input type="text" value={row.product_id ? search : search} onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); if (row.product_id) onChange(row.key, "product_id", null); }}
          onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} placeholder="Buscá producto…"
          className="w-full border border-pos-muted/30 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-pos-secondary" />
        {showDropdown && !row.product_id && filtered.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 bg-pos-surface border border-pos-muted/20 rounded-lg shadow-xl max-h-40 overflow-y-auto">
            {filtered.map((p) => (
              <button key={p.id} type="button" onMouseDown={() => handleSelect(p.id)}
                className="w-full text-left px-3 py-1.5 text-sm text-pos-text hover:bg-pos-background/50 transition-colors">{p.name}</button>
            ))}
          </div>
        )}
      </td>
      <td className="py-1 px-1">
        <input type="number" inputMode="decimal" min="0" step="0.5" value={row.quantity}
          onChange={(e) => onChange(row.key, "quantity", Math.max(0, Number(e.target.value)))}
          className="w-full border border-pos-muted/30 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-pos-secondary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
      </td>
      <td className="py-1 px-1">
        <input type="number" inputMode="decimal" min="0" step="0.01" value={row.unit_price}
          onChange={(e) => onChange(row.key, "unit_price", Math.max(0, Number(e.target.value)))}
          className="w-full border border-pos-muted/30 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-pos-secondary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
      </td>
      <td className="py-1 px-1 text-right font-mono text-xs text-pos-text">${row.subtotal.toFixed(2)}</td>
      <td className="py-1 pl-1">
        <button type="button" onClick={onRemove} disabled={!canRemove}
          className="text-xs px-1.5 py-1 text-pos-danger hover:bg-pos-danger/10 rounded touch-target disabled:opacity-30">✕</button>
      </td>
    </tr>
  );
}

// ──────────────────────────────────────────────
// ComprobanteDetail
// ──────────────────────────────────────────────

function ComprobanteDetail({ comprobante, onBack }: { comprobante: Comprobante; onBack: () => void }) {
  const printableRef = useRef<HTMLDivElement>(null);

  const TIPO_BG: Record<ComprobanteTipo, string> = {
    factura: "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800",
    boleta: "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800",
    nota_credito: "bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800",
    nota_debito: "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800",
    ticket: "bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800",
  };

  function handlePrint() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><meta charset="utf-8"><title>${comprobante.numero}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; }
        h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
        .tipo { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { text-align: left; padding: 4px 2px; border-bottom: 1px solid #000; font-size: 11px; }
        td { padding: 3px 2px; }
        .num { text-align: right; }
        .footer { text-align: center; margin-top: 16px; border-top: 1px dashed #888; padding-top: 8px; font-size: 11px; }
      </style></head><body>
      <h1>${comprobante.tipo === "factura" ? "FACTURA" : comprobante.tipo === "boleta" ? "BOLETA" : comprobante.tipo === "nota_credito" ? "NOTA DE CRÉDITO" : comprobante.tipo === "nota_debito" ? "NOTA DE DÉBITO" : "TICKET"}</h1>
      <div class="tipo">${comprobante.numero}</div>
      <p>Fecha: ${new Date(comprobante.fecha).toLocaleDateString("es-AR")}</p>
      <p>Cliente: ${comprobante.cliente_nombre}</p>
      ${comprobante.cliente_cuit ? `<p>CUIT: ${comprobante.cliente_cuit}</p>` : ""}
      ${comprobante.cliente_direccion ? `<p>Dirección: ${comprobante.cliente_direccion}</p>` : ""}
      <table><thead><tr><th>Producto</th><th class="num">Cant</th><th class="num">P.Unit</th><th class="num">Subtotal</th></tr></thead><tbody>
      ${comprobante.items.map((i) => `<tr><td>${i.product_name}</td><td class="num">${i.quantity}</td><td class="num">$${i.unit_price.toFixed(2)}</td><td class="num">$${i.subtotal.toFixed(2)}</td></tr>`).join("")}
      </tbody></table>
      <div style="text-align:right;margin-top:8px;border-top:1px solid #000;padding-top:4px;">
        ${comprobante.iva > 0 ? `<p>Subtotal: $${comprobante.subtotal.toFixed(2)}</p><p>IVA: $${comprobante.iva.toFixed(2)}</p>` : ""}
        <p style="font-weight:bold;font-size:14px;">TOTAL: $${comprobante.total.toFixed(2)}</p>
        </div>
      ${comprobante.notes ? `<p>Notas: ${comprobante.notes}</p>` : ""}
      <div class="footer">${comprobante.numero}</div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide">Comprobante</h3>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="text-xs px-3 py-1.5 bg-pos-secondary text-white rounded-lg touch-target hover:opacity-90">🖨️ Imprimir</button>
          <button onClick={onBack} className="text-xs px-3 py-1.5 border border-pos-muted/30 text-pos-text rounded-lg touch-target hover:bg-pos-background">← Volver</button>
        </div>
      </div>

      <div ref={printableRef} className={`rounded-xl border-2 p-4 space-y-3 ${TIPO_BG[comprobante.tipo]}`}>
        <div className="text-center">
          <div className="text-lg font-bold text-pos-text uppercase tracking-wider">
            {comprobante.tipo === "factura" ? "FACTURA" : comprobante.tipo === "boleta" ? "BOLETA" : comprobante.tipo === "nota_credito" ? "NOTA DE CRÉDITO" : comprobante.tipo === "nota_debito" ? "NOTA DE DÉBITO" : "TICKET"}
          </div>
          <div className="text-sm font-mono text-pos-muted mt-0.5">{comprobante.numero}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-pos-muted">Fecha:</span> {new Date(comprobante.fecha).toLocaleDateString("es-AR")}</div>
          <div><span className="text-pos-muted">Cliente:</span> {comprobante.cliente_nombre}</div>
          {comprobante.cliente_cuit && <div><span className="text-pos-muted">CUIT:</span> {comprobante.cliente_cuit}</div>}
          {comprobante.cliente_direccion && <div className="col-span-2"><span className="text-pos-muted">Dirección:</span> {comprobante.cliente_direccion}</div>}
        </div>

        <table className="w-full text-sm">
          <thead><tr className="text-pos-muted border-b border-pos-muted/20">
            <th className="text-left py-1 pr-2 font-medium">Producto</th>
            <th className="text-right py-1 px-2 font-medium">Cant</th>
            <th className="text-right py-1 px-2 font-medium">P.Unit</th>
            <th className="text-right py-1 pl-2 font-medium">Subtotal</th>
          </tr></thead>
          <tbody>
            {comprobante.items.map((item) => (
              <tr key={item.id} className="border-b border-pos-muted/10">
                <td className="py-1 pr-2 text-pos-text">{item.product_name}</td>
                <td className="py-1 px-2 text-right font-mono">{item.quantity}</td>
                <td className="py-1 px-2 text-right font-mono">${item.unit_price.toFixed(2)}</td>
                <td className="py-1 pl-2 text-right font-mono">${item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right space-y-0.5 pt-2 border-t border-pos-muted/20">
          <div className="text-sm text-pos-muted">Subtotal: <span className="font-mono">${comprobante.subtotal.toFixed(2)}</span></div>
          {comprobante.iva > 0 && <div className="text-sm text-pos-muted">IVA: <span className="font-mono">$${comprobante.iva.toFixed(2)}</span></div>}
          <div className="text-base font-bold text-pos-text">Total: <span className="font-mono">${comprobante.total.toFixed(2)}</span></div>
        </div>

        {comprobante.notes && <p className="text-xs text-pos-muted">Notas: {comprobante.notes}</p>}
      </div>
    </div>
  );
}
