import { create } from "zustand";
import { execute, enqueueSync } from "@/lib/db";

export type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  cuit: string;
  store_id: string;
  creditBalance: number;
};

export type CreditPayment = {
  id: number;
  customer_id: number;
  amount: number;
  date: string;
  notes: string;
  sale_id: number | null;
  comprobante_id: number | null;
  store_id: string;
};

let nextCustomerId = 1;
export function setNextCustomerId(id: number) { nextCustomerId = id; }

export type CustomersStore = {
  customers: Customer[];
  creditPayments: CreditPayment[];
  addCustomer: (data: Omit<Customer, "id">) => Customer;
  updateCustomer: (id: number, updates: Partial<Omit<Customer, "id">>) => void;
  deleteCustomer: (id: number) => void;
  getCustomersByStore: (storeId: string) => Customer[];
  searchCustomers: (storeId: string, query: string) => Customer[];
  getCustomerById: (id: number) => Customer | null;
  /** Update a customer's credit balance (positive = debe, negative = haber). */
  updateCreditBalance: (customerId: number, delta: number, storeId: string, notes?: string, saleId?: number, comprobanteId?: number) => void;
  /** Get all credit payments for a customer, newest first. */
  getCreditPaymentsByCustomer: (customerId: number) => CreditPayment[];
  /** Get customers with non-zero balance. */
  getCustomersWithDebt: (storeId: string) => Customer[];
};

export const useCustomersStore = create<CustomersStore>((set, get) => ({
  customers: [],
  creditPayments: [],

  addCustomer: (data) => {
    const dup = get().customers.find(
      (c) => c.name === data.name && c.store_id === data.store_id,
    );
    if (dup) {
      throw new Error(`Ya existe un cliente "${data.name}" en esta tienda`);
    }

    const customer: Customer = { id: nextCustomerId++, ...data, creditBalance: 0 };
    set({ customers: [...get().customers, customer] });

    const now = new Date().toISOString();
    execute(
      `INSERT INTO customers (id, name, phone, email, address, cuit, credit_balance, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
      [customer.id, customer.name, customer.phone, customer.email, customer.address, customer.cuit, 0, customer.store_id, now, now],
    )
      .then(() => enqueueSync("customer", customer.id, "insert", customer.store_id))
      .catch(() => {});

    return customer;
  },

  updateCustomer: (id, updates) => {
    if (updates.name) {
      const current = get().customers.find((c) => c.id === id);
      if (current) {
        const dup = get().customers.find(
          (c) =>
            c.name === updates.name &&
            c.store_id === (updates.store_id ?? current.store_id) &&
            c.id !== id,
        );
        if (dup) {
          throw new Error(`Ya existe un cliente "${updates.name}" en esta tienda`);
        }
      }
    }

    set({
      customers: get().customers.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    });

    const current = get().customers.find((c) => c.id === id);
    if (current) {
      const now = new Date().toISOString();
      execute(
        `UPDATE customers SET name=$1, phone=$2, email=$3, address=$4, cuit=$5, credit_balance=$6, store_id=$7, updated_at=$8, sync_status='pending' WHERE id=$9`,
        [
          updates.name ?? current.name,
          updates.phone ?? current.phone,
          updates.email ?? current.email,
          updates.address ?? current.address,
          updates.cuit ?? current.cuit,
          updates.creditBalance ?? current.creditBalance ?? 0,
          updates.store_id ?? current.store_id,
          now,
          id,
        ],
      )
        .then(() => enqueueSync("customer", id, "update", current.store_id))
        .catch(() => {});
    }
  },

  deleteCustomer: (id) => {
    const existing = get().customers.find((c) => c.id === id);
    set({
      customers: get().customers.filter((c) => c.id !== id),
    });

    execute(`DELETE FROM customers WHERE id=$1`, [id])
      .then(() => {
        if (existing) {
          enqueueSync("customer", id, "delete", existing.store_id);
        }
      })
      .catch(() => {});
  },

  getCustomersByStore: (storeId) =>
    get()
      .customers.filter((c) => c.store_id === storeId)
      .sort((a, b) => a.name.localeCompare(b.name)),

  searchCustomers: (storeId, query) => {
    const q = query.toLowerCase();
    return get()
      .customers.filter(
        (c) =>
          c.store_id === storeId &&
          (c.name.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.cuit.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  getCustomerById: (id) =>
    get().customers.find((c) => c.id === id) ?? null,

  updateCreditBalance: (customerId, delta, storeId, notes, saleId, comprobanteId) => {
    const customer = get().customers.find((c) => c.id === customerId);
    if (!customer) return;

    const newBalance = Math.round((customer.creditBalance + delta) * 100) / 100;

    set({
      customers: get().customers.map((c) =>
        c.id === customerId ? { ...c, creditBalance: newBalance } : c,
      ),
    });

    // Record the payment
    const paymentId = nextCustomerId++;
    const now = new Date().toISOString();
    const payment: CreditPayment = {
      id: paymentId,
      customer_id: customerId,
      amount: delta,
      date: now,
      notes: notes ?? "",
      sale_id: saleId ?? null,
      comprobante_id: comprobanteId ?? null,
      store_id: storeId,
    };

    set({ creditPayments: [...get().creditPayments, payment] });

    // Persist payment
    execute(
      `INSERT INTO credit_payments (id, customer_id, amount, date, notes, sale_id, comprobante_id, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
      [payment.id, payment.customer_id, payment.amount, payment.date, payment.notes, payment.sale_id, payment.comprobante_id, payment.store_id, now, now],
    )
      .then(() => enqueueSync("credit_payment", payment.id, "insert", storeId))
      .catch(() => {});

    // Persist balance update
    execute(
      `UPDATE customers SET credit_balance=$1, updated_at=$2, sync_status='pending' WHERE id=$3`,
      [newBalance, now, customerId],
    )
      .then(() => enqueueSync("customer", customerId, "update", storeId))
      .catch(() => {});
  },

  getCreditPaymentsByCustomer: (customerId) =>
    get()
      .creditPayments.filter((p) => p.customer_id === customerId)
      .sort((a, b) => b.date.localeCompare(a.date)),

  getCustomersWithDebt: (storeId) =>
    get()
      .customers.filter((c) => c.store_id === storeId && c.creditBalance > 0)
      .sort((a, b) => b.creditBalance - a.creditBalance),
}));
