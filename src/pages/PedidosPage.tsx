import { useState, useMemo, useCallback } from "react";
import { useActiveStore } from "@/store/context";
import { usePedidosStore, type Pedido, getStatusLabel } from "@/store/pedidos";
import { exportTableToPdf, exportToExcel, type ExportColumn } from "@/lib/export-utils";
import PedidoForm from "@/components/PedidoForm";

type View =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "detail"; pedido: Pedido };

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30",
  received: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
  cancelled: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
};

export default function PedidosPage() {
  const { storeId } = useActiveStore();
  const pedidos = usePedidosStore((s) => s.pedidos);
  const updateStatus = usePedidosStore((s) => s.updateStatus);
  const deletePedido = usePedidosStore((s) => s.deletePedido);

  const [view, setView] = useState<View>({ kind: "list" });
  const [search, setSearch] = useState("");

  const storePedidos = useMemo(
    () =>
      pedidos
        .filter((p) => p.store_id === storeId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 200),
    [pedidos, storeId],
  );

  const filteredPedidos = useMemo(() => {
    if (!search.trim()) return storePedidos;
    const q = search.toLowerCase();
    return storePedidos.filter(
      (p) =>
        p.proveedor_name.toLowerCase().includes(q) ||
        p.id.toString().includes(q) ||
        p.status.toLowerCase().includes(q),
    );
  }, [storePedidos, search]);

  const columns: ExportColumn[] = [
    { header: "N°", key: "numero" },
    { header: "Proveedor", key: "proveedor" },
    { header: "Fecha", key: "fecha" },
    { header: "Estado", key: "estado" },
    { header: "Total", key: "total" },
  ];

  const exportPdf = useCallback(() => {
    const data = filteredPedidos.map((p) => ({
      numero: `#${p.id}`,
      proveedor: p.proveedor_name,
      fecha: new Date(p.date).toLocaleDateString("es-AR"),
      estado: getStatusLabel(p.status),
      total: `$${p.total.toFixed(2)}`,
    }));
    exportTableToPdf(data, columns, "Pedidos");
  }, [filteredPedidos]);

  const exportExcel = useCallback(() => {
    const data = filteredPedidos.map((p) => ({
      numero: p.id,
      proveedor: p.proveedor_name,
      fecha: p.date,
      estado: getStatusLabel(p.status),
      total: p.total,
    }));
    exportToExcel(data, columns, "Pedidos");
  }, [filteredPedidos]);

  function handleCancel() { setView({ kind: "list" }); }
  function handleSaved() { setView({ kind: "list" }); }

  function handleUpdateStatus(pedido: Pedido, status: Pedido["status"]) {
    if (pedido.status === "received" && status !== "received") {
      if (!window.confirm(`Este pedido ya fue recibido. ¿Cambiar el estado a "${getStatusLabel(status)}"?`)) return;
    }
    updateStatus(pedido.id, status);
  }

  function handleDelete(pedido: Pedido) {
    if (!window.confirm(`¿Eliminar pedido #${pedido.id} de ${pedido.proveedor_name}?`)) return;
    deletePedido(pedido.id);
  }

  function handleViewDetail(pedido: Pedido) {
    setView({ kind: "detail", pedido });
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-pos-text">Pedidos</h1>
        {view.kind === "list" && (
          <div className="flex items-center gap-2">
            {filteredPedidos.length > 0 && (
              <>
                <button
                  onClick={exportExcel}
                  className="text-xs px-3 py-1.5 border border-pos-muted/30 text-pos-text rounded-lg touch-target hover:bg-pos-background/50 whitespace-nowrap"
                >
                  Excel
                </button>
                <button
                  onClick={exportPdf}
                  className="text-xs px-3 py-1.5 border border-pos-muted/30 text-pos-text rounded-lg touch-target hover:bg-pos-background/50 whitespace-nowrap"
                >
                  PDF
                </button>
              </>
            )}
            <button
              onClick={() => setView({ kind: "create" })}
              className="text-xs px-3 py-1.5 bg-pos-secondary text-white rounded-lg touch-target hover:opacity-90 whitespace-nowrap"
            >
              + Nuevo Pedido
            </button>
          </div>
        )}
      </div>

      {view.kind === "list" && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por proveedor, N° de pedido o estado…"
            className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
          />

          <div className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-3 overflow-y-auto">
            {filteredPedidos.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-pos-muted italic text-center">
                  {search
                    ? "No se encontraron pedidos"
                    : "Todavía no hay pedidos. Hacé clic en '+ Nuevo Pedido' para crear uno."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-pos-muted border-b border-pos-muted/20">
                      <th className="text-left py-2 pr-1 font-medium w-14">N°</th>
                      <th className="text-left py-2 px-1 font-medium">Proveedor</th>
                      <th className="text-left py-2 px-1 font-medium">Fecha</th>
                      <th className="text-left py-2 px-1 font-medium">Estado</th>
                      <th className="text-right py-2 px-1 font-medium">Total</th>
                      <th className="text-right py-2 pl-1 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPedidos.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-pos-muted/10 transition-colors hover:bg-pos-background/50 cursor-pointer"
                        onClick={() => handleViewDetail(p)}
                      >
                        <td className="py-2 pr-1 font-mono text-xs text-pos-muted">#{p.id}</td>
                        <td className="py-2 px-1 font-medium text-pos-text">{p.proveedor_name}</td>
                        <td className="py-2 px-1 text-pos-muted">
                          {new Date(p.date).toLocaleDateString("es-AR")}
                        </td>
                        <td className="py-2 px-1">
                          <span
                            className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}
                          >
                            {getStatusLabel(p.status)}
                          </span>
                        </td>
                        <td className="py-2 px-1 text-right font-mono text-pos-text">
                          ${p.total.toFixed(2)}
                        </td>
                        <td className="py-2 pl-1 text-right whitespace-nowrap">
                          <select
                            value={p.status}
                            onChange={(e) => handleUpdateStatus(p, e.target.value as Pedido["status"])}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs border border-pos-muted/30 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-pos-secondary"
                          >
                            <option value="pending">Pendiente</option>
                            <option value="received">Recibido</option>
                            <option value="cancelled">Cancelado</option>
                          </select>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                            className="text-xs px-2 py-1 text-pos-danger hover:bg-pos-danger/10 rounded touch-target ml-1"
                          >
                            Eliminar
                          </button>
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
          <PedidoForm onSaved={handleSaved} onCancel={handleCancel} />
        </div>
      )}

      {view.kind === "detail" && (
        <div className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-4 overflow-y-auto">
          <DetailView pedido={view.pedido} onBack={() => setView({ kind: "list" })} />
        </div>
      )}
    </div>
  );
}

function DetailView({ pedido, onBack }: { pedido: Pedido; onBack: () => void }) {
  const STATUS_COLORS_DETAIL: Record<string, string> = {
    pending: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30",
    received: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
    cancelled: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
          Pedido #{pedido.id}
        </h3>
        <button
          onClick={onBack}
          className="text-xs px-3 py-1.5 border border-pos-muted/30 text-pos-text rounded-lg touch-target hover:bg-pos-background"
        >
          ← Volver
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-pos-muted">Proveedor:</span>{" "}
          <span className="text-pos-text font-medium">{pedido.proveedor_name}</span>
        </div>
        <div>
          <span className="text-pos-muted">Fecha:</span>{" "}
          <span className="text-pos-text">{new Date(pedido.date).toLocaleDateString("es-AR")}</span>
        </div>
        <div>
          <span className="text-pos-muted">Estado:</span>{" "}
          <span
            className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS_DETAIL[pedido.status]}`}
          >
            {getStatusLabel(pedido.status)}
          </span>
        </div>
        {pedido.notes && (
          <div className="col-span-2">
            <span className="text-pos-muted">Notas:</span>{" "}
            <span className="text-pos-text">{pedido.notes}</span>
          </div>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-pos-muted border-b border-pos-muted/20">
            <th className="text-left py-2 pr-2 font-medium">Producto</th>
            <th className="text-right py-2 px-2 font-medium">Cant</th>
            <th className="text-right py-2 px-2 font-medium">P. Unit</th>
            <th className="text-right py-2 pl-2 font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {pedido.items.map((item) => (
            <tr key={item.id} className="border-b border-pos-muted/10">
              <td className="py-2 pr-2 text-pos-text">{item.product_name}</td>
              <td className="py-2 px-2 text-right text-pos-muted">{item.quantity}</td>
              <td className="py-2 px-2 text-right font-mono text-pos-text">${item.unit_price.toFixed(2)}</td>
              <td className="py-2 pl-2 text-right font-mono text-pos-text">${item.subtotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold text-pos-text">
            <td colSpan={3} className="py-2 pr-2 text-right">Total</td>
            <td className="py-2 pl-2 text-right font-mono">${pedido.total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
