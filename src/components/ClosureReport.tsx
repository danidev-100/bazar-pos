import { useMemo } from "react";
import {
  useCashClosingStore,
  type ShiftSummary,
} from "@/store/cash-closing";
import { useAppStore, type CompletedSale } from "@/store";

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

type ClosureReportProps = {
  shiftId: number;
  completedSales: CompletedSale[];
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ClosureReport({
  shiftId,
  completedSales,
}: ClosureReportProps) {
  const getShiftSummary = useCashClosingStore((s) => s.getShiftSummary);

  const summary: ShiftSummary | null = useMemo(
    () => getShiftSummary(shiftId, completedSales),
    [shiftId, completedSales, getShiftSummary],
  );

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-pos-muted italic">Shift not found</p>
      </div>
    );
  }

  const { shift, totalSales, cashTotal, cardTotal, transactionCount, itemCount, topProducts } = summary;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
        Closure Report
      </h3>

      <div className="bg-pos-surface rounded-xl border border-pos-muted/10 divide-y divide-pos-muted/10">
        {/* Shift info */}
        <div className="px-4 py-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-pos-muted">Employee</span>
            <span className="text-sm font-medium">{shift.employee}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-pos-muted">Opened</span>
            <span className="text-sm font-mono">
              {new Date(shift.openTime).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-pos-muted">Closed</span>
            <span className="text-sm font-mono">
              {shift.closeTime
                ? new Date(shift.closeTime).toLocaleString()
                : "—"}
            </span>
          </div>
        </div>

        {/* Sales summary */}
        <div className="px-4 py-3 space-y-2">
          <h4 className="text-xs font-semibold text-pos-text uppercase tracking-wide">
            Sales Summary
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-sm text-pos-muted">Transactions</span>
            <span className="text-sm font-mono font-bold">{transactionCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-pos-muted">Total Items Sold</span>
            <span className="text-sm font-mono font-bold">{itemCount}</span>
          </div>
          <hr className="border-pos-muted/20" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-pos-muted">Cash Total</span>
            <span className="text-sm font-mono font-bold">
              ${cashTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-pos-muted">Card Total</span>
            <span className="text-sm font-mono font-bold">
              ${cardTotal.toFixed(2)}
            </span>
          </div>
          <hr className="border-pos-muted/20" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Total Sales</span>
            <span className="text-base font-mono font-bold text-pos-text">
              ${totalSales.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Reconciliation */}
        {shift.reconciliationStatus && (
          <div className="px-4 py-3 space-y-2">
            <h4 className="text-xs font-semibold text-pos-text uppercase tracking-wide">
              Reconciliation
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-pos-muted">Expected Cash</span>
              <span className="text-sm font-mono">
                ${(totalSales - cardTotal).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-pos-muted">Declared Cash</span>
              <span className="text-sm font-mono">
                ${shift.declaredCash!.toFixed(2)}
              </span>
            </div>
            <hr className="border-pos-muted/20" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Variance</span>
              <span
                className={`text-sm font-mono font-bold ${
                  shift.variance === 0
                    ? "text-pos-success"
                    : shift.variance! < 0
                      ? "text-pos-danger"
                      : "text-pos-accent"
                }`}
              >
                {shift.variance! >= 0 ? "+" : ""}${shift.variance!.toFixed(2)}
              </span>
            </div>
            <div
              className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                shift.reconciliationStatus === "matched"
                  ? "bg-pos-success/10 text-pos-success"
                  : "bg-pos-accent/10 text-pos-accent"
              }`}
            >
              {shift.reconciliationStatus === "matched"
                ? "✓ Matched"
                : "⚠ Mismatch"}
            </div>
          </div>
        )}

        {/* Top Products */}
        {topProducts.length > 0 && (
          <div className="px-4 py-3 space-y-2">
            <h4 className="text-xs font-semibold text-pos-text uppercase tracking-wide">
              Top Products
            </h4>
            <div className="space-y-1">
              {topProducts.map((p, i) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-pos-text truncate flex-1">
                    <span className="text-pos-muted mr-1">{i + 1}.</span>
                    {p.name}
                  </span>
                  <span className="text-pos-muted font-mono text-xs ml-2">
                    x{p.quantity}
                  </span>
                  <span className="font-mono text-xs ml-2 w-16 text-right">
                    ${p.total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {topProducts.length === 0 && (
          <div className="px-4 py-3">
            <p className="text-xs text-pos-muted italic">
              No products sold during this shift
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
