import { useState, useMemo, useCallback } from "react";
import { useAppStore } from "@/store";
import { useActiveStore } from "@/store/context";
import DateRangeFilter, {
  type DateRange,
  type Preset,
} from "@/components/DateRangeFilter";
import SalesChart, { type Granularity } from "@/components/SalesChart";
import TopSellers from "@/components/TopSellers";
import { exportTableToPdf, exportToExcel, type ExportColumn } from "@/lib/export-utils";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function isSaleInRange(
  saleDate: string,
  from: Date | null,
  to: Date | null,
): boolean {
  const ts = new Date(saleDate).getTime();

  if (from && ts < from.getTime()) return false;
  if (to && ts > to.getTime()) return false;

  return true;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function StatsPage() {
  const { storeId } = useActiveStore();
  const completedSales = useAppStore((s) => s.completedSales);

  // ── Date filter state ──
  const [dateRange, setDateRange] = useState<DateRange>({
    from: null,
    to: null,
  });
  const [granularity, setGranularity] = useState<Granularity>("day");

  const handleDateRangeChange = useCallback(
    (range: DateRange, _preset: Preset | "custom") => {
      setDateRange(range);
    },
    [],
  );

  // ── Filtered sales ──
  const filteredSales = useMemo(() => {
    return completedSales.filter((sale) => {
      // Filter by store
      if (sale.storeId !== storeId) return false;

      // Filter by date range
      return isSaleInRange(sale.date, dateRange.from, dateRange.to);
    });
  }, [completedSales, storeId, dateRange]);

  // ── Export handlers ──

  const topSellersColumns: ExportColumn[] = [
    { header: "Producto", key: "producto" },
    { header: "Cantidad", key: "cantidad" },
    { header: "Ingresos", key: "ingresos" },
  ];

  const topSellersData = useMemo(() => {
    const productMap = new Map<string, { qty: number; total: number }>();
    for (const sale of filteredSales) {
      for (const item of sale.items) {
        const existing = productMap.get(item.productName);
        if (existing) {
          existing.qty += item.quantity;
          existing.total += item.subtotal;
        } else {
          productMap.set(item.productName, {
            qty: item.quantity,
            total: item.subtotal,
          });
        }
      }
    }
    return [...productMap.entries()]
      .map(([name, data]) => ({
        producto: name,
        cantidad: data.qty,
        ingresos: data.total,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }, [filteredSales]);

  const salesSummaryColumns: ExportColumn[] = [
    { header: "Métrica", key: "metrica" },
    { header: "Valor", key: "valor" },
  ];

  const exportTopSellersPdf = useCallback(() => {
    const data = topSellersData.map((item) => ({
      producto: item.producto,
      cantidad: String(item.cantidad),
      ingresos: `$${item.ingresos.toFixed(2)}`,
    }));
    exportTableToPdf(data, topSellersColumns, "Más Vendidos");
  }, [topSellersData]);

  const exportTopSellersExcel = useCallback(() => {
    exportToExcel(topSellersData, topSellersColumns, "Mas-Vendidos");
  }, [topSellersData]);

  const exportSummaryPdf = useCallback(() => {
    const totalRevenue = filteredSales.reduce(
      (s, sale) => s + sale.total, 0,
    );
    const totalItems = filteredSales.reduce(
      (s, sale) => s + sale.items.reduce((si, i) => si + i.quantity, 0), 0,
    );
    const avgPerSale =
      filteredSales.length > 0
        ? totalRevenue / filteredSales.length
        : 0;
    const data = [
      { metrica: "Ingresos Totales", valor: `$${totalRevenue.toFixed(2)}` },
      { metrica: "Transacciones", valor: String(filteredSales.length) },
      { metrica: "Productos Vendidos", valor: String(totalItems) },
      { metrica: "Promedio/Venta", valor: `$${avgPerSale.toFixed(2)}` },
    ];
    exportTableToPdf(data, salesSummaryColumns, "Resumen de Ventas");
  }, [filteredSales]);

  const exportSummaryExcel = useCallback(() => {
    const totalRevenue = filteredSales.reduce(
      (s, sale) => s + sale.total, 0,
    );
    const totalItems = filteredSales.reduce(
      (s, sale) => s + sale.items.reduce((si, i) => si + i.quantity, 0), 0,
    );
    const avgPerSale =
      filteredSales.length > 0
        ? totalRevenue / filteredSales.length
        : 0;
    const data = [
      { metrica: "Ingresos Totales", valor: totalRevenue },
      { metrica: "Transacciones", valor: filteredSales.length },
      { metrica: "Productos Vendidos", valor: totalItems },
      { metrica: "Promedio/Venta", valor: avgPerSale },
    ];
    exportToExcel(data, salesSummaryColumns, "Resumen-Ventas");
  }, [filteredSales]);

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-pos-text">Estadísticas de Ventas</h1>

        {/* Granularity toggle */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto">
          <span className="text-xs text-pos-muted">Ver:</span>
          {(["day", "week", "month"] as Granularity[]).map((g) => {
            const GRANULARITY_LABELS: Record<Granularity, string> = { day: "Día", week: "Semana", month: "Mes" };
            return (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors touch-target ${
                granularity === g
                  ? "bg-pos-secondary text-white"
                  : "bg-pos-background text-pos-muted hover:text-pos-secondary"
              }`}
            >
              {GRANULARITY_LABELS[g]}
            </button>
            );
          })}
        </div>
      </div>

      {/* ── Date Range Filter ── */}
      <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Ingresos Totales"
          value={`$${filteredSales.reduce((s, sale) => s + sale.total, 0).toFixed(2)}`}
        />
        <SummaryCard
          label="Transacciones"
          value={String(filteredSales.length)}
        />
        <SummaryCard
          label="Productos Vendidos"
          value={String(
            filteredSales.reduce((s, sale) => s + sale.items.reduce((si, i) => si + i.quantity, 0), 0),
          )}
        />
        <SummaryCard
          label="Prom./Venta"
          value={
            filteredSales.length > 0
              ? `$${(
                  filteredSales.reduce((s, sale) => s + sale.total, 0) /
                  filteredSales.length
                ).toFixed(2)}`
              : "$0.00"
          }
        />
      </div>

      {/* ── Chart ── */}
      <section className="bg-pos-surface rounded-xl border border-pos-muted/10 p-4 dark:bg-gray-800 dark:border-gray-600/30">
        <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-3">
          Ingresos en el Tiempo
        </h2>
        <SalesChart sales={filteredSales} granularity={granularity} />
      </section>

      {/* ── Top Sellers ── */}
      <section className="bg-pos-surface rounded-xl border border-pos-muted/10 p-4 dark:bg-gray-800 dark:border-gray-600/30">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
            Más Vendidos
          </h2>
          {topSellersData.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={exportTopSellersExcel}
                className="text-xs px-2 py-1 border border-pos-muted/30 text-pos-text rounded hover:bg-pos-background/50 transition-colors"
              >
                Excel
              </button>
              <button
                onClick={exportTopSellersPdf}
                className="text-xs px-2 py-1 border border-pos-muted/30 text-pos-text rounded hover:bg-pos-background/50 transition-colors"
              >
                PDF
              </button>
            </div>
          )}
        </div>
        <TopSellers sales={filteredSales} limit={10} />
      </section>

      {/* ── Export Summary ── */}
      {filteredSales.length > 0 && (
        <div className="flex justify-end gap-2">
          <button
            onClick={exportSummaryExcel}
            className="text-xs px-3 py-1.5 border border-pos-muted/30 text-pos-text rounded-lg hover:bg-pos-background/50 transition-colors"
          >
            Exportar Resumen Excel
          </button>
          <button
            onClick={exportSummaryPdf}
            className="text-xs px-3 py-1.5 border border-pos-muted/30 text-pos-text rounded-lg hover:bg-pos-background/50 transition-colors"
          >
            Exportar Resumen PDF
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Summary card sub-component
// ──────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-pos-surface rounded-xl border border-pos-muted/10 p-3 text-center dark:bg-gray-800 dark:border-gray-600/30">
      <p className="text-xs text-pos-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-lg font-bold text-pos-text font-mono">{value}</p>
    </div>
  );
}
