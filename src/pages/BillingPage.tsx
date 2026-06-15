import { useState, useCallback } from "react";
import { useAppStore, type CompletedSale } from "@/store";
import { useActiveStore } from "@/store/context";
import {
  useInvoicesStore,
  type Invoice,
} from "@/store/invoices";
import InvoiceList from "@/components/InvoiceList";
import InvoiceDetail from "@/components/InvoiceDetail";

// ──────────────────────────────────────────────
// Tauri invoke commands
// ──────────────────────────────────────────────

/** Send invoice to thermal printer via Tauri ESC/POS command. */
async function invokePrint(invoice: Invoice): Promise<void> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("print_receipt", { invoiceData: JSON.stringify(invoice) });
  } catch {
    // Fallback when running outside Tauri (e.g., dev browser)
    console.log("print_receipt (dev fallback):", invoice.invoiceNumber);
  }
}

/** Generate PDF invoice via Tauri command and trigger download. */
async function invokeExportPdf(invoice: Invoice): Promise<void> {
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

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function BillingPage() {
  const { storeId } = useActiveStore();
  const completedSales = useAppStore((s) => s.completedSales);
  const generateInvoice = useInvoicesStore((s) => s.generateInvoice);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(
    null,
  );

  const handleGenerateInvoice = useCallback(() => {
    // Find the most recent completed sale for this store that doesn't
    // already have an invoice generated.
    const invoices = useInvoicesStore.getState().invoices;
    const sale = completedSales
      .filter((s) => s.storeId === storeId)
      .find(
        (s) => !invoices.some((inv) => inv.saleId === s.id),
      );

    if (!sale) {
      useAppStore.getState().showNotification(
        "No pending sales to invoice for this store",
      );
      return;
    }

    const invoice = generateInvoice(sale);
    setSelectedInvoiceId(invoice.id);
    useAppStore
      .getState()
      .showNotification(`Invoice ${invoice.invoiceNumber} generated`);
  }, [completedSales, storeId, generateInvoice]);

  const handlePrint = useCallback((_invoice: Invoice) => {
    invokePrint(_invoice);
    useAppStore
      .getState()
      .showNotification(`Printing ${_invoice.invoiceNumber}...`);
  }, []);

  const handleExportPdf = useCallback((_invoice: Invoice) => {
    invokeExportPdf(_invoice);
    useAppStore
      .getState()
      .showNotification(`Exporting ${_invoice.invoiceNumber} as PDF...`);
  }, []);

  return (
    <div className="flex gap-4 h-full">
      {/* ── Left panel: Invoice List ── */}
      <aside className="w-80 flex-shrink-0 bg-pos-surface rounded-xl border border-pos-muted/10 p-3 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide">
            Invoices
          </h2>
          <button
            onClick={handleGenerateInvoice}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-pos-secondary text-white hover:bg-pos-secondary/90 transition-colors"
          >
            + Generate
          </button>
        </div>
        <InvoiceList
          storeId={storeId}
          selectedInvoiceId={selectedInvoiceId}
          onSelectInvoice={setSelectedInvoiceId}
        />
      </aside>

      {/* ── Right panel: Invoice Detail ── */}
      <section className="flex-1 bg-pos-surface rounded-xl border border-pos-muted/10 p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold text-pos-text uppercase tracking-wide mb-4">
          Invoice Details
        </h2>
        <InvoiceDetail
          invoiceId={selectedInvoiceId}
          onPrint={handlePrint}
          onExportPdf={handleExportPdf}
        />
      </section>
    </div>
  );
}
