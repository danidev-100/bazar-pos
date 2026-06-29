import type { Invoice } from "@/store/invoices";
import type { Comprobante } from "@/store/comprobantes";
import type { CreditPayment } from "@/store/customers";
import { renderTemplate, comprobanteToTemplateData, type ComprobanteLike, type TemplateData } from "@/lib/render-template";
import { getDefaultTemplate } from "@/lib/default-templates";
import { usePlantillasStore } from "@/store/plantillas";
import { select } from "@/lib/db";

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
 * Injects company data from CompanySettings.
 */
export async function buildComprobanteHtml(data: TemplateData, tipo: string, storeId: string): Promise<string> {
  // Fetch company data
  let companyLogo = "";
  try {
    const rows = await select<{ name: string; phone: string; address: string; cuit: string; email: string; web: string; logo_base64: string }>(
      `SELECT name, phone, address, cuit, email, web, logo_base64 FROM company_settings WHERE store_id = $1 LIMIT 1`,
      [storeId],
    );
    if (rows.length > 0) {
      const c = rows[0];
      data.company_name = c.name;
      data.company_phone = c.phone;
      data.company_address = c.address;
      data.company_cuit = c.cuit;
      data.company_email = c.email;
      data.company_web = c.web;
      companyLogo = c.logo_base64;
    }
  } catch {
    // Company data not available — use defaults
  }

  // Build logo src if available
  data.company_logo_src = companyLogo;

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

/**
 * Print a credit payment receipt — either a sale (positive) or collection (negative).
 */
export async function printCreditPayment(payment: CreditPayment, customerName: string): Promise<void> {
  const isCollection = payment.amount < 0;
  const label = isCollection ? "RECIBO DE COBRO" : "VENTA A CUENTA";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${label}</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 13px; margin: 0; padding: 20px; }
  .header { text-align: center; margin-bottom: 20px; }
  .header h1 { font-size: 18px; margin: 0 0 4px; }
  .header .sub { color: #666; font-size: 11px; }
  .info { margin-bottom: 16px; }
  .info div { margin-bottom: 4px; }
  .label { color: #666; }
  .amount { font-size: 28px; font-weight: bold; text-align: center; margin: 24px 0; }
  .amount.positive { color: #dc2626; }
  .amount.negative { color: #16a34a; }
  .footer { text-align: center; color: #999; font-size: 10px; margin-top: 32px; border-top: 1px dashed #ccc; padding-top: 12px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; }
  td.r { text-align: right; }
</style>
</head>
<body>
  <div class="header">
    <h1>${label}</h1>
    <div class="sub">${new Date(payment.date).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
  </div>
  <div class="info">
    <table>
      <tr><td class="label">Cliente</td><td class="r">${customerName}</td></tr>
      ${payment.notes ? `<tr><td class="label">Concepto</td><td class="r">${payment.notes}</td></tr>` : ""}
      ${payment.sale_id ? `<tr><td class="label">Venta N°</td><td class="r">#${payment.sale_id}</td></tr>` : ""}
    </table>
  </div>
  <hr>
  <div class="amount ${isCollection ? "negative" : "positive"}">
    ${isCollection ? "" : "+"}$${Math.abs(payment.amount).toFixed(2)}
  </div>
  <hr>
  <div class="footer">
    Recibo generado por Sistema de Ventas<br>
    ID: #${payment.id}
  </div>
</body>
</html>`;

  exportHtmlAsPdf(html);
}
