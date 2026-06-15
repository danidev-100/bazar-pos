use tauri::Manager;

mod pdf;
mod printer;
mod sync;

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

/// Run a full sync cycle (push local changes → pull remote changes).
///
/// This is an async command because it performs database I/O over the
/// network. Returns a JSON-serialised `SyncResult` with counts of
/// pushed/pulled rows, conflicts, and any errors.
#[tauri::command]
async fn sync_now() -> Result<String, String> {
    let result = sync::run_sync()
        .await
        .map_err(|e| format!("Sync failed: {}", e))?;

    serde_json::to_string(&result).map_err(|e| format!("Failed to serialise sync result: {}", e))
}

// ──────────────────────────────────────────────
// App entry point
// ──────────────────────────────────────────────

/// Registers the SQL plugin, PDF/printer/sync commands, and initialises the
/// local SQLite database.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:pos.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            generate_pdf,
            print_receipt,
            sync_now
        ])
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
