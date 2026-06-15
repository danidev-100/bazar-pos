use tauri::Manager;

mod pdf;
mod printer;

// ──────────────────────────────────────────────
// Tauri commands
// ──────────────────────────────────────────────

/// Generate a PDF invoice from serialised JSON invoice data.
/// Returns the raw PDF bytes that the frontend can save as a file.
#[tauri::command]
fn generate_pdf(invoice_data: String) -> Result<Vec<u8>, String> {
    pdf::generate_pdf(&invoice_data)
}

/// Send an invoice to the thermal printer via ESC/POS.
/// Returns a confirmation message.
#[tauri::command]
fn print_receipt(invoice_data: String) -> Result<String, String> {
    printer::print_receipt(&invoice_data)
}

// ──────────────────────────────────────────────
// App entry point
// ──────────────────────────────────────────────

/// Registers the SQL plugin, PDF/printer commands, and initialises the
/// local SQLite database.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:pos.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![generate_pdf, print_receipt])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Returns an empty migration list. Migrations will be generated from
/// Drizzle schema definitions in later phases.
fn migrations() -> Vec<&'static tauri_plugin_sql::Migration> {
    vec![]
}
