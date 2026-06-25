import { create } from "zustand";
import { execute, select, enqueueSync } from "@/lib/db";
import { DEFAULT_TEMPLATES, getDefaultTemplate } from "@/lib/default-templates";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type PlantillaEntry = {
  tipo: string;
  template_html: string | null; // null = no custom template saved
};

export type PlantillasStore = {
  /** Cache: storeId -> { tipo -> html } */
  plantillas: Record<string, Record<string, string>>;

  /** Get saved template for a tipo, or null if none. */
  getPlantilla: (tipo: string, storeId: string) => Promise<string | null>;

  /** Save (insert or replace) a template for a tipo. Rejects on empty HTML. */
  upsertPlantilla: (tipo: string, html: string, storeId: string) => Promise<void>;

  /** Get all 5 tipos with their saved HTML (null if not saved). */
  getAllPlantillas: (storeId: string) => Promise<PlantillaEntry[]>;

  /** Get saved template, or fall back to default. */
  getPlantillaOrDefault: (tipo: string, storeId: string) => Promise<string>;
};

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────

export const usePlantillasStore = create<PlantillasStore>((set, get) => ({
  plantillas: {},

  getPlantilla: async (tipo, storeId) => {
    const rows = await select<{ id: number; template_html: string }>(
      `SELECT id, template_html FROM plantillas WHERE store_id = $1 AND tipo = $2 LIMIT 1`,
      [storeId, tipo],
    );
    if (rows.length === 0) return null;
    return rows[0].template_html;
  },

  upsertPlantilla: async (tipo, html, storeId) => {
    if (!html.trim()) {
      throw new Error("HTML vacío");
    }

    // Check if exists to determine insert vs update
    const existing = await select<{ id: number }>(
      `SELECT id FROM plantillas WHERE store_id = $1 AND tipo = $2 LIMIT 1`,
      [storeId, tipo],
    );

    const now = new Date().toISOString();
    const existingId = existing.length > 0 ? existing[0].id : null;
    const operation = existingId ? "update" : "insert";

    if (existingId) {
      await execute(
        `UPDATE plantillas SET template_html = $1, updated_at = $2, sync_status = 'pending' WHERE id = $3`,
        [html, now, existingId],
      );
    } else {
      await execute(
        `INSERT INTO plantillas (store_id, tipo, template_html, updated_at, sync_status) VALUES ($1, $2, $3, $4, 'pending')`,
        [storeId, tipo, html, now],
      );
    }

    // Get the ID for sync (whether newly inserted or existed)
    const row = await select<{ id: number }>(
      `SELECT id FROM plantillas WHERE store_id = $1 AND tipo = $2 LIMIT 1`,
      [storeId, tipo],
    );
    const id = row[0].id;

    await enqueueSync("plantilla", id, operation, storeId);

    // Update cache
    set({
      plantillas: {
        ...get().plantillas,
        [storeId]: { ...(get().plantillas[storeId] ?? {}), [tipo]: html },
      },
    });
  },

  getAllPlantillas: async (storeId) => {
    const rows = await select<{ tipo: string; template_html: string }>(
      `SELECT tipo, template_html FROM plantillas WHERE store_id = $1`,
      [storeId],
    );

    const saved = new Map(rows.map((r) => [r.tipo, r.template_html]));
    const tipos = Object.keys(DEFAULT_TEMPLATES);

    return tipos.map((tipo) => ({
      tipo,
      template_html: saved.get(tipo) ?? null,
    }));
  },

  getPlantillaOrDefault: async (tipo, storeId) => {
    const saved = await get().getPlantilla(tipo, storeId);
    return saved ?? getDefaultTemplate(tipo);
  },
}));
