import { useState, useCallback } from "react";
import { useAppStore, type CompletedSale } from "@/store";
import { useActiveStore } from "@/store/context";
import { useCashClosingStore, type Shift } from "@/store/cash-closing";
import ShiftPanel from "@/components/ShiftPanel";
import ReconciliationForm from "@/components/ReconciliationForm";
import ClosureReport from "@/components/ClosureReport";

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function CashClosingPage() {
  const { storeId } = useActiveStore();
  const completedSales = useAppStore((s) => s.completedSales);
  const shifts = useCashClosingStore((s) => s.shifts);
  const getOpenShift = useCashClosingStore((s) => s.getOpenShift);
  const getShiftsByStore = useCashClosingStore((s) => s.getShiftsByStore);

  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const currentShift = getOpenShift(storeId);
  const storeShifts = getShiftsByStore(storeId);

  const handleShiftChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
    // Auto-select the most recent shift
    const latest = getShiftsByStore(storeId)[0];
    if (latest) setSelectedShiftId(latest.id);
  }, [storeId, getShiftsByStore]);

  // Find the selected shift object
  const selectedShift: Shift | null =
    storeShifts.find((s) => s.id === selectedShiftId) ?? null;

  // Determine which panels to show based on selected shift state
  const showReconciliation =
    selectedShift &&
    selectedShift.status === "closed" &&
    selectedShift.closeTime !== null;

  const showClosureReport =
    selectedShift &&
    selectedShift.reconciliationStatus !== null;

  return (
    <div className="flex gap-4 h-full">
      {/* ── Left panel: Shift list ── */}
      <aside className="w-72 flex-shrink-0 bg-pos-surface rounded-xl border border-pos-muted/10 p-3 overflow-y-auto">
        <ShiftList
          shifts={storeShifts}
          currentShift={currentShift}
          selectedId={selectedShiftId}
          onSelect={setSelectedShiftId}
        />
      </aside>

      {/* ── Center panel: ShiftPanel or Reconciliation or Report ── */}
      <section className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-4">
          Cash Closing
        </h2>

        {/* If there's an open shift, show the ShiftPanel */}
        {currentShift ? (
          <ShiftPanel
            storeId={storeId}
            currentShift={currentShift}
            onShiftChanged={handleShiftChanged}
          />
        ) : !selectedShift ? (
          /* No shift selected and no open shift — show open prompt */
          <ShiftPanel
            storeId={storeId}
            currentShift={null}
            onShiftChanged={handleShiftChanged}
          />
        ) : null}

        {/* Reconciliation form — show when selected closed shift needs reconciliation */}
        {showReconciliation && selectedShift.reconciliationStatus === null && (
          <div className="mt-4">
            <ReconciliationForm
              shift={selectedShift}
              completedSales={completedSales}
              onReconciled={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        )}

        {/* ClosureReport — show when shift is reconciled */}
        {showClosureReport && (
          <div className="mt-4">
            <ClosureReport
              shiftId={selectedShift!.id}
              completedSales={completedSales}
            />
          </div>
        )}

        {/* Empty state */}
        {!currentShift && !selectedShift && (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-pos-muted italic">
              No shifts yet. Open a shift from the left panel or use the form
              above.
            </p>
          </div>
        )}
      </section>

      {/* ── Right panel: Quick stats for selected shift ── */}
      {selectedShift && (
        <aside className="w-80 flex-shrink-0 bg-pos-surface rounded-xl border border-pos-muted/10 p-3 overflow-y-auto">
          <ShiftQuickStats
            shift={selectedShift}
            completedSales={completedSales}
          />
        </aside>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-component: Shift List
// ──────────────────────────────────────────────

function ShiftList({
  shifts,
  currentShift,
  selectedId,
  onSelect,
}: {
  shifts: Shift[];
  currentShift: Shift | null;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  if (shifts.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-xs text-pos-muted italic">No shifts recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-pos-text uppercase tracking-wide mb-3">
        Shift History
      </h3>

      {shifts.map((s) => {
        const isOpen = s.status === "open";
        const isSelected = s.id === selectedId;

        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
              isSelected
                ? "border-pos-secondary bg-pos-secondary/10"
                : "border-transparent hover:bg-pos-background/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-pos-text truncate">
                {s.employee}
              </span>
              {isOpen ? (
                <span className="text-xs bg-pos-success/10 text-pos-success font-medium px-1.5 py-0.5 rounded-full">
                  Open
                </span>
              ) : (
                <span className="text-xs bg-pos-muted/10 text-pos-muted font-medium px-1.5 py-0.5 rounded-full">
                  Closed
                </span>
              )}
            </div>
            <div className="text-xs text-pos-muted">
              {new Date(s.openTime).toLocaleDateString()}{" "}
              {new Date(s.openTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {s.reconciliationStatus && (
              <div
                className={`text-xs mt-1 ${
                  s.reconciliationStatus === "matched"
                    ? "text-pos-success"
                    : "text-pos-accent"
                }`}
              >
                {s.reconciliationStatus === "matched" ? "✓ Matched" : "⚠ Mismatch"}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-component: Shift Quick Stats
// ──────────────────────────────────────────────

function ShiftQuickStats({
  shift,
  completedSales,
}: {
  shift: Shift;
  completedSales: CompletedSale[];
}) {
  const openTime = new Date(shift.openTime).getTime();
  const closeTime = shift.closeTime
    ? new Date(shift.closeTime).getTime()
    : Date.now();

  const shiftSales = completedSales.filter((s) => {
    const t = new Date(s.date).getTime();
    return t >= openTime && t <= closeTime;
  });

  const cashTotal = shiftSales
    .filter((s) => s.paymentMethod === "cash")
    .reduce((sum, s) => sum + s.total, 0);
  const cardTotal = shiftSales
    .filter((s) => s.paymentMethod === "card")
    .reduce((sum, s) => sum + s.total, 0);
  const totalSales = Math.round((cashTotal + cardTotal) * 100) / 100;
  const itemCount = shiftSales.reduce(
    (sum, s) => sum + s.items.reduce((q, i) => q + i.quantity, 0),
    0,
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
        Quick Stats
      </h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-pos-muted">Transactions</span>
          <span className="text-sm font-mono font-bold">
            {shiftSales.length}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-pos-muted">Items Sold</span>
          <span className="text-sm font-mono font-bold">{itemCount}</span>
        </div>
        <hr className="border-pos-muted/20" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-pos-muted">Cash</span>
          <span className="text-sm font-mono">
            ${cashTotal.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-pos-muted">Card</span>
          <span className="text-sm font-mono">
            ${cardTotal.toFixed(2)}
          </span>
        </div>
        <hr className="border-pos-muted/20" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Total Sales</span>
          <span className="text-sm font-mono font-bold text-pos-text">
            ${totalSales.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
