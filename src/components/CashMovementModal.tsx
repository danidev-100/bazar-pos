import { useState, useEffect, useRef, useMemo } from "react";
import { useCashClosingStore, type CashMovementMethod, type CashMovement } from "@/store/cash-closing";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store";

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

type CashMovementModalProps = {
  shiftId: number;
  storeId: string;
  onClose: () => void;
  onComplete: () => void;
};

const METHODS: { value: CashMovementMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "other", label: "Otro" },
];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function CashMovementModal({
  shiftId,
  storeId,
  onClose,
  onComplete,
}: CashMovementModalProps) {
  const recordCashMovement = useCashClosingStore((s) => s.recordCashMovement);
  const currentUser = useAuthStore((s) => s.currentUser);
  const shifts = useCashClosingStore((s) => s.shifts);
  const cashMovements = useCashClosingStore((s) => s.cashMovements);
  const completedSales = useAppStore((s) => s.completedSales);

  const shift = shifts.find((s) => s.id === shiftId);
  const openTime = shift ? new Date(shift.openTime).getTime() : 0;

  // Available cash = openingBalance + cash sales since shift opened - previous cash withdrawals + previous cash deposits
  const availableCash = useMemo(() => {
    if (!shift) return 0;

    const cashFromSales = completedSales
      .filter((s) => {
        const t = new Date(s.date).getTime();
        return (
          t >= openTime &&
          (s.paymentMethod === "cash" || s.paymentMethod === "mixed")
        );
      })
      .reduce(
        (sum, s) =>
          sum +
          (s.paymentMethod === "mixed" ? s.cashAmount ?? 0 : s.total),
        0,
      );

    const withdrawalTotal = cashMovements
      .filter(
        (m) =>
          m.shiftId === shiftId &&
          m.type === "withdrawal" &&
          m.method === "cash",
      )
      .reduce((sum, m) => sum + m.amount, 0);

    const depositTotal = cashMovements
      .filter(
        (m) =>
          m.shiftId === shiftId &&
          m.type === "deposit" &&
          m.method === "cash",
      )
      .reduce((sum, m) => sum + m.amount, 0);

    return Math.max(
      0,
      shift.openingBalance + cashFromSales - withdrawalTotal + depositTotal,
    );
  }, [shift, completedSales, cashMovements, shiftId, openTime]);

  const [type, setType] = useState<"withdrawal" | "deposit">("withdrawal");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<CashMovementMethod>("cash");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit() {
    setError(null);
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError("Ingresá un monto válido mayor a 0");
      return;
    }

    // Validate cash withdrawals don't exceed available cash
    if (type === "withdrawal" && method === "cash" && num > availableCash) {
      setError(
        `Solo podés retirar hasta $${availableCash.toFixed(2)}. Disponible en caja: apertura + ventas efectivo - retiros anteriores.`,
      );
      return;
    }

    try {
      recordCashMovement(
        shiftId,
        type,
        num,
        reason.trim(),
        currentUser?.name ?? "Cajero",
        storeId,
        method,
      );
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-pos-surface rounded-2xl shadow-2xl border border-pos-muted/10 overflow-hidden mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-pos-muted/10">
          <h3 className="text-base font-semibold text-pos-text text-center">
            Movimiento de Caja
          </h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-pos-muted/20">
            <button
              onClick={() => setType("withdrawal")}
              className={`flex-1 py-2.5 text-sm font-medium touch-target transition-colors ${
                type === "withdrawal"
                  ? "bg-pos-danger text-white"
                  : "bg-transparent text-pos-muted hover:text-pos-text"
              }`}
            >
              Retiro
            </button>
            <button
              onClick={() => setType("deposit")}
              className={`flex-1 py-2.5 text-sm font-medium touch-target transition-colors ${
                type === "deposit"
                  ? "bg-pos-success text-white"
                  : "bg-transparent text-pos-muted hover:text-pos-text"
              }`}
            >
              Depósito
            </button>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-pos-text mb-1.5">
              Medio
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={`py-2 rounded-lg text-xs font-medium touch-target transition-colors ${
                    method === m.value
                      ? "bg-pos-secondary text-white"
                      : "bg-pos-background/50 text-pos-muted border border-pos-muted/20 hover:border-pos-secondary/40"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="movement-amount"
              className="block text-sm font-medium text-pos-text mb-1"
            >
              Monto
            </label>
            <input
              id="movement-amount"
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d{0,2}$/.test(val) || val === "") {
                  setAmount(val);
                }
              }}
              placeholder="0.00"
              className="w-full border border-pos-muted/30 rounded-xl px-4 py-3 text-lg text-right font-mono focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-background"
            />
            {type === "withdrawal" && method === "cash" && (
              <p className="text-xs text-pos-muted/60 mt-1.5 text-right">
                Disponible en caja:{" "}
                <span className="font-mono font-medium text-pos-text">
                  ${availableCash.toFixed(2)}
                </span>
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label
              htmlFor="movement-reason"
              className="block text-sm font-medium text-pos-text mb-1"
            >
              Motivo <span className="text-pos-muted/60">(opcional)</span>
            </label>
            <input
              id="movement-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                type === "withdrawal"
                  ? "Ej: Pago a proveedor"
                  : "Ej: Cambio de caja"
              }
              className="w-full border border-pos-muted/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-background"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-pos-danger/10 border border-pos-danger/30 text-pos-danger text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-pos-muted/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm text-pos-muted border border-pos-muted/20 rounded-xl touch-target hover:bg-pos-background/50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !amount ||
              (type === "withdrawal" &&
                method === "cash" &&
                parseFloat(amount) > availableCash)
            }
            className={`flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl touch-target hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${
              type === "withdrawal"
                ? "bg-pos-danger"
                : "bg-pos-success"
            }`}
          >
            {type === "withdrawal" ? "Retirar" : "Depositar"}
          </button>
        </div>
      </div>
    </div>
  );
}
