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
};

let nextCustomerId = 1;

export type CustomersStore = {
  customers: Customer[];
  addCustomer: (data: Omit<Customer, "id">) => Customer;
  updateCustomer: (id: number, updates: Partial<Omit<Customer, "id">>) => void;
  deleteCustomer: (id: number) => void;
  getCustomersByStore: (storeId: string) => Customer[];
  searchCustomers: (storeId: string, query: string) => Customer[];
  getCustomerById: (id: number) => Customer | null;
};

export const useCustomersStore = create<CustomersStore>((set, get) => ({
  customers: [],

  addCustomer: (data) => {
    const dup = get().customers.find(
      (c) => c.name === data.name && c.store_id === data.store_id,
    );
    if (dup) {
      throw new Error(`Ya existe un cliente "${data.name}" en esta tienda`);
    }

    const customer: Customer = { id: nextCustomerId++, ...data };
    set({ customers: [...get().customers, customer] });

    const now = new Date().toISOString();
    execute(
      `INSERT INTO customers (id, name, phone, email, address, cuit, store_id, created_at, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [customer.id, customer.name, customer.phone, customer.email, customer.address, customer.cuit, customer.store_id, now, now],
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
        `UPDATE customers SET name=$1, phone=$2, email=$3, address=$4, cuit=$5, store_id=$6, updated_at=$7, sync_status='pending' WHERE id=$8`,
        [
          updates.name ?? current.name,
          updates.phone ?? current.phone,
          updates.email ?? current.email,
          updates.address ?? current.address,
          updates.cuit ?? current.cuit,
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
}));
