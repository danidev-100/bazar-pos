import { useState, useMemo, useCallback } from "react";
import { useActiveStore } from "@/store/context";
import { useCustomersStore, type Customer } from "@/store/customers";
import CustomerForm from "@/components/CustomerForm";
import CollectPaymentModal from "@/components/CollectPaymentModal";
import { exportTableToPdf, exportToExcel, type ExportColumn } from "@/lib/export-utils";

// ──────────────────────────────────────────────
// Views
// ──────────────────────────────────────────────

type View =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; customer: Customer };

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function CustomersPage() {
  const { storeId } = useActiveStore();
  const customers = useCustomersStore((s) => s.customers);
  const deleteCustomer = useCustomersStore((s) => s.deleteCustomer);

  const [view, setView] = useState<View>({ kind: "list" });
  const [search, setSearch] = useState("");
  const [collectCustomer, setCollectCustomer] = useState<Customer | null>(null);

  const storeCustomers = useMemo(
    () =>
      customers
        .filter((c) => c.store_id === storeId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [customers, storeId],
  );

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return storeCustomers;
    const q = search.toLowerCase();
    return storeCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.cuit.toLowerCase().includes(q),
    );
  }, [storeCustomers, search]);

  const customerColumns: ExportColumn[] = [
    { header: "Nombre", key: "nombre" },
    { header: "Teléfono", key: "telefono" },
    { header: "Email", key: "email" },
    { header: "CUIT", key: "cuit" },
    { header: "Dirección", key: "direccion" },
    { header: "Saldo", key: "saldo" },
  ];

  const exportCustomersPdf = useCallback(() => {
    const data = filteredCustomers.map((c) => ({
      nombre: c.name,
      telefono: c.phone || "—",
      email: c.email || "—",
      cuit: c.cuit || "—",
      direccion: c.address || "—",
      saldo: c.creditBalance > 0 ? `$${c.creditBalance.toFixed(2)}` : "—",
    }));
    exportTableToPdf(data, customerColumns, "Clientes");
  }, [filteredCustomers]);

  const exportCustomersExcel = useCallback(() => {
    const data = filteredCustomers.map((c) => ({
      nombre: c.name,
      telefono: c.phone || "",
      email: c.email || "",
      cuit: c.cuit || "",
      direccion: c.address || "",
      saldo: c.creditBalance,
    }));
    exportToExcel(data, customerColumns, "Clientes");
  }, [filteredCustomers]);

  function handleCancel() {
    setView({ kind: "list" });
  }

  function handleSaved() {
    setView({ kind: "list" });
  }

  function handleDelete(customer: Customer) {
    const confirmed = window.confirm(
      `¿Eliminar a "${customer.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    deleteCustomer(customer.id);
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Header + Search ── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-pos-text">Clientes</h1>
        {view.kind === "list" && (
          <div className="flex items-center gap-2">
            {filteredCustomers.length > 0 && (
              <>
                <button
                  onClick={exportCustomersExcel}
                  className="text-xs px-3 py-1.5 border border-pos-muted/30 text-pos-text rounded-lg touch-target hover:bg-pos-background/50 whitespace-nowrap"
                >
                  Excel
                </button>
                <button
                  onClick={exportCustomersPdf}
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
              + Nuevo Cliente
            </button>
          </div>
        )}
      </div>

      {view.kind === "list" && (
        <>
          {/* Search input */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono, email o CUIT…"
            className="w-full border border-pos-muted/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target"
          />

          {/* Table or empty state */}
          <div className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-3 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-pos-muted italic text-center">
                  {search
                    ? "No se encontraron clientes con ese criterio de búsqueda"
                    : "Todavía no hay clientes. Hacé clic en '+ Nuevo Cliente' para crear uno."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-pos-muted border-b border-pos-muted/20">
                      <th className="text-left py-2 pr-2 font-medium">Nombre</th>
                      <th className="text-left py-2 px-2 font-medium">
                        Teléfono
                      </th>
                      <th className="text-left py-2 px-2 font-medium">
                        Email
                      </th>
                      <th className="text-left py-2 px-2 font-medium">
                        CUIT
                      </th>
                      <th className="text-right py-2 px-2 font-medium">
                        Saldo
                      </th>
                      <th className="text-right py-2 pl-2 font-medium">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-pos-muted/10 transition-colors hover:bg-pos-background/50"
                      >
                        <td className="py-2 pr-2 font-medium text-pos-text">
                          {c.name}
                        </td>
                        <td className="py-2 px-2 text-pos-muted">
                          {c.phone || "—"}
                        </td>
                        <td className="py-2 px-2 text-pos-muted">
                          {c.email || "—"}
                        </td>
                        <td className="py-2 px-2 text-pos-muted font-mono text-xs">
                          {c.cuit || "—"}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono text-sm font-bold ${
                          c.creditBalance > 0 ? "text-pos-danger" : "text-pos-muted"
                        }`}>
                          {c.creditBalance > 0 ? `$${c.creditBalance.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2 pl-2 text-right whitespace-nowrap">
                          {c.creditBalance > 0 && (
                            <button
                              onClick={() => setCollectCustomer(c)}
                              className="text-xs px-2 py-1 text-pos-success hover:bg-pos-success/10 rounded touch-target mr-1"
                            >
                              Cobrar
                            </button>
                          )}
                          <button
                            onClick={() => setView({ kind: "edit", customer: c })}
                            className="text-xs px-2 py-1 text-pos-secondary hover:bg-pos-secondary/10 rounded touch-target"
                            aria-label={`Editar ${c.name}`}
                          >
                            ✎ Editar
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="text-xs px-2 py-1 text-pos-danger hover:bg-pos-danger/10 rounded touch-target ml-1"
                            aria-label={`Eliminar ${c.name}`}
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
        <div className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-4">
          <CustomerForm
            editCustomer={null}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        </div>
      )}

      {view.kind === "edit" && (
        <div className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-4">
          <CustomerForm
            editCustomer={view.customer}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        </div>
      )}

      {collectCustomer && (
        <CollectPaymentModal
          customer={collectCustomer}
          onClose={() => setCollectCustomer(null)}
          onCollected={() => {}}
        />
      )}
    </div>
  );
}
