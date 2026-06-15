import { useState, useMemo } from "react";
import { useInvoicesStore, type Invoice } from "@/store/invoices";

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

type InvoiceListProps = {
  storeId: string;
  selectedInvoiceId: number | null;
  onSelectInvoice: (id: number | null) => void;
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function InvoiceList({
  storeId,
  selectedInvoiceId,
  onSelectInvoice,
}: InvoiceListProps) {
  const getInvoicesByStore = useInvoicesStore((s) => s.getInvoicesByStore);
  const searchInvoices = useInvoicesStore((s) => s.searchInvoices);

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const invoices: Invoice[] = useMemo(() => {
    if (!searchQuery && !dateFrom && !dateTo) {
      return getInvoicesByStore(storeId);
    }
    return searchInvoices(
      storeId,
      searchQuery || undefined,
      dateFrom || undefined,
      dateTo || undefined,
    );
  }, [storeId, searchQuery, dateFrom, dateTo, getInvoicesByStore, searchInvoices]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Search / Filter Controls ── */}
      <div className="space-y-2 mb-4">
        <input
          type="text"
          placeholder="Buscá por factura o cliente..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-sm rounded-lg bg-pos-background border border-pos-muted/20 text-pos-text placeholder-pos-muted/50 focus:outline-none focus:ring-2 focus:ring-pos-secondary/50"
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-pos-muted mb-0.5">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2 py-1 text-xs rounded-lg bg-pos-background border border-pos-muted/20 text-pos-text focus:outline-none focus:ring-2 focus:ring-pos-secondary/50"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-pos-muted mb-0.5">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2 py-1 text-xs rounded-lg bg-pos-background border border-pos-muted/20 text-pos-text focus:outline-none focus:ring-2 focus:ring-pos-secondary/50"
            />
          </div>
        </div>
      </div>

      {/* ── Invoice List ── */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {invoices.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-pos-muted italic">
              {searchQuery || dateFrom || dateTo
                ? "No hay facturas que coincidan con tu búsqueda"
                : "Todavía no hay facturas. Generá una desde una venta completada."}
            </p>
          </div>
        ) : (
          invoices.map((inv) => {
            const isSelected = inv.id === selectedInvoiceId;
            return (
              <button
                key={inv.id}
                onClick={() => onSelectInvoice(inv.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-pos-secondary bg-pos-secondary/10"
                    : "border-transparent hover:bg-pos-background/50"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-pos-text">
                    {inv.invoiceNumber}
                  </span>
                  <span className="text-xs font-mono font-bold">
                    ${inv.total.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-pos-muted">
                  <span className="truncate max-w-[140px]">{inv.customer}</span>
                  <span>
                    {new Date(inv.date).toLocaleDateString()}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
