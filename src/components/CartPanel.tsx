import { useAppStore } from "@/store";
import { useAuthStore } from "@/store/auth";

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

type CartPanelProps = {
  onCheckout: () => void;
  onSelectCustomer?: () => void;
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function CartPanel({
  onCheckout,
  onSelectCustomer,
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

  const total = cartTotal();
  const count = itemCount();
  const isEmpty = items.length === 0;
  const cashierName = currentUser?.name ?? "—";

  return (
    <div className="flex flex-col h-full">
      {/* Header — shows cashier name */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
          Cajero: <span className="font-mono normal-case">{cashierName}</span>
          {count > 0 && (
            <span className="text-pos-muted font-normal normal-case ml-1">
              — {count} {count === 1 ? "producto" : "productos"}
            </span>
          )}
        </h2>
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
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                    className="w-9 h-9 flex items-center justify-center bg-pos-background border border-pos-muted/20 rounded-lg text-pos-text font-bold text-lg touch-target hover:bg-pos-muted/10 transition-colors"
                    aria-label={`Disminuir cantidad de ${item.productName}`}
                  >
                    −
                  </button>

                  <span className="w-10 text-center text-sm font-bold font-mono text-pos-text tabular-nums">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1)
                    }
                    className="w-9 h-9 flex items-center justify-center bg-pos-background border border-pos-muted/20 rounded-lg text-pos-text font-bold text-lg touch-target hover:bg-pos-muted/10 transition-colors"
                    aria-label={`Aumentar cantidad de ${item.productName}`}
                  >
                    +
                  </button>
                </div>
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
    </div>
  );
}
