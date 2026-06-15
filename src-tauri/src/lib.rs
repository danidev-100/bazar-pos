use tauri::Manager;

/// Registers the SQL plugin and initialises the local SQLite database.
/// The sync engine and printer commands will be added in later phases.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:pos.db", migrations())
                .build(),
        )
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
