import { useState } from "react";
import { useAppStore } from "@/store";
import { useActiveStore } from "@/store/context";

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

type CheckoutModalProps = {
  onClose: () => void;
  onComplete: () => void;
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function CheckoutModal({
  onClose,
  onComplete,
}: CheckoutModalProps) {
  const { storeId } = useActiveStore();
  const items = useAppStore((s) => s.items);
  const cartTotal = useAppStore((s) => s.cartTotal);
  const checkout = useAppStore((s) => s.checkout);
  const selectedCustomer = useAppStore((s) => s.selectedCustomer);

  const total = cartTotal();
  const isEmpty = items.length === 0;

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | null>(
    null,
  );
  const [cashAmount, setCashAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsedAmount = parseFloat(cashAmount) || 0;
  const change =
    paymentMethod === "cash" && parsedAmount >= total
      ? Math.round((parsedAmount - total) * 100) / 100
      : 0;

  function resetState() {
    setPaymentMethod(null);
    setCashAmount("");
    setError(null);
    setBusy(false);
  }

  function handlePaymentSelect(method: "cash" | "card") {
    setPaymentMethod(method);
    setError(null);
    if (method === "card") {
      setCashAmount("");
    }
  }

  function handleConfirm() {
    if (isEmpty) {
      setError("El carrito está vacío");
      return;
    }
    if (!paymentMethod) {
      setError("Seleccioná un método de pago");
      return;
    }
    if (paymentMethod === "cash" && parsedAmount < total) {
      setError(
        `Pago insuficiente: $${parsedAmount.toFixed(2)} es menor al total de $${total.toFixed(2)}`,
      );
      return;
    }

    setBusy(true);
    setError(null);

    try {
      checkout(
        paymentMethod,
        paymentMethod === "cash" ? parsedAmount : undefined,
        storeId,
        selectedCustomer?.name,
      );
      resetState();
      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al procesar el pago. Intentá de nuevo.",
      );
      setBusy(false);
    }
  }

  function handleCancel() {
    resetState();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-pos-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-pos-text">Cobrar</h2>
            <button
              onClick={handleCancel}
              className="text-pos-muted text-xl leading-none touch-target w-10 h-10 flex items-center justify-center rounded-lg hover:bg-pos-background transition-colors"
              aria-label="Cerrar cobro"
            >
              ✕
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-pos-danger/10 border border-pos-danger/30 text-pos-danger text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Items summary */}
          <div>
            <h3 className="text-xs font-semibold text-pos-muted uppercase tracking-wide mb-2">
              Productos ({items.length})
            </h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-pos-text truncate flex-1 mr-2">
                    {item.quantity}x {item.productName}
                  </span>
                  <span className="font-mono text-pos-muted">
                    ${item.subtotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected customer */}
          {selectedCustomer && (
            <div className="flex items-center justify-between text-sm bg-pos-background/50 rounded-lg px-3 py-2">
              <span className="text-pos-muted">Cliente</span>
              <span className="font-medium text-pos-text">
                {selectedCustomer.name}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-pos-muted/20">
            <span className="text-base font-bold text-pos-text">Total</span>
            <span className="text-xl font-bold font-mono text-pos-secondary">
              ${total.toFixed(2)}
            </span>
          </div>

          {/* Payment method selection */}
          {!paymentMethod && (
            <div>
              <h3 className="text-xs font-semibold text-pos-muted uppercase tracking-wide mb-2">
                Método de pago
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePaymentSelect("cash")}
                  className="flex flex-col items-center justify-center py-4 px-3 border-2 border-pos-muted/20 rounded-xl touch-target hover:border-pos-secondary hover:bg-pos-secondary/5 transition-all"
                >
                  <span className="text-3xl mb-1">💵</span>
                  <span className="text-sm font-semibold text-pos-text">
                    Efectivo
                  </span>
                </button>
                <button
                  onClick={() => handlePaymentSelect("card")}
                  className="flex flex-col items-center justify-center py-4 px-3 border-2 border-pos-muted/20 rounded-xl touch-target hover:border-pos-secondary hover:bg-pos-secondary/5 transition-all"
                >
                  <span className="text-3xl mb-1">💳</span>
                  <span className="text-sm font-semibold text-pos-text">
                    Tarjeta
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Cash amount input */}
          {paymentMethod === "cash" && (
            <div>
              <h3 className="text-xs font-semibold text-pos-muted uppercase tracking-wide mb-2">
                Pago en efectivo
              </h3>
              <div className="space-y-3">
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Monto recibido"
                  min={total}
                  step="0.01"
                  aria-label="Monto recibido en efectivo"
                  className="w-full border border-pos-muted/30 rounded-xl px-4 py-3 text-lg font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-background"
                  autoFocus
                />

                {parsedAmount >= total && parsedAmount > 0 && (
                  <div className="flex items-center justify-between bg-pos-success/10 border border-pos-success/20 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-pos-success">
                      Vuelto
                    </span>
                    <span className="text-lg font-bold font-mono text-pos-success">
                      ${change.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card indicator */}
          {paymentMethod === "card" && (
            <div className="bg-pos-secondary/10 border border-pos-secondary/20 rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-pos-secondary font-medium">
                💳 Pago con tarjeta seleccionado
              </p>
              <p className="text-xs text-pos-muted mt-1">
                Tocá "Confirmar" para completar la venta
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-3 border border-pos-muted/30 text-pos-text rounded-xl font-medium text-sm touch-target hover:bg-pos-background transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={busy || !paymentMethod}
              className="flex-1 px-4 py-3 bg-pos-accent text-white rounded-xl font-bold text-sm touch-target hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy
                ? "Procesando…"
                : `Confirmar — $${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
