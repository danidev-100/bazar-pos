import { useAppStore } from "@/store";

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

type CartPanelProps = {
  onCheckout: () => void;
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function CartPanel({ onCheckout }: CartPanelProps) {
  const items = useAppStore((s) => s.items);
  const addItem = useAppStore((s) => s.addItem);
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  const removeItem = useAppStore((s) => s.removeItem);
  const cartTotal = useAppStore((s) => s.cartTotal);
  const itemCount = useAppStore((s) => s.itemCount);

  const total = cartTotal();
  const count = itemCount();
  const isEmpty = items.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
          Cart
          {count > 0 && (
            <span className="text-pos-muted font-normal normal-case ml-1">
              — {count} item{count !== 1 ? "s" : ""}
            </span>
          )}
        </h2>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {isEmpty ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-pos-muted italic">
              Cart is empty. Tap a product to add it.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.productId}
              className="bg-pos-surface border border-pos-muted/10 rounded-xl p-3"
            >
              {/* Product name + remove */}
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-pos-text leading-tight flex-1 mr-2">
                  {item.productName}
                </span>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-pos-danger text-lg leading-none touch-target w-8 h-8 flex items-center justify-center rounded-lg hover:bg-pos-danger/10 transition-colors"
                  aria-label={`Remove ${item.productName} from cart`}
                >
                  ✕
                </button>
              </div>

              {/* Price + quantity controls */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-pos-muted">
                  ${item.unitPrice.toFixed(2)} each
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                    className="w-9 h-9 flex items-center justify-center bg-pos-background border border-pos-muted/20 rounded-lg text-pos-text font-bold text-lg touch-target hover:bg-pos-muted/10 transition-colors"
                    aria-label={`Decrease quantity of ${item.productName}`}
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
                    aria-label={`Increase quantity of ${item.productName}`}
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
          ))
        )}
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
            <span className="text-pos-muted">Tax</span>
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
            Checkout — ${total.toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );
}
