mod terminal;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Initialize Terminal Manager state
      app.manage(terminal::TerminalManager {
        instances: Arc::new(Mutex::new(HashMap::new())),
      });

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        terminal::spawn_terminal,
        terminal::write_to_terminal,
        terminal::resize_terminal,
        terminal::close_terminal
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
