import { useState, useMemo, useCallback } from "react";
import { useAppStore } from "@/store";
import { useActiveStore } from "@/store/context";
import DateRangeFilter, {
  type DateRange,
  type Preset,
} from "@/components/DateRangeFilter";
import SalesChart, { type Granularity } from "@/components/SalesChart";
import TopSellers from "@/components/TopSellers";

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
      <section className="bg-pos-surface rounded-xl border border-pos-muted/10 p-4">
        <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-3">
          Ingresos en el Tiempo
        </h2>
        <SalesChart sales={filteredSales} granularity={granularity} />
      </section>

      {/* ── Top Sellers ── */}
      <section className="bg-pos-surface rounded-xl border border-pos-muted/10 p-4">
        <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-3">
          Más Vendidos
        </h2>
        <TopSellers sales={filteredSales} limit={10} />
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────
// Summary card sub-component
// ──────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-pos-surface rounded-xl border border-pos-muted/10 p-3 text-center">
      <p className="text-xs text-pos-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-lg font-bold text-pos-text font-mono">{value}</p>
    </div>
  );
}
