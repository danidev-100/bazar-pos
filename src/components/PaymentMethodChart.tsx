import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CompletedSale } from "@/store";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type Props = {
  sales: CompletedSale[];
};

type ChartDataPoint = {
  name: string;
  value: number;
  color: string;
  total: number;
};

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  mixed: "Mixto",
  credit: "Cuenta Corriente",
  mercadopago: "Mercado Pago",
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: "#14b8a6",
  card: "#3b82f6",
  mixed: "#f59e0b",
  credit: "#8b5cf6",
  mercadopago: "#6b7280",
};

const ORDER = ["cash", "card", "mixed", "credit", "mercadopago"];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const tooltipFormatter = (value: number, _name: string, entry: any) => {
  const total = entry?.payload?.total ?? 1;
  const pct = ((value / total) * 100).toFixed(1);
  return [`$${value.toFixed(2)} (${pct}%)`, entry?.payload?.name ?? ""];
};

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.03) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function PaymentMethodChart({ sales }: Props) {
  const data: ChartDataPoint[] = useMemo(() => {
    if (sales.length === 0) return [];

    const buckets = new Map<string, number>();

    for (const sale of sales) {
      const key = sale.paymentMethod;
      buckets.set(key, (buckets.get(key) ?? 0) + sale.total);
    }

    const total = Array.from(buckets.values()).reduce((s, v) => s + v, 0);

    return ORDER.filter((key) => buckets.has(key)).map((key) => ({
      name: PAYMENT_LABELS[key] ?? key,
      value: Math.round(buckets.get(key)! * 100) / 100,
      color: PAYMENT_COLORS[key] ?? "#6b7280",
      total,
    }));
  }, [sales]);

  // ── Empty state ──
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-pos-background/50 rounded-xl border border-dashed border-pos-muted/20">
        <p className="text-pos-muted text-sm">Sin datos en este período</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            label={renderCustomLabel}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={data[i].color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--color-chart-tooltip-border)",
              backgroundColor: "var(--color-chart-tooltip-bg)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            formatter={tooltipFormatter}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* ── Summary stats below chart ── */}
      <div className="flex gap-6 mt-2 text-xs text-pos-muted">
        <span>
          Total:{" "}
          <strong className="text-pos-text">
            ${data.reduce((s, d) => s + d.value, 0).toFixed(2)}
          </strong>
        </span>
        <span>
          Métodos: <strong className="text-pos-text">{data.length}</strong>
        </span>
      </div>
    </div>
  );
}
