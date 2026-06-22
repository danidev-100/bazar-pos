import { useEffect, useCallback, useState, useRef } from "react";
import { useAppStore } from "@/store";
import { useProductsStore } from "@/store/products";
import { useActiveStore } from "@/store/context";
import { useInvoicesStore } from "@/store/invoices";
import { useAuthStore } from "@/store/auth";
import { useCashClosingStore } from "@/store/cash-closing";
import { exportInvoicePdf } from "@/lib/pdf-export";
import ProductGrid from "@/components/ProductGrid";
import CartPanel from "@/components/CartPanel";
import CheckoutModal from "@/components/CheckoutModal";
import CustomerSelectModal from "@/components/CustomerSelectModal";
import OpenShiftModal from "@/components/OpenShiftModal";
import NoStockModal from "@/components/NoStockModal";
import ReceiptPreview from "@/components/ReceiptPreview";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useBarcodeScan } from "@/hooks/useBarcodeScan";

// ──────────────────────────────────────────────
// Demo seed data — runs once on first POSPage mount
// ──────────────────────────────────────────────

let seeded = false;

function seedDemoProducts() {
  if (seeded) return;
  seeded = true;

  const store = useProductsStore.getState();
  if (store.products.length > 0) return; // already has data

  const bebidas = store.addCategory({
    name: "Bebidas",
    parent_id: null,
    store_id: "store_1",
  });
  const lacteos = store.addCategory({
    name: "Lácteos",
    parent_id: null,
    store_id: "store_1",
  });
  const almacen = store.addCategory({
    name: "Almacén",
    parent_id: null,
    store_id: "store_1",
  });

  store.addProduct({
    barcode: "77912345",
    name: "Coca-Cola 500ml",
    price: 150,
    stock: 100,
    category_id: bebidas.id,
    store_id: "store_1",
  });
  store.addProduct({
    barcode: "77912346",
    name: "Agua Mineral 1L",
    price: 120,
    stock: 80,
    category_id: bebidas.id,
    store_id: "store_1",
  });
  store.addProduct({
    barcode: "77912347",
    name: "Leche Entera 1L",
    price: 200,
    stock: 50,
    category_id: lacteos.id,
    store_id: "store_1",
  });
  store.addProduct({
    barcode: "77912348",
    name: "Yogur Natural 200g",
    price: 180,
    stock: 40,
    category_id: lacteos.id,
    store_id: "store_1",
  });
  store.addProduct({
    barcode: "77912349",
    name: "Arroz 1kg",
    price: 250,
    stock: 60,
    category_id: almacen.id,
    store_id: "store_1",
  });
  store.addProduct({
    barcode: "77912350",
    name: "Fideos Tallarín 500g",
    price: 120,
    stock: 90,
    category_id: almacen.id,
    store_id: "store_1",
  });
  store.addProduct({
    barcode: "77912351",
    name: "Aceite Girasol 1.5L",
    price: 450,
    stock: 30,
    category_id: almacen.id,
    store_id: "store_1",
  });
  store.addProduct({
    barcode: "77912352",
    name: "Harina 0000 1kg",
    price: 180,
    stock: 45,
    category_id: almacen.id,
    store_id: "store_1",
  });
  store.addProduct({
    barcode: "77912353",
    name: "Azúcar 1kg",
    price: 220,
    stock: 55,
    category_id: almacen.id,
    store_id: "store_1",
  });
  store.addProduct({
    barcode: "77912354",
    name: "Yerba Mate 1kg",
    price: 380,
    stock: 35,
    category_id: almacen.id,
    store_id: "store_1",
  });
  store.addProduct({
    barcode: "77912355",
    name: "Galletitas Saladas",
    price: 160,
    stock: 70,
    category_id: almacen.id,
    store_id: "store_1",
  });
  store.addProduct({
    barcode: "77912356",
    name: "Jugo Naranja 1L",
    price: 190,
    stock: 8,
    category_id: bebidas.id,
    store_id: "store_1",
  });

  // Also seed store_2 with a few products for cross-store testing
  const store2Bebidas = store.addCategory({
    name: "Bebidas",
    parent_id: null,
    store_id: "store_2",
  });
  store.addProduct({
    barcode: "77922345",
    name: "Sprite 500ml",
    price: 140,
    stock: 50,
    category_id: store2Bebidas.id,
    store_id: "store_2",
  });
  store.addProduct({
    barcode: "77922346",
    name: "Fanta Naranja 500ml",
    price: 140,
    stock: 40,
    category_id: store2Bebidas.id,
    store_id: "store_2",
  });
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function POSPage() {
  const { storeId } = useActiveStore();
  const showNotification = useAppStore((s) => s.showNotification);
  const dismissNotification = useAppStore((s) => s.dismissNotification);
  const addItem = useAppStore((s) => s.addItem);
  const lastCompletedSale = useAppStore((s) => s.lastCompletedSale);
  const dismissReceipt = useAppStore((s) => s.dismissReceipt);
  const setPage = useAppStore((s) => s.setPage);
  const currentUser = useAuthStore((s) => s.currentUser);
  const shifts = useCashClosingStore((s) => s.shifts);
  const openShiftAction = useCashClosingStore((s) => s.openShift);

  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [noStockProduct, setNoStockProduct] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const hintShown = useRef(false);

  // Check for open shift (reactively — subscribes to shifts)
  const openShiftData = shifts.find(
    (s) => s.storeId === storeId && s.status === "open",
  ) ?? null;
  const hasOpenShift = openShiftData !== null;

  // Seed demo products on first mount
  useEffect(() => {
    seedDemoProducts();
  }, []);

  // Hint toast on first POS load
  useEffect(() => {
    if (hintShown.current) return;
    hintShown.current = true;
    showNotification("⌨️ F1 Cobrar · F2 Buscar · F3 Nueva venta · +/- Cantidad");
    const timer = setTimeout(() => dismissNotification(), 5000);
    return () => clearTimeout(timer);
  }, [showNotification, dismissNotification]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCheckout: useCallback(() => {
      const { items } = useAppStore.getState();
      if (items.length === 0) return;
      const openShift = useCashClosingStore.getState().getOpenShift(storeId);
      if (!openShift) {
        useAppStore.getState().showNotification("Abrí un turno en Caja antes de cobrar");
        setTimeout(() => useAppStore.getState().dismissNotification(), 4000);
        return;
      }
      setShowCheckout(true);
    }, [storeId]),
    onFocusSearch: useCallback(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, []),
    onNewSale: useCallback(() => {
      const { items } = useAppStore.getState();
      if (items.length === 0) return;
      if (window.confirm("¿Iniciar una nueva venta? Se borrará el carrito actual.")) {
        useAppStore.getState().clearCart();
        setShowCheckout(false);
        setShowReceipt(false);
        setShowCustomerSelect(false);
        dismissNotification();
      }
    }, [dismissNotification]),
    onIncreaseQty: useCallback(() => {
      const { selectedCartItemId, items, updateQuantity } = useAppStore.getState();
      if (selectedCartItemId == null) return;
      const item = items.find((i) => i.productId === selectedCartItemId);
      if (item) updateQuantity(selectedCartItemId, item.quantity + 1);
    }, []),
    onDecreaseQty: useCallback(() => {
      const { selectedCartItemId, items, updateQuantity } = useAppStore.getState();
      if (selectedCartItemId == null) return;
      const item = items.find((i) => i.productId === selectedCartItemId);
      if (item) updateQuantity(selectedCartItemId, item.quantity - 1);
    }, []),
    onEscape: useCallback(() => {
      if (showReceipt) {
        setShowReceipt(false);
        useAppStore.getState().dismissReceipt();
      } else if (showCheckout) {
        setShowCheckout(false);
      } else if (showCustomerSelect) {
        setShowCustomerSelect(false);
      }
    }, [showReceipt, showCheckout, showCustomerSelect]),
  });

  // Barcode scan hook
  const storeProducts = useProductsStore((s) => s.products);
  const { scanFlash } = useBarcodeScan(storeProducts, {
    onMatch: useCallback(
      (id: number, name: string, price: number) => {
        if (!hasOpenShift) {
          showNotification("Abrí un turno antes de vender");
          setTimeout(() => dismissNotification(), 4000);
          return;
        }
        const prod = useProductsStore.getState().products.find(
          (p) => p.id === id,
        );
        if (prod && prod.stock <= 0) {
          setNoStockProduct(name);
          return;
        }
        addItem(id, name, price);
      },
      [addItem, showNotification, dismissNotification, hasOpenShift],
    ),
    onMiss: useCallback(
      (barcode: string) => {
        showNotification(`Código ${barcode} no encontrado`);
        setTimeout(() => dismissNotification(), 3000);
      },
      [showNotification, dismissNotification],
    ),
  });

  // Show receipt when a sale completes
  useEffect(() => {
    if (lastCompletedSale) {
      setShowCheckout(false);
      setShowReceipt(true);
    }
  }, [lastCompletedSale]);

  function handleOpenShift() {
    setShowOpenShift(true);
  }

  function handleShiftOpened() {
    const employee = currentUser?.name ?? "Cajero";
    showNotification(`Turno abierto — ${employee}`);
    setTimeout(() => dismissNotification(), 3000);
  }

  const handleAddToCart = useCallback(
    (product: { id: number; name: string; price: number }) => {
      // Check open shift
      if (!hasOpenShift) {
        showNotification("Abrí un turno antes de vender");
        setTimeout(() => dismissNotification(), 4000);
        return;
      }
      // Check price
      if (!product.price || product.price <= 0) {
        showNotification("El producto no tiene precio");
        setTimeout(() => dismissNotification(), 3000);
        return;
      }
      // Check stock
      const prod = useProductsStore.getState().products.find(
        (p) => p.id === product.id,
      );
      if (prod && prod.stock <= 0) {
        setNoStockProduct(product.name);
        return;
      }
      addItem(product.id, product.name, product.price);
    },
    [addItem, showNotification, dismissNotification, hasOpenShift],
  );

  function handleCheckout() {
    if (!hasOpenShift) {
      showNotification("Abrí un turno en Caja antes de cobrar");
      setTimeout(() => dismissNotification(), 4000);
      return;
    }
    const store = useProductsStore.getState();
    if (store.products.length === 0) {
      showNotification("Agregá productos antes de cobrar");
      setTimeout(() => dismissNotification(), 3000);
      return;
    }
    setShowCheckout(true);
  }

  function handleCheckoutComplete() {
    setShowCheckout(false);
    // Receipt will auto-show via the useEffect above
  }

  function handleRefund() {
    if (!lastCompletedSale) return;
    const refundSale = useAppStore.getState().refundSale;
    refundSale(lastCompletedSale.id);
    showNotification(`Venta #${lastCompletedSale.id} devuelta — stock restablecido`);
    setTimeout(() => dismissNotification(), 4000);
  }

  function handlePrint() {
    if (!lastCompletedSale) return;

    const invoice = useInvoicesStore
      .getState()
      .generateInvoice(
        lastCompletedSale,
        lastCompletedSale.customerName ?? undefined,
      );

    exportInvoicePdf(invoice);

    showNotification(`Factura ${invoice.invoiceNumber} — elegí "Guardar como PDF" en el diálogo de impresión`);
    setTimeout(() => dismissNotification(), 5000);
  }

  function handleNewSale() {
    setShowReceipt(false);
    dismissReceipt();
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* ── Cash Register Gate ── */}
      {!hasOpenShift ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-lg font-semibold text-pos-text mb-2">
              No hay caja abierta
            </h2>
            <p className="text-sm text-pos-muted mb-6">
              Necesitás abrir un turno antes de poder vender. Tus ventas se registran dentro del turno abierto.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleOpenShift}
                className="px-6 py-3 bg-pos-secondary text-white rounded-xl font-medium text-sm touch-target hover:opacity-90 transition-opacity"
              >
                Abrir Turno como {currentUser?.name ?? "Cajero"}
              </button>
              <button
                onClick={() => setPage("cash-closing")}
                className="text-sm text-pos-secondary hover:underline touch-target"
              >
                Ir a Caja
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Left: Product Grid ── */}
          <section className={`flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-4 overflow-y-auto ${scanFlash ? "scan-flash" : ""}`}>
            <ProductGrid onAddToCart={handleAddToCart} searchInputRef={searchInputRef} />
          </section>

          {/* ── Right: Cart Panel ── */}
          <aside className="w-full lg:w-96 flex-shrink-0 bg-pos-surface rounded-xl border border-pos-muted/10 p-4 overflow-y-auto max-h-64 lg:max-h-full">
            <CartPanel
              onCheckout={handleCheckout}
              onSelectCustomer={() => setShowCustomerSelect(true)}
              onOpenShift={handleOpenShift}
            />
          </aside>
        </>
      )}

      {/* ── Customer Select Modal ── */}
      {showCustomerSelect && (
        <CustomerSelectModal
          onSelect={(customer) => {
            useAppStore.getState().selectCustomer(customer);
            setShowCustomerSelect(false);
          }}
          onClose={() => setShowCustomerSelect(false)}
        />
      )}

      {/* ── Checkout Modal ── */}
      {showCheckout && (
        <CheckoutModal
          onClose={() => setShowCheckout(false)}
          onComplete={handleCheckoutComplete}
        />
      )}

      {/* ── Receipt Preview ── */}
      {showReceipt && lastCompletedSale && (
        <ReceiptPreview
          sale={lastCompletedSale}
          onPrint={handlePrint}
          onClose={handleNewSale}
          onRefund={handleRefund}
        />
      )}

      {/* ── Open Shift Modal ── */}
      {showOpenShift && (
        <OpenShiftModal
          employeeName={currentUser?.name ?? "Cajero"}
          onClose={() => setShowOpenShift(false)}
          onOpened={handleShiftOpened}
        />
      )}

      {/* ── No Stock Modal ── */}
      {noStockProduct !== null && (
        <NoStockModal
          productName={noStockProduct}
          onClose={() => setNoStockProduct(null)}
        />
      )}
    </div>
  );
}


