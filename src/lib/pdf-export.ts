import type { Invoice } from "@/store/invoices";

/**
 * Build print-optimized HTML for an invoice.
 */
function buildInvoiceHtml(invoice: Invoice): string {
  const itemsHtml = invoice.items
    .map(
      (item, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td>${item.productName}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">$${item.unitPrice.toFixed(2)}</td>
          <td class="num">$${item.subtotal.toFixed(2)}</td>
        </tr>`,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${invoice.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; color: #000; }
        h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
        .inv-num { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 8px; }
        .meta { width: 100%; margin-bottom: 8px; }
        .meta td { padding: 1px 0; }
        .sep { text-align: center; letter-spacing: 2px; margin: 6px 0; border: none; border-top: 1px dashed #888; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 4px 2px; border-bottom: 1px solid #000; font-size: 11px; }
        td { padding: 3px 2px; vertical-align: top; }
        .num { text-align: right; font-variant-numeric: tabular-nums; }
        .totals { margin-top: 8px; border-top: 1px solid #000; padding-top: 4px; }
        .totals td { padding: 2px 0; }
        .total-row { font-weight: bold; font-size: 14px; }
        .footer { text-align: center; margin-top: 16px; font-size: 11px; border-top: 1px dashed #888; padding-top: 8px; }
        .payment-info { margin-top: 4px; }
        @media print {
          body { width: 100%; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>FACTURA</h1>
      <div class="inv-num">${invoice.invoiceNumber}</div>

      <table class="meta">
        <tr><td>Fecha:</td><td class="num">${new Date(invoice.date).toLocaleDateString("es-AR")}</td></tr>
        <tr><td>Cliente:</td><td class="num">${invoice.customer}</td></tr>
        <tr><td>Pago:</td><td class="num">${invoice.paymentMethod === "cash" ? "Efectivo" : "Tarjeta"}</td></tr>
      </table>

      <div class="sep">─ ─ ─ ─ ─ ─ ─ ─</div>

      <table>
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Producto</th>
            <th class="num">Cant</th>
            <th class="num">Precio</th>
            <th class="num">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="sep">─ ─ ─ ─ ─ ─ ─ ─</div>

      <table class="totals">
        <tr><td>Subtotal</td><td class="num">$${invoice.total.toFixed(2)}</td></tr>
        <tr><td>Impuesto</td><td class="num">$0.00</td></tr>
        <tr class="total-row"><td>TOTAL</td><td class="num">$${invoice.total.toFixed(2)}</td></tr>
      </table>

      <div class="payment-info">
        <table>
          <tr><td>Monto Pagado</td><td class="num">$${invoice.total.toFixed(2)}</td></tr>
          <tr><td>Vuelto</td><td class="num">$0.00</td></tr>
        </table>
      </div>

      <div class="footer">
        ¡Gracias por tu compra!<br/>
        ${invoice.invoiceNumber}
      </div>
    </body>
    </html>`;
}

/**
 * Print an invoice via the browser's print dialog (allows "Save as PDF").
 * Falls back to the Tauri backend PDF generation when available.
 */
export async function exportInvoicePdf(invoice: Invoice): Promise<void> {
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

  // Browser fallback: open print dialog with receipt format
  const printWin = window.open("", "_blank");
  if (!printWin) {
    // Popup blocked — just log
    console.log("print_fallback:", invoice.invoiceNumber);
    return;
  }

  printWin.document.write(buildInvoiceHtml(invoice));
  printWin.document.close();
  printWin.focus();

  // Wait for content to render, then print
  setTimeout(() => {
    printWin.print();
  }, 300);
}
