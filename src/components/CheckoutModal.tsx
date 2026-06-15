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
      setError("Select a payment method");
      return;
    }
    if (paymentMethod === "cash" && parsedAmount < total) {
      setError(
        `Insufficient payment: $${parsedAmount.toFixed(2)} is less than the total of $${total.toFixed(2)}`,
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
      );
      resetState();
      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Checkout failed. Please try again.",
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
              Items ({items.length})
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
                Payment Method
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePaymentSelect("cash")}
                  className="flex flex-col items-center justify-center py-4 px-3 border-2 border-pos-muted/20 rounded-xl touch-target hover:border-pos-secondary hover:bg-pos-secondary/5 transition-all"
                >
                  <span className="text-3xl mb-1">💵</span>
                  <span className="text-sm font-semibold text-pos-text">
                    Cash
                  </span>
                </button>
                <button
                  onClick={() => handlePaymentSelect("card")}
                  className="flex flex-col items-center justify-center py-4 px-3 border-2 border-pos-muted/20 rounded-xl touch-target hover:border-pos-secondary hover:bg-pos-secondary/5 transition-all"
                >
                  <span className="text-3xl mb-1">💳</span>
                  <span className="text-sm font-semibold text-pos-text">
                    Card
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Cash amount input */}
          {paymentMethod === "cash" && (
            <div>
              <h3 className="text-xs font-semibold text-pos-muted uppercase tracking-wide mb-2">
                Cash Payment
              </h3>
              <div className="space-y-3">
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="Amount received"
                  min={total}
                  step="0.01"
                  aria-label="Cash amount received"
                  className="w-full border border-pos-muted/30 rounded-xl px-4 py-3 text-lg font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-background"
                  autoFocus
                />

                {parsedAmount >= total && parsedAmount > 0 && (
                  <div className="flex items-center justify-between bg-pos-success/10 border border-pos-success/20 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-pos-success">
                      Change
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
                💳 Card payment selected
              </p>
              <p className="text-xs text-pos-muted mt-1">
                Tap "Confirm" to complete the sale
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-3 border border-pos-muted/30 text-pos-text rounded-xl font-medium text-sm touch-target hover:bg-pos-background transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={busy || !paymentMethod}
              className="flex-1 px-4 py-3 bg-pos-accent text-white rounded-xl font-bold text-sm touch-target hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy
                ? "Processing…"
                : `Confirm — $${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
