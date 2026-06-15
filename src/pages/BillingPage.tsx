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
// Tauri command stubs (will use real invoke in production)
// ──────────────────────────────────────────────

/** Placeholder — will be replaced with Tauri `invoke("print_receipt")` in PR 7. */
async function invokePrint(_invoice: Invoice): Promise<void> {
  // In a real Tauri build this would call:
  //   await invoke("print_receipt", { invoiceData: JSON.stringify(invoice) });
  console.log("print_receipt called (stub):", _invoice.invoiceNumber);
}

/** Placeholder — will be replaced with Tauri `invoke("generate_pdf")` in PR 7. */
async function invokeExportPdf(_invoice: Invoice): Promise<void> {
  // In a real Tauri build this would call:
  //   const bytes = await invoke("generate_pdf", { invoiceData: JSON.stringify(invoice) });
  console.log("generate_pdf called (stub):", _invoice.invoiceNumber);
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
