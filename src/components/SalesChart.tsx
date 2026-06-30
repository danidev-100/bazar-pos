import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { CompletedSale } from "@/store";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type Granularity = "day" | "week" | "month";

type SalesChartProps = {
  sales: CompletedSale[];
  granularity?: Granularity;
};

type ChartDataPoint = {
  label: string;
  revenue: number;
  transactions: number;
  avgTicket: number;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { month: "short", day: "numeric" });
}

function formatWeek(d: Date): string {
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay()); // go to Sunday
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString("es-AR", { month: "short", year: "numeric" });
}

function getPeriodKey(date: Date, granularity: Granularity): string {
  const d = new Date(date);
  switch (granularity) {
    case "day":
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    case "week": {
      // ISO week: get the Monday of the week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    }
    case "month":
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
}

function getPeriodLabel(date: Date, granularity: Granularity): string {
  switch (granularity) {
    case "day":
      return formatDate(date);
    case "week":
      return formatWeek(date);
    case "month":
      return formatMonth(date);
  }
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function SalesChart({
  sales,
  granularity = "day",
}: SalesChartProps) {
  const data: ChartDataPoint[] = useMemo(() => {
    if (sales.length === 0) return [];

    const buckets = new Map<string, { revenue: number; transactions: number; date: Date }>();

    for (const sale of sales) {
      const saleDate = new Date(sale.date);
      const key = getPeriodKey(saleDate, granularity);

      const existing = buckets.get(key);
      if (existing) {
        existing.revenue += sale.total;
        existing.transactions += 1;
      } else {
        buckets.set(key, {
          revenue: sale.total,
          transactions: 1,
          date: saleDate,
        });
      }
    }

    // Sort chronologically
    const sorted = Array.from(buckets.entries()).sort(
      ([aKey], [bKey]) => aKey.localeCompare(bKey),
    );

    return sorted.map(([, v]) => ({
      label: getPeriodLabel(v.date, granularity),
      revenue: Math.round(v.revenue * 100) / 100,
      transactions: v.transactions,
      avgTicket: v.transactions > 0 ? Math.round((v.revenue / v.transactions) * 100) / 100 : 0,
    }));
  }, [sales, granularity]);

  // ── Empty state ──
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-pos-background/50 rounded-xl border border-dashed border-pos-muted/20">
        <p className="text-pos-muted text-sm">No hay ventas en este período</p>
      </div>
    );
  }

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalTransactions = data.reduce((s, d) => s + d.transactions, 0);
  const overallAvg = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-chart-axis)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-chart-grid)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "var(--color-chart-axis)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--color-chart-axis)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v}`}
            width={60}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--color-chart-tooltip-border)",
              backgroundColor: "var(--color-chart-tooltip-bg)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            formatter={(value: number, name: string) => {
              if (name === "revenue")
                return [`$${value.toFixed(2)}`, "Ingresos"];
              if (name === "avgTicket")
                return [`$${value.toFixed(2)}`, "Ticket Prom."];
              return [value, "Transacciones"];
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            fill="var(--color-chart-bar)"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgTicket"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3, fill: "#f59e0b" }}
            name="avgTicket"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* ── Summary stats below chart ── */}
      <div className="flex gap-6 mt-2 text-xs text-pos-muted">
        <span>
          Total: <strong className="text-pos-text">
            ${totalRevenue.toFixed(2)}
          </strong>
        </span>
        <span>
          Transacciones: <strong className="text-pos-text">
            {totalTransactions}
          </strong>
        </span>
        <span>
          Ticket Prom.: <strong className="text-pos-text">
            ${overallAvg.toFixed(2)}
          </strong>
        </span>
        <span>
          Períodos: <strong className="text-pos-text">{data.length}</strong>
        </span>
      </div>
    </div>
  );
}
