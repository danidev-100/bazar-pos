/**
 * Pure template renderer for comprobante printing.
 *
 * Two-pass regex engine:
 *   Pass 1: {{#items}}...{{/items}} block iteration
 *   Pass 2: {{variable}} simple replacement
 *
 * All values are HTML-escaped before interpolation.
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type TemplateItemRow = {
  product_name: string;
  quantity: string;
  unit_price: string;
  subtotal: string;
};

export type TemplateData = {
  cliente_nombre: string;
  cliente_cuit: string;
  cliente_direccion: string;
  numero: string;
  fecha: string;
  subtotal: string;
  iva: string;
  total: string;
  tipo_label: string;
  notes: string;
  items: TemplateItemRow[];
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ──────────────────────────────────────────────
// Render function
// ──────────────────────────────────────────────

export function renderTemplate(html: string, data: TemplateData): string {
  // Pass 1: items loop {{#items}}...{{/items}}
  let result = html.replace(/{{#items}}([\s\S]*?){{\/items}}/g, (_match, inner: string) => {
    if (!data.items || data.items.length === 0) return "";

    return data.items
      .map((item) => {
        // Render inner template for each item (pass-2 only: simple vars, no nested items)
        return inner.replace(/{{(\w+)}}/g, (_m, key: string) => {
          const value = (item as Record<string, string>)[key];
          return value != null ? escapeHtml(value) : "";
        });
      })
      .join("");
  });

  // Pass 2: simple variables {{var}}
  result = result.replace(/{{(\w+)}}/g, (_match, key: string) => {
    const value = (data as Record<string, unknown>)[key];
    if (value == null) return "";
    if (typeof value === "string") return escapeHtml(value);
    return "";
  });

  return result;
}

// ──────────────────────────────────────────────
// Comprobante → TemplateData mapper
// ──────────────────────────────────────────────

export type ComprobanteLike = {
  tipo: string;
  numero: string;
  cliente_nombre: string;
  cliente_cuit?: string | null;
  cliente_direccion?: string | null;
  fecha: string | Date;
  subtotal: number;
  iva: number;
  total: number;
  notes?: string | null;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
};

function fmt(n: number): string {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TIPO_LABELS: Record<string, string> = {
  factura: "Factura",
  boleta: "Boleta",
  ticket: "Ticket",
  nota_credito: "Nota de Crédito",
  nota_debito: "Nota de Débito",
};

function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-AR");
}

export function comprobanteToTemplateData(c: ComprobanteLike): TemplateData {
  return {
    cliente_nombre: c.cliente_nombre || "Consumidor Final",
    cliente_cuit: c.cliente_cuit ?? "",
    cliente_direccion: c.cliente_direccion ?? "",
    numero: c.numero,
    fecha: formatDate(c.fecha),
    subtotal: fmt(c.subtotal),
    iva: fmt(c.iva),
    total: fmt(c.total),
    tipo_label: TIPO_LABELS[c.tipo] || c.tipo,
    notes: c.notes ?? "",
    items: c.items.map((i) => ({
      product_name: i.product_name,
      quantity: String(i.quantity),
      unit_price: fmt(i.unit_price),
      subtotal: fmt(i.subtotal),
    })),
  };
}
