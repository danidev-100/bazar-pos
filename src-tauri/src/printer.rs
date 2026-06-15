use serde::Deserialize;

// ──────────────────────────────────────────────
// ESC/POS Thermal Printer Driver
// ──────────────────────────────────────────────

/// ESC/POS control byte constants.
mod escpos {
    /// Initialize printer.
    pub const INIT: &[u8] = &[0x1B, 0x40];
    /// Line feed.
    pub const LF: &[u8] = &[0x0A];
    /// Cut paper (full cut).
    pub const CUT: &[u8] = &[0x1D, 0x56, 0x00];
    /// Select character font B (smaller).
    pub const FONT_B: &[u8] = &[0x1B, 0x4D, 0x01];
    /// Select character font A (normal).
    pub const FONT_A: &[u8] = &[0x1B, 0x4D, 0x00];
    /// Emphasized (bold) mode ON.
    pub const BOLD_ON: &[u8] = &[0x1B, 0x45, 0x01];
    /// Emphasized (bold) mode OFF.
    pub const BOLD_OFF: &[u8] = &[0x1B, 0x45, 0x00];
    /// Set line spacing to n dots (24 = default).
    pub const LINE_SPACING: &[u8] = &[0x1B, 0x32];
    /// Horizontal tab.
    pub const HT: &[u8] = &[0x09];
    /// Print and feed n lines (n=3 means 3 lines after printing).
    pub const FEED: u8 = 0x0A;
}

/// ESC/POS receipt data bytes.
#[derive(Debug)]
pub struct ReceiptData {
    pub header_lines: Vec<String>,
    pub items: Vec<ReceiptItem>,
    pub total: f64,
    pub payment_method: String,
    pub footer_lines: Vec<String>,
}

#[derive(Debug)]
pub struct ReceiptItem {
    pub name: String,
    pub quantity: f64,
    pub price: f64,
    pub subtotal: f64,
}

#[derive(Debug, Deserialize)]
struct InvoiceItemJson {
    #[serde(rename = "productName")]
    product_name: String,
    quantity: f64,
    #[serde(rename = "unitPrice")]
    unit_price: f64,
    subtotal: f64,
}

#[derive(Debug, Deserialize)]
struct InvoiceJson {
    #[serde(rename = "invoiceNumber")]
    invoice_number: String,
    customer: String,
    items: Vec<InvoiceItemJson>,
    total: f64,
    #[serde(rename = "paymentMethod")]
    payment_method: String,
    date: String,
}

/// Build an ESC/POS byte buffer from invoice data.
fn build_receipt_bytes(receipt: &ReceiptData) -> Vec<u8> {
    let mut buf = Vec::new();

    // 1. Initialize printer
    buf.extend_from_slice(escpos::INIT);

    // 2. Header
    buf.extend_from_slice(escpos::FONT_A);
    for line in &receipt.header_lines {
        buf.extend_from_slice(escpos::BOLD_ON);
        buf.extend_from_slice(line.as_bytes());
        buf.extend_from_slice(escpos::BOLD_OFF);
        buf.push(escpos::FEED);
    }
    buf.extend_from_slice(escpos::LF);
    buf.extend_from_slice(escpos::LF);

    // 3. Item rows with tabs for alignment
    for item in &receipt.items {
        buf.extend_from_slice(escpos::FONT_B);
        buf.extend_from_slice(
            format!(
                "{} x{:.0}  ${:.2}",
                &item.name, item.quantity, item.price
            )
            .as_bytes(),
        );
        buf.push(escpos::FEED);
        buf.extend_from_slice(escpos::FONT_A);
        buf.extend_from_slice(format!("  ${:.2}", item.subtotal).as_bytes());
        buf.push(escpos::FEED);
    }

    // 4. Separator
    buf.extend_from_slice("------------------------------".as_bytes());
    buf.push(escpos::FEED);

    // 5. Total
    buf.extend_from_slice(escpos::BOLD_ON);
    buf.extend_from_slice(
        format!("TOTAL: ${:.2}", receipt.total).as_bytes(),
    );
    buf.extend_from_slice(escpos::BOLD_OFF);
    buf.push(escpos::FEED);

    // 6. Payment
    buf.extend_from_slice(
        format!("Payment: {}", receipt.payment_method).as_bytes(),
    );
    buf.push(escpos::FEED);
    buf.extend_from_slice(escpos::LF);

    // 7. Footer
    for line in &receipt.footer_lines {
        buf.extend_from_slice(line.as_bytes());
        buf.push(escpos::FEED);
    }

    buf.extend_from_slice(escpos::LF);
    buf.extend_from_slice(escpos::LF);

    // 8. Cut paper
    buf.extend_from_slice(escpos::CUT);

    buf
}

/// Parse invoice JSON into a `ReceiptData` struct.
fn invoice_json_to_receipt(json_str: &str) -> Result<ReceiptData, String> {
    let inv: InvoiceJson =
        serde_json::from_str(json_str).map_err(|e| format!("Failed to parse invoice: {}", e))?;

    let header_lines = vec![
        "INVOICE".to_string(),
        inv.invoice_number.clone(),
        format!("Date: {}", inv.date),
        format!("Customer: {}", inv.customer),
    ];

    let items: Vec<ReceiptItem> = inv
        .items
        .iter()
        .map(|i| ReceiptItem {
            name: i.product_name.clone(),
            quantity: i.quantity,
            price: i.unit_price,
            subtotal: i.subtotal,
        })
        .collect();

    let footer_lines = vec![
        "Thank you for your purchase!".to_string(),
        inv.invoice_number.clone(),
    ];

    Ok(ReceiptData {
        header_lines,
        items,
        total: inv.total,
        payment_method: inv.payment_method,
        footer_lines,
    })
}

/// Print a receipt from serialised JSON invoice data.
///
/// In a real Tauri build, this would:
/// 1. Discover the thermal printer (USB vendor ID or config path)
/// 2. Open a serial/USB connection
/// 3. Write the ESC/POS bytes
/// 4. Close the connection
///
/// For the MVP, this validates the data and returns success.
pub fn print_receipt(invoice_json: &str) -> Result<String, String> {
    let receipt = invoice_json_to_receipt(invoice_json)?;

    // Build ESC/POS bytes (would be sent to printer in production)
    let _bytes = build_receipt_bytes(&receipt);

    // Simulated printing delay
    std::thread::sleep(std::time::Duration::from_millis(100));

    Ok(format!(
        "Receipt sent to printer: {}",
        receipt.header_lines.get(1).unwrap_or(&"N/A".to_string())
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_receipt_includes_init() {
        let receipt = ReceiptData {
            header_lines: vec!["STORE".to_string()],
            items: vec![],
            total: 0.0,
            payment_method: "cash".to_string(),
            footer_lines: vec![],
        };
        let bytes = build_receipt_bytes(&receipt);
        // First two bytes should be ESC @ (initialize printer)
        assert_eq!(bytes[0], 0x1B);
        assert_eq!(bytes[1], 0x40);
        // Last two bytes should be ESC V NUL (cut paper)
        let len = bytes.len();
        assert_eq!(bytes[len - 3], 0x1D);
        assert_eq!(bytes[len - 2], 0x56);
        assert_eq!(bytes[len - 1], 0x00);
    }

    #[test]
    fn test_parse_invalid_json_returns_error() {
        let result = print_receipt("not valid json");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to parse"));
    }

    #[test]
    fn test_parse_valid_invoice_succeeds() {
        let json = r#"{
            "invoiceNumber": "INV-store_1-00001",
            "customer": "Juan",
            "items": [{"productName": "Coca-Cola", "quantity": 2.0, "unitPrice": 150.0, "subtotal": 300.0}],
            "total": 300.0,
            "paymentMethod": "cash",
            "date": "2025-01-15T10:00:00.000Z"
        }"#;
        let result = print_receipt(json);
        assert!(result.is_ok());
        assert!(result.unwrap().contains("INV-store_1-00001"));
    }
}
