import { useEffect, useCallback, useState } from "react";
import { useAppStore } from "@/store";
import { useProductsStore } from "@/store/products";
import { useActiveStore } from "@/store/context";
import { useInvoicesStore } from "@/store/invoices";
import { exportInvoicePdf } from "@/lib/pdf-export";
import ProductGrid from "@/components/ProductGrid";
import CartPanel from "@/components/CartPanel";
import CheckoutModal from "@/components/CheckoutModal";
import ReceiptPreview from "@/components/ReceiptPreview";

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
    stock: 25,
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

  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  // Seed demo products on first mount
  useEffect(() => {
    seedDemoProducts();
  }, []);

  // Show receipt when a sale completes
  useEffect(() => {
    if (lastCompletedSale) {
      setShowCheckout(false);
      setShowReceipt(true);
    }
  }, [lastCompletedSale]);

  const handleAddToCart = useCallback(
    (product: { id: number; name: string; price: number }) => {
      if (!product.price || product.price <= 0) {
        showNotification("El producto no tiene precio");
        setTimeout(() => dismissNotification(), 3000);
        return;
      }
      addItem(product.id, product.name, product.price);
    },
    [addItem, showNotification, dismissNotification],
  );

  function handleCheckout() {
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

  function handlePrint() {
    if (!lastCompletedSale) return;

    const invoice = useInvoicesStore
      .getState()
      .generateInvoice(
        lastCompletedSale,
        lastCompletedSale.customerName ?? undefined,
      );

    exportInvoicePdf(invoice);

    showNotification(`Factura ${invoice.invoiceNumber} generada`);
    setTimeout(() => dismissNotification(), 3000);
  }

  function handleNewSale() {
    setShowReceipt(false);
    dismissReceipt();
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* ── Left: Product Grid ── */}
      <section className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-4 overflow-y-auto">
        <ProductGrid onAddToCart={handleAddToCart} />
      </section>

      {/* ── Right: Cart Panel ── */}
      <aside className="w-full lg:w-96 flex-shrink-0 bg-pos-surface rounded-xl border border-pos-muted/10 p-4 overflow-y-auto max-h-64 lg:max-h-full">
        <CartPanel onCheckout={handleCheckout} />
      </aside>

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
        />
      )}
    </div>
  );
}


