mod terminal;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::Manager;

use tauri_plugin_dialog::DialogExt;

#[tauri::command]
async fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
  // En Tauri v2, la API es app.dialog().file()
  // blocking_pick_folder retorna Option<FilePath>
  let folder = app.dialog().file().blocking_pick_folder();
  
  match folder {
    Some(file_path) => Ok(Some(file_path.to_string())),
    None => Ok(None),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
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
        terminal::close_terminal,
        select_folder
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
