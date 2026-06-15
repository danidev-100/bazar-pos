import type { Invoice } from "@/store/invoices";

/**
 * Generate and download a PDF invoice via the Tauri backend.
 * Falls back to console.log when running outside Tauri (e.g., dev browser).
 */
export async function exportInvoicePdf(invoice: Invoice): Promise<void> {
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
  } catch {
    // Fallback when running outside Tauri (e.g., dev browser)
    console.log("generate_pdf (dev fallback):", invoice.invoiceNumber);
  }
}
