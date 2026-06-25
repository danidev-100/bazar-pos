/**
 * Seeder — genera datos de prueba masivos para verificar performance.
 *
 * Uso: import { runSeeder } from "@/lib/seeder"; runSeeder()
 *
 * Para ejecutar, abrí la consola del navegador (F12) en la app y:
 *   import("/src/lib/seeder.ts").then((m) => m.runSeeder())
 *
 * O agregá temporalmente un botón en AdminPage que llame a runSeeder().
 */

import { execute, enqueueSync } from "@/lib/db";

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────

const STORE_ID = "store_1";
const MONTHS_BACK = 6; // generar datos en los últimos 6 meses

const TARGETS = {
  categories: 80,
  brands: 40,
  products: 8000,
  customers: 2000,
  proveedores: 200,
  pedidos: 1000,
  comprobantes: 5000,
  expenses: 500,
} as const;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

let _seq = 0;
function uid(): string {
  return `${Date.now()}-${++_seq}-${Math.random().toString(36).slice(2, 6)}`;
}

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

/** Genera una fecha ISO (YYYY-MM-DD HH:mm:ss) aleatoria en los últimos N meses. */
function randomDate(monthsBack = MONTHS_BACK): string {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - monthsBack);
  const ts = start.getTime() + Math.random() * (now.getTime() - start.getTime());
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

function randomDateOnly(monthsBack = MONTHS_BACK): string {
  return randomDate(monthsBack).split(" ")[0];
}

// ──────────────────────────────────────────────
// Data pools
// ──────────────────────────────────────────────

const CATEGORY_NAMES = [
  "Lácteos", "Carnes", "Bebidas", "Panadería", "Limpieza",
  "Perfumería", "Almacén", "Congelados", "Frescos", "Mascotas",
  "Electrónica", "Hogar", "Jardinería", "Librería", "Juguetería",
  "Deportes", "Indumentaria", "Calzado", "Farmacia", "Bebés",
];

const BRAND_NAMES = [
  "Coca-Cola", "Pepsi", "Quilmes", "La Serenísima", "Sancor",
  "Arcor", "Molinos", "Mastellone", "Bagley", "Ledesma",
  "Nestlé", "Unilever", "Procter & Gamble", "SC Johnson", "Colgate",
  "Lays", "Oreo", "Sprite", "Fanta", "Schneider",
  "Paladini", "Danone", "Kraft", "Samsung", "LG",
  "Philips", "Braun", "Sony", "Panasonic", "Whirlpool",
  "Nike", "Adidas", "Puma", "Topper", "Reebok",
  "Liliana", "Atma", "Peabody", "Gafa", "Longvie",
];

const PRODUCT_ADJECTIVES = [
  "Premium", "Económico", "Ultra", "Mega", "Super",
  "Plus", "Max", "Light", "Zero", "Extra",
  "Clásico", "Moderno", "Pro", "Elite", "Básico",
];

const PRODUCT_NOUNS = [
  "Leche Entera", "Yogurt Bebible", "Queso Cremoso", "Dulce de Leche", "Manteca",
  "Milanesa de Pollo", "Carne Picada", "Chorizo", "Bife de Chorizo", "Pechuga",
  "Gaseosa Cola", "Agua Mineral", "Jugo de Naranja", "Cerveza Rubia", "Vino Tinto",
  "Pan Francés", "Pan de Hamburguesa", "Medialuna", "Bizcocho", "Pan Lactal",
  "Detergente", "Lavandina", "Limpiador Multiuso", "Jabón en Polvo", "Desodorante",
  "Shampoo", "Acondicionador", "Jabón de Tocador", "Crema Enjuague", "Perfume",
];

const CUSTOMER_FIRST_NAMES = [
  "Juan", "María", "Carlos", "Ana", "Pedro", "Laura", "José", "Sofía",
  "Diego", "Valentina", "Luis", "Camila", "Martín", "Florencia", "Pablo",
  "Lucía", "Alejandro", "Rocío", "Fernando", "Agustina", "Gabriel", "Micaela",
  "Santiago", "Victoria", "Matías", "Emilia", "Nicolás", "Candelaria",
  "Mauro", "Carolina", "Ramiro", "Lourdes", "Ezequiel", "Belén", "Gonzalo",
  "Gimena", "Federico", "Jazmín", "Ignacio", "Celeste",
];

const CUSTOMER_LAST_NAMES = [
  "García", "Rodríguez", "Martínez", "López", "Fernández",
  "González", "Pérez", "Romero", "Torres", "Álvarez",
  "Ruiz", "Díaz", "Moreno", "Castillo", "Medina",
  "Acosta", "Pereyra", "Sosa", "Ramos", "Vega",
  "Silva", "Ortiz", "Flores", "Rivas", "Paz",
];

const EXPENSE_DESCRIPTIONS = [
  "Alquiler del local", "Luz", "Agua", "Gas", "Internet",
  "Seguro", "Fumigación", "Limpieza", "Mantenimiento", "Reparación",
  "Sueldo empleado 1", "Sueldo empleado 2", "Sueldo empleado 3",
  "Monotributo", "IVA mensual", "Ingresos Brutos", "Tasa municipal",
  "Publicidad en redes", "Volantes", "Cartelería",
  "Mercadería insumos", "Bolsas", "Papel térmico", "Gastos bancarios",
];

const PROVEEDOR_PREFIXES = [
  "Distribuidora", "Importadora", "Alimentos", "Bebidas", "Lácteos",
  "Carnes", "Limpieza", "Perfumería", "Frescos", "Congelados",
];

// ──────────────────────────────────────────────
// Progress logging
// ──────────────────────────────────────────────

function log(msg: string) {
  console.log(`[Seeder] ${msg}`);
}

function progress(current: number, total: number, label: string) {
  if (current % 500 === 0 || current === total) {
    log(`${label}: ${current}/${total}`);
  }
}

// ──────────────────────────────────────────────
// Clear existing data
// ──────────────────────────────────────────────

async function clearAll(): Promise<void> {
  log("Limpiando datos existentes…");
  const tables = [
    "comprobante_items", "comprobantes",
    "pedido_items", "pedidos",
    "invoice_items", "invoices",
    "sale_items", "sales",
    "credit_payments", "customers",
    "stock_movements", "products",
    "categories", "brands",
    "expenses", "proveedores",
    "shifts", "cash_closings",
  ];
  for (const table of tables) {
    await execute(`DELETE FROM ${table}`);
  }
  log("Datos existentes eliminados.");
}

// ──────────────────────────────────────────────
// Seed categories & brands
// ──────────────────────────────────────────────

async function seedCategoriesBrands(): Promise<{
  categoryIds: number[];
  brandIds: number[];
}> {
  log(`Insertando ${TARGETS.categories} categorías…`);
  const categoryIds: number[] = [];
  for (let i = 0; i < TARGETS.categories; i++) {
    const name = `${pick(CATEGORY_NAMES)} ${i + 1}`;
    // Parent for first N categories, then subcategories
    const parentId = i < 10 ? null : pick(categoryIds.filter((id) => id <= 10));
    const now = randomDate();
    await execute(
      `INSERT INTO categories (name, parent_id, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, 'synced')`,
      [name, parentId ?? null, STORE_ID, now, now],
    );
    categoryIds.push(i + 1); // autoincrement starts at 1
    progress(i + 1, TARGETS.categories, "Categorías");
  }

  log(`Insertando ${TARGETS.brands} marcas…`);
  const brandIds: number[] = [];
  for (let i = 0; i < TARGETS.brands; i++) {
    const name = `${pick(BRAND_NAMES)} ${i + 1}`;
    const now = randomDate();
    await execute(
      `INSERT INTO brands (name, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, 'synced')`,
      [name, STORE_ID, now, now],
    );
    brandIds.push(i + 1);
    progress(i + 1, TARGETS.brands, "Marcas");
  }

  return { categoryIds, brandIds };
}

// ──────────────────────────────────────────────
// Seed products
// ──────────────────────────────────────────────

async function seedProducts(categoryIds: number[], brandIds: number[]): Promise<number[]> {
  log(`Insertando ${TARGETS.products} productos…`);
  const productIds: number[] = [];

  for (let i = 0; i < TARGETS.products; i++) {
    const adj = pick(PRODUCT_ADJECTIVES);
    const noun = pick(PRODUCT_NOUNS);
    const name = `${adj} ${noun} #${i + 1}`;
    const price = randFloat(50, 50000, 2);
    const costPrice = randFloat(price * 0.4, price * 0.85, 2);
    const stock = randInt(0, 500);
    const minStock = randInt(0, 20);
    const barcode = i < 5000 ? `BAR${String(i + 1).padStart(8, "0")}` : null;
    const categoryId = pick(categoryIds);
    const brandId = Math.random() > 0.15 ? pick(brandIds) : null;

    const now = randomDate();
    await execute(
      `INSERT INTO products (barcode, name, price, cost_price, stock, min_stock, category_id, brand_id, store_id, created_at, updated_at, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'synced')`,
      [barcode, name, price, costPrice, stock, minStock, categoryId, brandId, STORE_ID, now, now],
    );
    productIds.push(i + 1);
    progress(i + 1, TARGETS.products, "Productos");
  }

  return productIds;
}

// ──────────────────────────────────────────────
// Seed customers
// ──────────────────────────────────────────────

async function seedCustomers(): Promise<number[]> {
  log(`Insertando ${TARGETS.customers} clientes…`);
  const customerIds: number[] = [];

  for (let i = 0; i < TARGETS.customers; i++) {
    const first = pick(CUSTOMER_FIRST_NAMES);
    const last = pick(CUSTOMER_LAST_NAMES);
    const name = `${first} ${last}`;
    const phone = randInt(1000000000, 9999999999).toString();
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@email.com`;
    const address = `Calle ${pick(CUSTOMER_LAST_NAMES)} ${randInt(100, 5000)}`;
    const cuit = `${randInt(20, 30)}-${String(i + 1).padStart(8, "0")}-${randInt(0, 9)}`;
    const now = randomDate();

    await execute(
      `INSERT INTO customers (name, phone, email, address, cuit, credit_balance, store_id, created_at, updated_at, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'synced')`,
      [name, phone, email, address, cuit, 0, STORE_ID, now, now],
    );
    customerIds.push(i + 1);
    progress(i + 1, TARGETS.customers, "Clientes");
  }

  return customerIds;
}

// ──────────────────────────────────────────────
// Seed proveedores
// ──────────────────────────────────────────────

async function seedProveedores(): Promise<number[]> {
  log(`Insertando ${TARGETS.proveedores} proveedores…`);
  const proveedorIds: number[] = [];

  for (let i = 0; i < TARGETS.proveedores; i++) {
    const prefix = pick(PROVEEDOR_PREFIXES);
    const name = `${prefix} ${pick(CUSTOMER_LAST_NAMES)} #${i + 1}`;
    const phone = randInt(1000000000, 9999999999).toString();
    const email = `proveedor${i + 1}@email.com`;
    const address = `Av. ${pick(CUSTOMER_LAST_NAMES)} ${randInt(100, 5000)}`;
    const cuit = `${randInt(20, 30)}-${String(i + 1000).padStart(8, "0")}-${randInt(0, 9)}`;
    const now = randomDate();

    await execute(
      `INSERT INTO proveedores (name, phone, email, address, cuit, store_id, created_at, updated_at, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'synced')`,
      [name, phone, email, address, cuit, STORE_ID, now, now],
    );
    proveedorIds.push(i + 1);
    progress(i + 1, TARGETS.proveedores, "Proveedores");
  }

  return proveedorIds;
}

// ──────────────────────────────────────────────
// Seed pedidos (purchase orders)
// ──────────────────────────────────────────────

async function seedPedidos(
  proveedorIds: number[],
  productIds: number[],
): Promise<void> {
  log(`Insertando ${TARGETS.pedidos} pedidos…`);

  for (let i = 0; i < TARGETS.pedidos; i++) {
    const proveedorId = pick(proveedorIds);
    const date = randomDate();
    const status = pick(["pending", "received", "cancelled"] as const);
    const itemCount = randInt(2, 12);
    const items: Array<{ product_id: number; product_name: string; quantity: number; unit_price: number; subtotal: number }> = [];
    let total = 0;

    const usedProducts = new Set<number>();
    for (let j = 0; j < itemCount; j++) {
      const pid = pick(productIds);
      if (usedProducts.has(pid)) continue;
      usedProducts.add(pid);
      const qty = randFloat(1, 100);
      const unitPrice = randFloat(100, 30000, 2);
      const subtotal = parseFloat((qty * unitPrice).toFixed(2));
      total += subtotal;
      items.push({
        product_id: pid,
        product_name: `Producto #${pid}`,
        quantity: qty,
        unit_price: unitPrice,
        subtotal,
      });
    }

    total = parseFloat(total.toFixed(2));
    const notes = status === "cancelled" ? "Cancelado por falta de stock" : "";
    const pedidoId = i + 1;

    await execute(
      `INSERT INTO pedidos (id, proveedor_id, date, status, total, notes, store_id, created_at, updated_at, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'synced')`,
      [pedidoId, proveedorId, date, status, total, notes, STORE_ID, date, date],
    );

    for (const item of items) {
      await execute(
        `INSERT INTO pedido_items (pedido_id, product_id, product_name, quantity, unit_price, subtotal, store_id, created_at, updated_at, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'synced')`,
        [pedidoId, item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal, STORE_ID, date, date],
      );
    }

    if (status === "received") {
      // Add stock movements for received items
      for (const item of items) {
        await execute(
          `INSERT INTO stock_movements (product_id, type, quantity, delta, reference_id, store_id, created_at, updated_at, sync_status)
           VALUES ($1, 'purchase', $2, $2, $3, $4, $5, $6, 'synced')`,
          [item.product_id, item.quantity, `pedido-${pedidoId}`, STORE_ID, date, date],
        );
        // Update product stock
        await execute(
          `UPDATE products SET stock = stock + $1 WHERE id = $2`,
          [item.quantity, item.product_id],
        );
      }
    }

    progress(i + 1, TARGETS.pedidos, "Pedidos");
  }
}

// ──────────────────────────────────────────────
// Seed comprobantes
// ──────────────────────────────────────────────

async function seedComprobantes(
  customerIds: number[],
  productIds: number[],
): Promise<void> {
  log(`Insertando ${TARGETS.comprobantes} comprobantes…`);

  const TIPOS = ["factura", "boleta", "ticket", "nota_credito", "nota_debito"] as const;
  const TIPO_COUNTERS: Record<string, number> = {
    factura: 0, boleta: 0, ticket: 0, nota_credito: 0, nota_debito: 0,
  };
  const TIPO_PREFIX: Record<string, string> = {
    factura: "FAC", boleta: "BOL", ticket: "TKT", nota_credito: "NCR", nota_debito: "NDB",
  };

  for (let i = 0; i < TARGETS.comprobantes; i++) {
    const tipo: string = pick([...TIPOS]);
    TIPO_COUNTERS[tipo]++;
    const seq = TIPO_COUNTERS[tipo];
    const numero = `${TIPO_PREFIX[tipo]}-${STORE_ID}-${String(seq).padStart(5, "0")}`;

    // 60% probability the comprobante has a known customer
    const hasCustomer = Math.random() < 0.6;
    const customerId = hasCustomer ? pick(customerIds) : null;
    const clienteNombre = hasCustomer && customerId ? `Cliente #${customerId}` : "Consumidor Final";
    const clienteCuit = hasCustomer ? `${randInt(20, 30)}-${String(customerId! + 5000).padStart(8, "0")}-${randInt(0, 9)}` : null;

    const date = randomDate();
    const itemCount = randInt(1, 8);
    let subtotal = 0;
    const items: Array<{ product_name: string; quantity: number; unit_price: number; subtotal: number }> = [];

    for (let j = 0; j < itemCount; j++) {
      const pid = pick(productIds);
      const qty = randInt(1, 5);
      const unitPrice = randFloat(100, 50000, 2);
      const s = parseFloat((qty * unitPrice).toFixed(2));
      subtotal += s;
      items.push({
        product_name: `Producto #${pid}`,
        quantity: qty,
        unit_price: unitPrice,
        subtotal: s,
      });
    }

    const sub = parseFloat(subtotal.toFixed(2));
    const iva = parseFloat((sub * 0.21).toFixed(2));
    const total = parseFloat((sub + iva).toFixed(2));
    const compId = i + 1;

    await execute(
      `INSERT INTO comprobantes (id, tipo, numero, cliente_nombre, cliente_cuit, fecha, subtotal, iva, total, sale_id, notes, store_id, created_at, updated_at, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'synced')`,
      [compId, tipo, numero, clienteNombre, clienteCuit, date, sub, iva, total, null, "", STORE_ID, date, date],
    );

    for (const item of items) {
      await execute(
        `INSERT INTO comprobante_items (comprobante_id, product_id, product_name, quantity, unit_price, subtotal, store_id, created_at, updated_at, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'synced')`,
        [compId, null, item.product_name, item.quantity, item.unit_price, item.subtotal, STORE_ID, date, date],
      );
    }

    progress(i + 1, TARGETS.comprobantes, "Comprobantes");
  }
}

// ──────────────────────────────────────────────
// Seed expenses
// ──────────────────────────────────────────────

async function seedExpenses(): Promise<void> {
  log(`Insertando ${TARGETS.expenses} gastos…`);

  const categories = ["Alquiler", "Servicios", "Insumos", "Sueldos", "Impuestos", "Marketing", "Mantenimiento", "Varios"];
  const paymentMethods = ["cash", "card"];

  for (let i = 0; i < TARGETS.expenses; i++) {
    const description = pick(EXPENSE_DESCRIPTIONS);
    const amount = randFloat(500, 150000, 2);
    const category = pick(categories);
    const paymentMethod = pick(paymentMethods);
    const date = randomDateOnly();

    await execute(
      `INSERT INTO expenses (id, description, amount, category, date, payment_method, store_id, created_at, updated_at, sync_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'synced')`,
      [i + 1, description, amount, category, date, paymentMethod, STORE_ID, `${date} 10:00:00`, `${date} 10:00:00`],
    );

    progress(i + 1, TARGETS.expenses, "Gastos");
  }
}

// ──────────────────────────────────────────────
// Public runner
// ──────────────────────────────────────────────

export async function runSeeder(): Promise<void> {
  const start = performance.now();
  console.log("═══════════════════════════════════════════");
  log("Iniciando seeder de datos de prueba…");
  console.log("═══════════════════════════════════════════");

  await clearAll();

  const { categoryIds, brandIds } = await seedCategoriesBrands();
  const productIds = await seedProducts(categoryIds, brandIds);
  const customerIds = await seedCustomers();
  const proveedorIds = await seedProveedores();

  await seedPedidos(proveedorIds, productIds);
  await seedComprobantes(customerIds, productIds);
  await seedExpenses();

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  console.log("═══════════════════════════════════════════");
  log(`Seeder completado en ${elapsed}s`);
  console.log(`  ✅ ${TARGETS.products} productos`);
  console.log(`  ✅ ${TARGETS.categories} categorías`);
  console.log(`  ✅ ${TARGETS.brands} marcas`);
  console.log(`  ✅ ${TARGETS.customers} clientes`);
  console.log(`  ✅ ${TARGETS.proveedores} proveedores`);
  console.log(`  ✅ ${TARGETS.pedidos} pedidos`);
  console.log(`  ✅ ${TARGETS.comprobantes} comprobantes`);
  console.log(`  ✅ ${TARGETS.expenses} gastos`);
  console.log("═══════════════════════════════════════════");
  console.log("🔄 Recargá la página para que los stores carguen los datos nuevos.");
}
