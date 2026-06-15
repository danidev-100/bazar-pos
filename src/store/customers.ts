import { create } from "zustand";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  cuit: string;
  store_id: string;
  created_at: string;
};

// ──────────────────────────────────────────────
// localStorage helpers
// ──────────────────────────────────────────────

const CUSTOMERS_KEY = "bazar_customers";

function loadCustomers(): Customer[] {
  try {
    const stored = localStorage.getItem(CUSTOMERS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Customer[];
      return parsed;
    }
  } catch {
    // localStorage unavailable — start empty
  }
  return [];
}

function saveCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  } catch {
    // localStorage unavailable — skip
  }
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

let nextCustomerId = 1;

function computeNextId(customers: Customer[]): number {
  if (customers.length === 0) return 1;
  return Math.max(...customers.map((c) => c.id)) + 1;
}

// ──────────────────────────────────────────────
// Store shape
// ──────────────────────────────────────────────

export type CustomersStore = {
  customers: Customer[];

  /** Add a customer. Returns the new customer with generated id and created_at. */
  addCustomer: (data: Omit<Customer, "id" | "created_at">) => Customer;

  /** Update customer fields by id. */
  updateCustomer: (id: number, data: Partial<Customer>) => void;

  /** Remove a customer by id. */
  deleteCustomer: (id: number) => void;

  /** Get all customers for a store, sorted alphabetically by name. */
  getCustomersByStore: (storeId: string) => Customer[];

  /** Search customers by name, phone, email, or CUIT. */
  searchCustomers: (storeId: string, query: string) => Customer[];

  /** Get a single customer by id, or null if not found. */
  getCustomerById: (id: number) => Customer | null;
};

// ──────────────────────────────────────────────
// Store implementation
// ──────────────────────────────────────────────

export const useCustomersStore = create<CustomersStore>((set, get) => ({
  customers: loadCustomers(),

  addCustomer: (data) => {
    const customers = get().customers;
    nextCustomerId = computeNextId(customers);

    const customer: Customer = {
      id: nextCustomerId++,
      ...data,
      created_at: new Date().toISOString(),
    };

    const updated = [...customers, customer];
    set({ customers: updated });
    saveCustomers(updated);
    return customer;
  },

  updateCustomer: (id, data) => {
    const updated = get().customers.map((c) =>
      c.id === id ? { ...c, ...data } : c,
    );
    set({ customers: updated });
    saveCustomers(updated);
  },

  deleteCustomer: (id) => {
    const updated = get().customers.filter((c) => c.id !== id);
    set({ customers: updated });
    saveCustomers(updated);
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
