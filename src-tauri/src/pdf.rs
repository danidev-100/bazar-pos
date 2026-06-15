use printpdf::*;
use serde::{Deserialize, Serialize};

// ──────────────────────────────────────────────
// Invoice data structures (mirrors TS Invoice type)
// ──────────────────────────────────────────────

#[derive(Debug, Deserialize, Serialize)]
pub struct InvoiceItem {
    pub product_id: usize,
    pub product_name: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub subtotal: f64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InvoiceData {
    pub invoice_number: String,
    pub sequential_number: usize,
    pub sale_id: usize,
    pub customer: String,
    pub items: Vec<InvoiceItem>,
    pub total: f64,
    pub payment_method: String,
    pub date: String,
    pub store_id: String,
}

// ──────────────────────────────────────────────
// PDF Generation
// ──────────────────────────────────────────────

/// Generates a PDF invoice from serialised JSON invoice data.
/// Returns the raw PDF bytes.
pub fn generate_pdf(invoice_json: &str) -> Result<Vec<u8>, String> {
    let invoice: InvoiceData =
        serde_json::from_str(invoice_json).map_err(|e| format!("Failed to parse invoice JSON: {}", e))?;

    // Create a new PDF document — 80 mm wide (standard thermal receipt width)
    let (doc, page1, layer1) = PdfDocument::new(
        &format!("Invoice {}", &invoice.invoice_number),
        Mm(80.0),
        Mm(200.0),
        "Layer 1",
    );

    let font = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;

    let current_layer = doc.get_page(page1).get_layer(layer1);

    // ── Header ──
    let mut y_pos = Mm(185.0);

    // Title
    current_layer.use_text("INVOICE", 14.0, Mm(5.0), y_pos, &font_bold);
    y_pos -= Mm(6.0);

    // Invoice number
    current_layer.use_text(
        &invoice.invoice_number,
        10.0,
        Mm(5.0),
        y_pos,
        &font_bold,
    );
    y_pos -= Mm(5.0);

    // Date
    current_layer.use_text(
        &format!("Date: {}", &invoice.date),
        8.0,
        Mm(5.0),
        y_pos,
        &font,
    );
    y_pos -= Mm(5.0);

    // Customer
    current_layer.use_text(
        &format!("Customer: {}", &invoice.customer),
        8.0,
        Mm(5.0),
        y_pos,
        &font,
    );
    y_pos -= Mm(8.0);

    // ── Separator ──
    current_layer.use_text(
        &"─".repeat(42),
        7.0,
        Mm(5.0),
        y_pos,
        &font,
    );
    y_pos -= Mm(5.0);

    // ── Column headers ──
    current_layer.use_text("Qty", 8.0, Mm(5.0), y_pos, &font_bold);
    current_layer.use_text("Product", 8.0, Mm(12.0), y_pos, &font_bold);
    current_layer.use_text("Price", 8.0, Mm(50.0), y_pos, &font_bold);
    current_layer.use_text("Total", 8.0, Mm(62.0), y_pos, &font_bold);
    y_pos -= Mm(5.0);

    current_layer.use_text(
        &"─".repeat(42),
        7.0,
        Mm(5.0),
        y_pos,
        &font,
    );
    y_pos -= Mm(5.0);

    // ── Items ──
    for item in &invoice.items {
        current_layer.use_text(
            &format!("{}", item.quantity),
            8.0,
            Mm(5.0),
            y_pos,
            &font,
        );
        // Truncate product name to ~20 chars
        let name = if item.product_name.len() > 20 {
            format!("{}..", &item.product_name[..18])
        } else {
            item.product_name.clone()
        };
        current_layer.use_text(&name, 8.0, Mm(12.0), y_pos, &font);
        current_layer.use_text(
            &format!("${:.2}", item.unit_price),
            8.0,
            Mm(50.0),
            y_pos,
            &font,
        );
        current_layer.use_text(
            &format!("${:.2}", item.subtotal),
            8.0,
            Mm(62.0),
            y_pos,
            &font,
        );
        y_pos -= Mm(5.0);
    }

    // ── Separator ──
    y_pos -= Mm(2.0);
    current_layer.use_text(
        &"─".repeat(42),
        7.0,
        Mm(5.0),
        y_pos,
        &font,
    );
    y_pos -= Mm(6.0);

    // ── Totals ──
    current_layer.use_text("TOTAL:", 10.0, Mm(40.0), y_pos, &font_bold);
    current_layer.use_text(
        &format!("${:.2}", invoice.total),
        10.0,
        Mm(62.0),
        y_pos,
        &font_bold,
    );
    y_pos -= Mm(6.0);

    // Payment method
    current_layer.use_text(
        &format!("Payment: {}", &invoice.payment_method),
        8.0,
        Mm(5.0),
        y_pos,
        &font,
    );
    y_pos -= Mm(10.0);

    // ── Footer ──
    current_layer.use_text(
        "Thank you for your purchase!",
        9.0,
        Mm(5.0),
        y_pos,
        &font,
    );
    y_pos -= Mm(4.0);
    current_layer.use_text(
        &invoice.invoice_number,
        7.0,
        Mm(5.0),
        y_pos,
        &font,
    );

    // Save to bytes
    let bytes = doc
        .save_to_bytes()
        .map_err(|e| format!("Failed to save PDF: {}", e))?;

    Ok(bytes)
}
