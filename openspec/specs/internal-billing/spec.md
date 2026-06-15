# Internal Billing Specification

## Purpose

Generate customer invoices with sequential numbering per store. Output to thermal printer and PDF. No AFIP/electronic invoicing.

## Requirements

### R1: Invoice Generation

The system MUST generate an invoice from a completed sale.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | Sale #42 is completed with customer "Juan" | User taps "generate invoice" | An invoice is created with sale_id=42, customer, date, items, totals |
| No customer | Sale was completed without customer name | User generates invoice | Invoice shows "Consumidor Final" as customer |
| Offline | Device is offline | User generates invoice | Invoice is generated locally; syncs when online |

### R2: Sequential Numbering

Invoice numbers MUST be sequential per store, never reused.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Happy path | Store X has last invoice #100 | A new invoice is generated | Invoice number = 101 |
| First invoice | Store Y has no invoices | A new invoice is generated | Invoice number = 1 |
| Gap fill | Store X: #100, skip to #102 (deleted #101) | New invoice | Number = 103 (gaps SHALL NOT be reused) |
| Number conflict | Two stores both reach #50 | Each generates an invoice | Both get #50 — numbering is per store |

### R3: PDF / Print

The invoice MUST be printable (thermal) and exportable as PDF.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Print | Invoice #101 is open | User taps "print" | The invoice is sent to the default thermal printer |
| PDF export | Invoice #101 exists | User taps "export PDF" | A PDF file is saved locally with the invoice details |
| No printer | No printer is configured | User taps "print" | The system SHOULD show "No printer configured" |
