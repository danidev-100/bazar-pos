import { useAppStore, type CompletedSale } from "@/store";

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

type ReceiptPreviewProps = {
  sale: CompletedSale;
  onPrint: () => void;
  onClose: () => void;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ReceiptPreview({
  sale,
  onPrint,
  onClose,
}: ReceiptPreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
        {/* Receipt paper */}
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="text-center border-b border-dashed border-pos-muted/20 pb-4">
            <h2 className="text-lg font-bold text-pos-text">Sale Complete</h2>
            <p className="text-xs text-pos-muted font-mono mt-1">
              #{String(sale.id).padStart(6, "0")}
            </p>
          </div>

          {/* Store info */}
          <div className="text-center">
            <p className="text-sm font-medium text-pos-text">
              Store: {sale.storeId}
            </p>
            <p className="text-xs text-pos-muted font-mono mt-0.5">
              {formatDate(sale.date)}
            </p>
          </div>

          {/* Items */}
          <div className="border-t border-dashed border-pos-muted/20 pt-3">
            <h3 className="text-xs font-semibold text-pos-muted uppercase tracking-wide mb-2">
              Items
            </h3>
            <div className="space-y-2">
              {sale.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-start justify-between text-sm"
                >
                  <div className="flex-1 mr-2">
                    <span className="text-pos-text font-medium">
                      {item.productName}
                    </span>
                    <span className="text-pos-muted ml-1">
                      x{item.quantity}
                    </span>
                    <div className="text-xs text-pos-muted font-mono">
                      ${item.unitPrice.toFixed(2)} each
                    </div>
                  </div>
                  <span className="font-mono font-medium text-pos-text whitespace-nowrap">
                    ${item.subtotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-pos-muted/20 pt-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-pos-muted">Subtotal</span>
              <span className="font-mono">${sale.total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-pos-muted">Tax</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex items-center justify-between text-base font-bold pt-1 border-t border-pos-muted/10">
              <span className="text-pos-text">Total</span>
              <span className="font-mono text-pos-secondary">
                ${sale.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment info */}
          <div className="border-t border-dashed border-pos-muted/20 pt-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-pos-muted">Payment</span>
              <span className="font-medium capitalize">
                {sale.paymentMethod}
              </span>
            </div>
            {sale.paymentMethod === "cash" && sale.amountPaid != null && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-pos-muted">Amount Paid</span>
                  <span className="font-mono">
                    ${sale.amountPaid.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-pos-success">Change</span>
                  <span className="font-mono text-pos-success">
                    ${(sale.change ?? 0).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="border-t-2 border-double border-pos-muted/20 pt-3 text-center">
            <p className="text-xs text-pos-muted font-mono tracking-widest">
              • • • THANK YOU • • •
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onPrint}
              className="flex-1 px-4 py-3 border-2 border-pos-secondary text-pos-secondary rounded-xl font-bold text-sm touch-target hover:bg-pos-secondary/5 transition-colors"
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-pos-secondary text-white rounded-xl font-bold text-sm touch-target hover:opacity-90 transition-opacity"
            >
              New Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
