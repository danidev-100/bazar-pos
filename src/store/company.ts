import { create } from "zustand";
import { execute, select, enqueueSync } from "@/lib/db";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type CompanyData = {
  id: number;
  store_id: string;
  name: string;
  phone: string;
  address: string;
  cuit: string;
  email: string;
  web: string;
  logo_base64: string;
};

export type CompanyInput = {
  name: string;
  phone: string;
  address: string;
  cuit: string;
  email: string;
  web: string;
  logo_base64: string;
};

export type CompanyStore = {
  data: CompanyData | null;
  loaded: boolean;

  loadCompany: (storeId: string) => Promise<void>;
  saveCompany: (storeId: string, input: CompanyInput) => Promise<void>;
};

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────

export const useCompanyStore = create<CompanyStore>((set, get) => ({
  data: null,
  loaded: false,

  loadCompany: async (storeId) => {
    const rows = await select<CompanyData>(
      `SELECT id, store_id, name, phone, address, cuit, email, web, logo_base64 FROM company_settings WHERE store_id = $1 LIMIT 1`,
      [storeId],
    );
    set({ data: rows[0] ?? null, loaded: true });
  },

  saveCompany: async (storeId, input) => {
    const existing = await select<{ id: number }>(
      `SELECT id FROM company_settings WHERE store_id = $1 LIMIT 1`,
      [storeId],
    );

    const now = new Date().toISOString();
    const existingId = existing.length > 0 ? existing[0].id : null;
    const operation = existingId ? "update" : "insert";

    if (existingId) {
      await execute(
        `UPDATE company_settings SET name = $1, phone = $2, address = $3, cuit = $4, email = $5, web = $6, logo_base64 = $7, updated_at = $8, sync_status = 'pending' WHERE id = $9`,
        [input.name, input.phone, input.address, input.cuit, input.email, input.web, input.logo_base64, now, existingId],
      );
    } else {
      await execute(
        `INSERT INTO company_settings (store_id, name, phone, address, cuit, email, web, logo_base64, updated_at, sync_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
        [storeId, input.name, input.phone, input.address, input.cuit, input.email, input.web, input.logo_base64, now],
      );
    }

    // Get the ID for sync
    const row = await select<{ id: number }>(
      `SELECT id FROM company_settings WHERE store_id = $1 LIMIT 1`,
      [storeId],
    );
    const id = row[0].id;

    await enqueueSync("company_settings", id, operation, storeId);

    // Update local state
    set({
      data: {
        id,
        store_id: storeId,
        ...input,
      },
    });
  },
}));
