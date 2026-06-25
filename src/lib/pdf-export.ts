import type { Invoice } from "@/store/invoices";
import type { Comprobante } from "@/store/comprobantes";
import { renderTemplate, comprobanteToTemplateData, type ComprobanteLike, type TemplateData } from "@/lib/render-template";
import { getDefaultTemplate } from "@/lib/default-templates";
import { usePlantillasStore } from "@/store/plantillas";

// ──────────────────────────────────────────────
// Adapters
// ──────────────────────────────────────────────

function invoiceToComprobanteLike(invoice: Invoice, tipo: string): ComprobanteLike {
  return {
    tipo,
    numero: invoice.invoiceNumber,
    cliente_nombre: invoice.customer,
    cliente_cuit: null,
    cliente_direccion: null,
    fecha: invoice.date,
    subtotal: invoice.total,
    iva: 0,
    total: invoice.total,
    notes: null,
    items: invoice.items.map((item) => ({
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
    })),
  };
}

// ──────────────────────────────────────────────
// Build print HTML via template engine
// ──────────────────────────────────────────────

/**
 * Build the print HTML for a comprobante-like object.
 * Uses saved template (by tipo+storeId), falls back to default template on error.
 */
export async function buildComprobanteHtml(data: TemplateData, tipo: string, storeId: string): Promise<string> {
  try {
    const store = usePlantillasStore.getState();
    const template = await store.getPlantillaOrDefault(tipo, storeId);
    return renderTemplate(template, data);
  } catch {
    return renderTemplate(getDefaultTemplate(tipo), data);
  }
}

async function buildInvoiceHtml(invoice: Invoice, tipo = "factura"): Promise<string> {
  const data = comprobanteToTemplateData(invoiceToComprobanteLike(invoice, tipo));
  return buildComprobanteHtml(data, tipo, invoice.storeId);
}

// ──────────────────────────────────────────────
// Print helpers
// ──────────────────────────────────────────────

/** Print arbitrary HTML in a hidden iframe, then show the print dialog. */
export function exportHtmlAsPdf(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "none";
  iframe.title = "print-frame";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.log("print_fallback: no iframe contentWindow");
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.log("print_fallback error:", err);
    }
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 500);
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Print a comprobante via the browser's print dialog.
 * Uses saved template from Admin, falls back gracefully.
 */
export async function printComprobante(comprobante: Comprobante): Promise<void> {
  const data = comprobanteToTemplateData(comprobante);
  const html = await buildComprobanteHtml(data, comprobante.tipo, comprobante.store_id);
  exportHtmlAsPdf(html);
}

/**
 * Print an invoice (legacy) via the browser's print dialog.
 * Falls back to Tauri native PDF generation when available.
 */
export async function exportInvoicePdf(invoice: Invoice, tipo = "factura"): Promise<void> {
  // Try Tauri native PDF generation first
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const bytes: number[] = await invoke("generate_pdf", {
      invoiceData: JSON.stringify(invoice),
    });
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  } catch {
    // Tauri not available — fall through to browser print
  }

  const html = await buildInvoiceHtml(invoice, tipo);
  exportHtmlAsPdf(html);
}
