import { useState } from "react";
import { useAppStore } from "@/store";
import { useActiveStore } from "@/store/context";
import { type ComprobanteTipo, getTipoLabel } from "@/store/comprobantes";

type CheckoutModalProps = {
  onClose: () => void;
  onComplete: () => void;
};

export default function CheckoutModal({
  onClose,
  onComplete,
}: CheckoutModalProps) {
  const { storeId } = useActiveStore();
  const items = useAppStore((s) => s.items);
  const cartTotal = useAppStore((s) => s.cartTotal);
  const checkout = useAppStore((s) => s.checkout);
  const selectedCustomer = useAppStore((s) => s.selectedCustomer);
  const globalDiscountPercent = useAppStore((s) => s.globalDiscountPercent);
  const setGlobalDiscount = useAppStore((s) => s.setGlobalDiscount);
  const selectedComprobanteTipo = useAppStore((s) => s.selectedComprobanteTipo);
  const setSelectedComprobanteTipo = useAppStore((s) => s.setSelectedComprobanteTipo);

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const total = cartTotal();
  const discountAmount = Math.round((subtotal - total) * 100) / 100;
  const isEmpty = items.length === 0;

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mixed" | "credit" | null>(null);
  const [discountDraft, setDiscountDraft] = useState(String(globalDiscountPercent));
  const [cashAmount, setCashAmount] = useState<string>("");
  const [cardAmount, setCardAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsedCash = parseFloat(cashAmount) || 0;
  const parsedCard = parseFloat(cardAmount) || 0;
  const enteredTotal = paymentMethod === "mixed" ? parsedCash + parsedCard : parsedCash;
  const change =
    paymentMethod === "cash" && parsedCash >= total
      ? Math.round((parsedCash - total) * 100) / 100
      : paymentMethod === "mixed" && enteredTotal >= total
        ? Math.round((parsedCash - (total - parsedCard)) * 100) / 100
        : 0;

  function resetState() {
    setPaymentMethod(null);
    setCashAmount("");
    setCardAmount("");
    setError(null);
    setBusy(false);
  }

  function handlePaymentSelect(method: "cash" | "card" | "mixed" | "credit") {
    setPaymentMethod(method);
    setError(null);
    if (method === "card") {
      setCashAmount("");
      setCardAmount("");
    }
    if (method === "cash") {
      setCardAmount("");
    }
    if (method === "mixed") {
      setCashAmount("");
      setCardAmount("");
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

    if (paymentMethod === "cash" && parsedCash < total) {
      setError(`Pago insuficiente: $${parsedCash.toFixed(2)} es menor al total de $${total.toFixed(2)}`);
      return;
    }

    if (paymentMethod === "mixed") {
      if (parsedCard <= 0 && parsedCash <= 0) {
        setError("Ingresá al menos un monto en efectivo o tarjeta");
        return;
      }
      if (enteredTotal < total) {
        setError(`Total ingresado: $${enteredTotal.toFixed(2)} — faltan $${(total - enteredTotal).toFixed(2)}`);
        return;
      }
    }

    setBusy(true);
    setError(null);

    try {
      if (paymentMethod === "mixed") {
        checkout("mixed", total, storeId, selectedCustomer?.name, parsedCash, parsedCard);
      } else if (paymentMethod === "credit") {
        checkout("credit", total, storeId, selectedCustomer?.name);
      } else {
        checkout(
          paymentMethod,
          paymentMethod === "cash" ? parsedCash : undefined,
          storeId,
          selectedCustomer?.name,
        );
      }
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

          {/* Comprobante selector */}
          <div>
            <h3 className="text-xs font-semibold text-pos-muted uppercase tracking-wide mb-2">Comprobante</h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["ticket", "boleta", "factura"] as ComprobanteTipo[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedComprobanteTipo(selectedComprobanteTipo === t ? null : t)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium touch-target transition-all ${
                    selectedComprobanteTipo === t
                      ? "bg-pos-secondary text-white"
                      : "border border-pos-muted/20 text-pos-muted hover:border-pos-secondary hover:text-pos-text"
                  }`}
                >
                  {getTipoLabel(t)}
                </button>
              ))}
              {selectedComprobanteTipo && (
                <button
                  type="button"
                  onClick={() => setSelectedComprobanteTipo(null)}
                  className="text-xs text-pos-muted hover:text-pos-danger ml-1"
                >
                  ✕
                </button>
              )}
            </div>
            {!selectedComprobanteTipo && (
              <p className="text-[10px] text-pos-muted mt-1">Ninguno — solo venta</p>
            )}
          </div>

          {/* Discount */}
          <div className="bg-pos-background/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-pos-muted">Subtotal</span>
              <span className="text-sm font-mono">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="global-discount" className="text-xs font-medium text-pos-muted whitespace-nowrap">
                Descuento %
              </label>
              <input
                id="global-discount"
                type="text"
                inputMode="numeric"
                value={discountDraft}
                onChange={(e) => {
                  const raw = e.target.value;
                  // Allow empty or digits only
                  if (raw === "") {
                    setDiscountDraft("");
                    setGlobalDiscount(0);
                    return;
                  }
                  if (/^\d+$/.test(raw)) {
                    const clamped = Math.min(100, parseInt(raw, 10));
                    setDiscountDraft(String(clamped));
                    setGlobalDiscount(clamped);
                  }
                }}
                onFocus={(e) => e.target.select()}
                className="w-16 border border-pos-muted/30 rounded-lg px-2 py-1 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-surface [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {discountAmount > 0 && (
                <span className="text-xs text-pos-danger font-medium">−${discountAmount.toFixed(2)}</span>
              )}
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
                Método de pago
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePaymentSelect("cash")}
                  className="flex flex-col items-center justify-center py-4 px-2 border-2 border-pos-muted/20 rounded-xl touch-target hover:border-pos-secondary hover:bg-pos-secondary/5 transition-all"
                >
                  <span className="text-3xl mb-1">💵</span>
                  <span className="text-sm font-semibold text-pos-text">
                    Efectivo
                  </span>
                </button>
                <button
                  onClick={() => handlePaymentSelect("card")}
                  className="flex flex-col items-center justify-center py-4 px-2 border-2 border-pos-muted/20 rounded-xl touch-target hover:border-pos-secondary hover:bg-pos-secondary/5 transition-all"
                >
                  <span className="text-3xl mb-1">💳</span>
                  <span className="text-sm font-semibold text-pos-text">
                    Tarjeta
                  </span>
                </button>
                <button
                  onClick={() => handlePaymentSelect("mixed")}
                  className="flex flex-col items-center justify-center py-4 px-2 border-2 border-pos-muted/20 rounded-xl touch-target hover:border-pos-secondary hover:bg-pos-secondary/5 transition-all"
                >
                  <span className="text-3xl mb-1">🔀</span>
                  <span className="text-sm font-semibold text-pos-text">
                    Mixto
                  </span>
                </button>
                <button
                  onClick={() => handlePaymentSelect("credit")}
                  disabled={!selectedCustomer}
                  className={`flex flex-col items-center justify-center py-4 px-2 border-2 rounded-xl touch-target transition-all ${
                    !selectedCustomer
                      ? "border-pos-muted/10 opacity-40 cursor-not-allowed"
                      : "border-pos-muted/20 hover:border-pos-secondary hover:bg-pos-secondary/5"
                  }`}
                >
                  <span className="text-3xl mb-1">📒</span>
                  <span className="text-sm font-semibold text-pos-text">
                    Cuenta Corriente
                  </span>
                </button>
              </div>
              {!selectedCustomer && paymentMethod === null && (
                <p className="text-xs text-pos-muted text-center -mt-2">
                  Seleccioná un cliente para usar cuenta corriente
                </p>
              )}
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
                    inputMode="decimal"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="Monto recibido"
                    min={total}
                    step="0.01"
                    aria-label="Monto recibido en efectivo"
                    className="w-full border border-pos-muted/30 rounded-xl px-4 py-3 text-lg font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    autoFocus
                  />

                {parsedCash >= total && parsedCash > 0 && (
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

          {/* Mixed payment inputs */}
          {paymentMethod === "mixed" && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-pos-muted uppercase tracking-wide mb-2">
                Pago Mixto
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-pos-muted mb-1">Efectivo</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full border border-pos-muted/30 rounded-xl px-3 py-2 text-lg font-mono text-center focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-pos-muted mb-1">Tarjeta</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={cardAmount}
                    onChange={(e) => setCardAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full border border-pos-muted/30 rounded-xl px-3 py-2 text-lg font-mono text-center focus:outline-none focus:ring-2 focus:ring-pos-secondary touch-target bg-pos-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
              {enteredTotal > 0 && (
                <div className="flex items-center justify-between text-sm bg-pos-background/50 rounded-xl px-3 py-2">
                  <span className="text-pos-muted">Total ingresado</span>
                  <span className={`font-mono font-bold ${enteredTotal >= total ? "text-pos-success" : "text-pos-danger"}`}>
                    ${enteredTotal.toFixed(2)}
                  </span>
                </div>
              )}
              {enteredTotal > total && parsedCard > 0 && (
                <div className="flex items-center justify-between bg-pos-success/10 border border-pos-success/20 rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-pos-success">Vuelto (efectivo)</span>
                  <span className="text-lg font-bold font-mono text-pos-success">
                    ${change.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Credit indicator */}
          {paymentMethod === "credit" && selectedCustomer && (
            <div className="bg-pos-accent/10 border border-pos-accent/20 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-pos-accent">📒 Cuenta Corriente</p>
                <span className="text-sm font-mono font-bold">${total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-pos-muted">
                Se suma a la cuenta de <span className="font-semibold text-pos-text">{selectedCustomer.name}</span>
              </p>
              <p className="text-xs text-pos-danger mt-1">
                Saldo actual: ${(selectedCustomer.creditBalance ?? 0).toFixed(2)}
              </p>
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
