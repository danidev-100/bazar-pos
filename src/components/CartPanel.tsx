import { useState } from "react";
import { useAppStore } from "@/store";
import { useProductsStore } from "@/store/products";
import { useAuthStore } from "@/store/auth";
import { useCashClosingStore } from "@/store/cash-closing";
import { useActiveStore } from "@/store/context";

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

type CartPanelProps = {
  onCheckout: () => void;
  onSelectCustomer?: () => void;
  onOpenShift?: () => void;
  onCloseShift?: () => void;
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function CartPanel({
  onCheckout,
  onSelectCustomer,
  onOpenShift,
  onCloseShift,
}: CartPanelProps) {
  const items = useAppStore((s) => s.items);
  const addItem = useAppStore((s) => s.addItem);
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  const removeItem = useAppStore((s) => s.removeItem);
  const cartTotal = useAppStore((s) => s.cartTotal);
  const itemCount = useAppStore((s) => s.itemCount);
  const selectedCustomer = useAppStore((s) => s.selectedCustomer);
  const selectedCartItemId = useAppStore((s) => s.selectedCartItemId);
  const selectCartItem = useAppStore((s) => s.selectCartItem);
  const clearSelectedCartItem = useAppStore((s) => s.clearSelectedCartItem);
  const currentUser = useAuthStore((s) => s.currentUser);
  const products = useProductsStore((s) => s.products);
  const { storeId } = useActiveStore();
  const getOpenShift = useCashClosingStore((s) => s.getOpenShift);
  const closeShift = useCashClosingStore((s) => s.closeShift);

  const total = cartTotal();
  const count = itemCount();
  const isEmpty = items.length === 0;
  const cashierName = currentUser?.name ?? "—";
  const openShift = getOpenShift(storeId);
  const hasOpenShift = openShift !== null;

  const [showCloseModal, setShowCloseModal] = useState(false);

  // Returns max quantity available for a product based on stock
  function getMaxQuantity(productId: number): number {
    const product = products.find((p) => p.id === productId);
    if (!product) return Infinity;
    // Total of this product already in cart
    const inCart = items
      .filter((i) => i.productId === productId)
      .reduce((sum, i) => sum + i.quantity, 0);
    // Remaining stock = product stock - already in cart + current item (to allow holding current)
    return Math.max(0, product.stock);
  }

  function safeUpdateQuantity(productId: number, qty: number) {
    const maxQty = getMaxQuantity(productId);
    if (qty > maxQty) {
      setStockError(productId);
      return;
    }
    updateQuantity(productId, Math.max(1, qty));
  }

  const [stockError, setStockErrorState] = useState<number | null>(null);

  function setStockError(productId: number) {
    setStockErrorState(productId);
    setTimeout(() => setStockErrorState(null), 2500);
  }

  function handleCloseShift() {
    setShowCloseModal(true);
  }

  function confirmCloseShift() {
    if (!openShift) return;
    closeShift(openShift.id);
    setShowCloseModal(false);
    onCloseShift?.();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header — cashier name + shift controls */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
          Cajero: <span className="font-mono normal-case">{cashierName}</span>
          {count > 0 && (
            <span className="text-pos-muted font-normal normal-case ml-1">
              — {count} {count === 1 ? "producto" : "productos"}
            </span>
          )}
        </h2>
      </div>

      {/* Shift status bar */}
      <div className="flex items-center justify-between mb-3 px-2 py-1.5 bg-pos-background/50 rounded-lg text-xs">
        {hasOpenShift ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-pos-success font-medium">● Abierto</span>
              {openShift!.openingBalance > 0 && (
                <span className="text-pos-muted font-mono">
                  Apert.: ${openShift!.openingBalance.toFixed(2)}
                </span>
              )}
            </div>
            <button
              onClick={handleCloseShift}
              className="text-pos-danger hover:text-pos-danger/80 touch-target px-2 py-0.5 rounded"
            >
              Cerrar
            </button>
          </>
        ) : (
          <>
            <span className="text-pos-muted">Sin turno abierto</span>
            {onOpenShift && (
              <button
                onClick={onOpenShift}
                className="text-pos-secondary hover:text-pos-secondary/80 touch-target px-2 py-0.5 rounded font-medium"
              >
                Abrir Turno
              </button>
            )}
          </>
        )}
      </div>

      {/* Selected customer */}
      <div className="flex items-center justify-between mb-3 text-sm bg-pos-background/50 rounded-lg px-3 py-2">
        <span className="text-pos-muted">
          Cliente:{" "}
          <span className="font-medium text-pos-text">
            {selectedCustomer?.name ?? "Consumidor Final"}
          </span>
        </span>
        {onSelectCustomer && (
          <button
            onClick={onSelectCustomer}
            className="text-pos-secondary text-xs font-medium touch-target px-2 py-1 rounded hover:bg-pos-secondary/10 transition-colors"
          >
            Cambiar
          </button>
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {isEmpty ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-pos-muted italic">
              El carrito está vacío. Tocá un producto para agregarlo.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.productId}
              onClick={() => selectCartItem(item.productId)}
              className={`bg-pos-surface border rounded-xl p-3 cursor-pointer transition-colors ${
                selectedCartItemId === item.productId
                  ? "border-pos-secondary ring-1 ring-pos-secondary/30"
                  : "border-pos-muted/10"
              }`}
            >
              {/* Product name + remove */}
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-pos-text leading-tight flex-1 mr-2">
                  {item.productName}
                </span>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-pos-danger text-lg leading-none touch-target w-8 h-8 flex items-center justify-center rounded-lg hover:bg-pos-danger/10 transition-colors"
                  aria-label={`Eliminar ${item.productName} del carrito`}
                >
                  ✕
                </button>
              </div>

              {/* Price + quantity controls */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-pos-muted">
                  ${item.unitPrice.toFixed(2)} c/u
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      safeUpdateQuantity(item.productId, item.quantity - 1)
                    }
                    className="w-9 h-9 flex items-center justify-center bg-pos-background border border-pos-muted/20 rounded-lg text-pos-text font-bold text-lg touch-target hover:bg-pos-muted/10 transition-colors"
                    aria-label={`Disminuir cantidad de ${item.productName}`}
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min={1}
                    max={getMaxQuantity(item.productId)}
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) {
                        safeUpdateQuantity(item.productId, val);
                      }
                    }}
                    className="w-14 text-center text-sm font-bold font-mono text-pos-text bg-pos-background border border-pos-muted/20 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-pos-secondary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    aria-label={`Cantidad de ${item.productName}`}
                  />

                  <button
                    onClick={() =>
                      safeUpdateQuantity(item.productId, item.quantity + 1)
                    }
                    className="w-9 h-9 flex items-center justify-center bg-pos-background border border-pos-muted/20 rounded-lg text-pos-text font-bold text-lg touch-target hover:bg-pos-muted/10 transition-colors"
                    aria-label={`Aumentar cantidad de ${item.productName}`}
                  >
                    +
                  </button>
                </div>

                {/* Stock warning */}
                {stockError === item.productId && (
                  <div className="text-[10px] text-pos-danger mt-1 text-right">
                    Stock insuficiente
                  </div>
                )}
              </div>

              {/* Line subtotal */}
              <div className="text-right mt-1">
                <span className="text-sm font-bold font-mono text-pos-text">
                  ${item.subtotal.toFixed(2)}
                </span>
              </div>
            </div>
          )))}
      </div>

      {/* Totals + checkout */}
      {!isEmpty && (
        <div className="mt-3 pt-3 border-t border-pos-muted/20 space-y-3">
          {/* Subtotal line */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-pos-muted">Subtotal</span>
            <span className="font-mono font-medium">${total.toFixed(2)}</span>
          </div>

          {/* Tax (placeholder — 0% for now) */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-pos-muted">Impuesto</span>
            <span className="font-mono font-medium">$0.00</span>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between text-base font-bold">
            <span className="text-pos-text">Total</span>
            <span className="font-mono text-pos-secondary text-lg">
              ${total.toFixed(2)}
            </span>
          </div>

          {/* Checkout button */}
          <button
            onClick={onCheckout}
            className="w-full py-3 bg-pos-accent text-white rounded-xl font-bold text-base touch-target hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            Cobrar — ${total.toFixed(2)}
          </button>
        </div>
      )}

      {/* ── Shift Close Confirmation Modal ── */}
      {showCloseModal && openShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-pos-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-base font-semibold text-pos-text mb-2">
              Cerrar Turno
            </h3>
            <p className="text-sm text-pos-muted mb-6">
              ¿Está seguro de cerrar el turno de <strong>{openShift.employee}</strong>?
              <br />
              No podrá registrar más ventas hasta abrir uno nuevo.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-5 py-2.5 text-sm text-pos-text border border-pos-muted/30 rounded-xl touch-target hover:bg-pos-background/50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmCloseShift}
                className="px-5 py-2.5 text-sm bg-pos-danger text-white rounded-xl font-medium touch-target hover:opacity-90"
              >
                Cerrar Turno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
