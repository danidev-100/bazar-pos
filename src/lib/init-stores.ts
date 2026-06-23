import { select } from "@/lib/db";
import { useBrandsStore, setNextBrandId } from "@/store/brands";
import { useProductsStore, setNextProductId, setNextCategoryId, setNextMovementId } from "@/store/products";
import { useCustomersStore, setNextCustomerId } from "@/store/customers";
import { useProveedoresStore, setNextProveedorId } from "@/store/proveedores";
import { usePedidosStore, setNextPedidoId, setNextPedidoItemId } from "@/store/pedidos";
import { useInvoicesStore, setNextInvoiceId, setNextInvoiceItemId } from "@/store/invoices";
import { useCashClosingStore } from "@/store/cash-closing";

let initialized = false;

export async function initAllStores(): Promise<void> {
  if (initialized) return;
  initialized = true;

  await Promise.all([
    initBrands(),
    initProducts(),
    initCustomers(),
    initProveedores(),
    initPedidos(),
    initInvoices(),
    initShifts(),
  ]);
}

// â”€â”€ Brands â”€â”€

async function initBrands(): Promise<void> {
  try {
    const rows = await select<any>("SELECT id, name, store_id FROM brands");
    const brands = rows.map((r: any) => ({ id: r.id, name: r.name, store_id: r.store_id }));
    const maxId = brands.reduce((m: number, b: any) => Math.max(m, b.id), 0);
    useBrandsStore.setState({ brands });
    setNextBrandId(maxId + 1);
  } catch { /* table may not exist yet */ }
}

// â”€â”€ Products + Categories + StockMovements â”€â”€

async function initProducts(): Promise<void> {
  try {
    const [productRows, catRows, movRows] = await Promise.all([
      select<any>("SELECT id, barcode, name, price, cost_price, stock, min_stock, category_id, brand_id, store_id FROM products"),
      select<any>("SELECT id, name, parent_id, store_id FROM categories"),
      select<any>("SELECT id, product_id, type, quantity, delta, reference_id, user_id, store_id, created_at FROM stock_movements"),
    ]);

    const products = productRows.map((r: any) => ({
      id: r.id,
      barcode: r.barcode,
      name: r.name,
      price: r.price,
      costPrice: r.cost_price,
      stock: r.stock,
      minStock: r.min_stock,
      category_id: r.category_id,
      brandId: r.brand_id,
      store_id: r.store_id,
    }));

    const categories = catRows.map((r: any) => ({
      id: r.id,
      name: r.name,
      parent_id: r.parent_id,
      store_id: r.store_id,
    }));

    const stockMovements = movRows.map((r: any) => ({
      id: r.id,
      product_id: r.product_id,
      type: r.type,
      quantity: r.quantity,
      delta: r.delta,
      reference_id: r.reference_id,
      user_id: r.user_id,
      store_id: r.store_id,
      created_at: r.created_at,
    }));

    const maxProductId = products.reduce((m: number, p: any) => Math.max(m, p.id), 0);
    const maxCatId = categories.reduce((m: number, c: any) => Math.max(m, c.id), 0);
    const maxMovId = stockMovements.reduce((m: number, mv: any) => Math.max(m, mv.id), 0);

    useProductsStore.setState({ products, categories, stockMovements });
    setNextProductId(maxProductId + 1);
    setNextCategoryId(maxCatId + 1);
    setNextMovementId(maxMovId + 1);
  } catch { /* table may not exist yet */ }
}

// â”€â”€ Customers â”€â”€

async function initCustomers(): Promise<void> {
  try {
    const [customerRows, paymentRows] = await Promise.all([
      select<any>("SELECT id, name, phone, email, address, cuit, credit_balance, store_id FROM customers"),
      select<any>("SELECT id, customer_id, amount, date, notes, sale_id, store_id FROM credit_payments"),
    ]);
    const customers = customerRows.map((r: any) => ({
      id: r.id,
      name: r.name,
      phone: r.phone ?? "",
      email: r.email ?? "",
      address: r.address ?? "",
      cuit: r.cuit ?? "",
      store_id: r.store_id,
      creditBalance: r.credit_balance ?? 0,
    }));
    const creditPayments = paymentRows.map((r: any) => ({
      id: r.id,
      customer_id: r.customer_id,
      amount: r.amount,
      date: r.date,
      notes: r.notes ?? "",
      sale_id: r.sale_id,
      store_id: r.store_id,
    }));
    const maxId = customers.reduce((m: number, c: any) => Math.max(m, c.id), 0);
    useCustomersStore.setState({ customers, creditPayments });
    setNextCustomerId(maxId + 1);
  } catch { /* table may not exist yet */ }
}

// â”€â”€ Proveedores â”€â”€

async function initProveedores(): Promise<void> {
  try {
    const rows = await select<any>("SELECT id, name, phone, email, address, cuit, store_id FROM proveedores");
    const proveedores = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      phone: r.phone ?? "",
      email: r.email ?? "",
      address: r.address ?? "",
      cuit: r.cuit ?? "",
      store_id: r.store_id,
    }));
    const maxId = proveedores.reduce((m: number, p: any) => Math.max(m, p.id), 0);
    useProveedoresStore.setState({ proveedores });
    setNextProveedorId(maxId + 1);
  } catch { /* table may not exist yet */ }
}

// â”€â”€ Pedidos + Items â”€â”€

async function initPedidos(): Promise<void> {
  try {
    const [pedidoRows, itemRows] = await Promise.all([
      select<any>("SELECT id, proveedor_id, date, status, total, notes, store_id FROM pedidos"),
      select<any>("SELECT id, pedido_id, product_id, product_name, quantity, unit_price, subtotal FROM pedido_items"),
    ]);

    // Build a proveedor name map
    const proveedores = useProveedoresStore.getState().proveedores;
    const provNameMap = new Map(proveedores.map((p) => [p.id, p.name]));

    // Group items by pedido_id
    const itemsByPedido = new Map<number, any[]>();
    for (const item of itemRows) {
      const list = itemsByPedido.get(item.pedido_id) ?? [];
      list.push(item);
      itemsByPedido.set(item.pedido_id, list);
    }

    let maxItemId = 0;

    const pedidos = pedidoRows.map((r: any) => {
      const items = (itemsByPedido.get(r.id) ?? []).map((i: any) => {
        maxItemId = Math.max(maxItemId, i.id);
        return {
          id: i.id,
          pedido_id: i.pedido_id,
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.subtotal,
        };
      });

      return {
        id: r.id,
        proveedor_id: r.proveedor_id,
        proveedor_name: provNameMap.get(r.proveedor_id) ?? "â€”",
        date: r.date,
        status: r.status,
        total: r.total,
        notes: r.notes ?? "",
        items,
        store_id: r.store_id,
      };
    });

    const maxPedidoId = pedidos.reduce((m: number, p: any) => Math.max(m, p.id), 0);

    usePedidosStore.setState({ pedidos });
    setNextPedidoId(maxPedidoId + 1);
    setNextPedidoItemId(maxItemId + 1);
  } catch { /* table may not exist yet */ }
}

// â”€â”€ Invoices + Items â”€â”€

async function initInvoices(): Promise<void> {
  try {
    const [invRows, itemRows] = await Promise.all([
      select<any>("SELECT id, invoice_number, sale_id, customer_name, total, payment_method, store_id, created_at FROM invoices"),
      select<any>("SELECT id, invoice_id, product_name, quantity, unit_price, subtotal FROM invoice_items"),
    ]);

    // Group items by invoice_id
    const itemsByInvoice = new Map<number, any[]>();
    for (const item of itemRows) {
      const list = itemsByInvoice.get(item.invoice_id) ?? [];
      list.push(item);
      itemsByInvoice.set(item.invoice_id, list);
    }

    // Compute max sequential number per store for counters
    const counters: Record<string, number> = {};

    const invoices = invRows.map((r: any) => {
      const storeId = r.store_id;
      const seqNum = r.invoice_number;
      counters[storeId] = Math.max(counters[storeId] ?? 0, seqNum);

      const items = (itemsByInvoice.get(r.id) ?? []).map((i: any) => ({
        productId: i.product_id,
        productName: i.product_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        subtotal: i.subtotal,
      }));

      return {
        id: r.id,
        invoiceNumber: `INV-${storeId}-${String(seqNum).padStart(5, "0")}`,
        sequentialNumber: seqNum,
        saleId: r.sale_id,
        customer: r.customer_name ?? "Consumidor Final",
        items,
        total: r.total,
        paymentMethod: r.payment_method,
        date: r.created_at,
        storeId,
        createdBy: r.created_by ?? "—",
      };
    });

    const maxId = invoices.reduce((m: number, inv: any) => Math.max(m, inv.id), 0);

    useInvoicesStore.setState({ invoices, counters });
    setNextInvoiceId(maxId + 1);
  } catch { /* table may not exist yet */ }
}

// â”€â”€ Shifts â”€â”€

async function initShifts(): Promise<void> {
  try {
    const rows = await select<any>("SELECT id, employee_name, open_time, close_time, status, store_id, opening_balance, declared_cash, variance, reconciliation_status, reconciled_at FROM shifts");

    const shifts = rows.map((r: any) => ({
      id: r.id,
      employee: r.employee_name,
      openTime: r.open_time,
      closeTime: r.close_time,
      status: r.status,
      storeId: r.store_id,
      openingBalance: r.opening_balance ?? 0,
      declaredCash: r.declared_cash,
      variance: r.variance,
      reconciliationStatus: r.reconciliation_status,
      reconciledAt: r.reconciled_at,
    }));

    useCashClosingStore.setState({ shifts });
  } catch { /* table may not exist yet */ }
}
