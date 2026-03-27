use portable_pty::{native_pty_system, CommandBuilder, PtySize, MasterPty};
use serde::Deserialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State, Emitter};

pub struct TerminalInstance {
    pub writer: Box<dyn Write + Send>,
    pub master: Box<dyn MasterPty + Send>,
}

pub struct TerminalManager {
    pub instances: Arc<Mutex<HashMap<String, TerminalInstance>>>,
}

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct ResizePayload {
    pub id: String,
    pub cols: u16,
    pub rows: u16,
}

#[tauri::command]
pub async fn spawn_terminal(app_handle: AppHandle, id: String) -> Result<(), String> {
    let pty_system = native_pty_system();

    // Use default shell based on OS
    let shell = if cfg!(target_os = "windows") {
        "powershell.exe".to_string()
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "zsh".to_string())
    };

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let cmd = CommandBuilder::new(shell);
    let _child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    let reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    // Store in TerminalManager
    let manager = app_handle.state::<TerminalManager>();
    let mut instances = manager.instances.lock().unwrap();
    instances.insert(id.clone(), TerminalInstance {
        writer: writer,
        master: pair.master,
    });

    // Spawn tokio task to read from PTY and emit to frontend
    let handle = app_handle.clone();
    let id_clone = id.clone();
    
    // We use tokio::task::spawn_blocking because reading from PTY is blocking
    tokio::task::spawn_blocking(move || {
        let mut reader = reader;
        let mut buffer = [0u8; 4096];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                    let _ = handle.emit(&format!("terminal-stdout-{}", id_clone), data);
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn write_to_terminal(
    id: String,
    data: String,
    manager: State<'_, TerminalManager>,
) -> Result<(), String> {
    let mut instances = manager.instances.lock().unwrap();
    if let Some(instance) = instances.get_mut(&id) {
        instance.writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        instance.writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Terminal with id {} not found", id))
    }
}

#[tauri::command]
pub fn resize_terminal(
    id: String,
    cols: u16,
    rows: u16,
    manager: State<'_, TerminalManager>,
) -> Result<(), String> {
    let instances = manager.instances.lock().unwrap();
    if let Some(instance) = instances.get(&id) {
        instance.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Terminal with id {} not found", id))
    }
}

#[tauri::command]
pub fn close_terminal(
    id: String,
    manager: State<'_, TerminalManager>,
) -> Result<(), String> {
    let mut instances = manager.instances.lock().unwrap();
    instances.remove(&id);
    // The reader thread will eventually terminate when it fails to read or gets EOF
    Ok(())
}
