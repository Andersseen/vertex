use portable_pty::{native_pty_system, CommandBuilder, PtySize, PtySystem};
use serde::Deserialize;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use tokio::sync::mpsc;

pub struct TerminalState {
    pub pty_write: Arc<Mutex<Box<dyn Write + Send>>>,
}

#[derive(Deserialize)]
pub struct ResizePayload {
    pub cols: u16,
    pub rows: u16,
}

#[tauri::command]
pub async fn spawn_terminal(app_handle: AppHandle) -> Result<(), String> {
    let pty_system = native_pty_system();

    // Use default shell based on OS
    let shell = if cfg!(target_os = "windows") {
        "powershell.exe"
    } else {
        "zsh"
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

    // Store writer in state for 'write_to_terminal' command
    app_handle.manage(TerminalState {
        pty_write: Arc::new(Mutex::new(writer)),
    });

    // Spawn thread to read from PTY and emit to frontend
    let handle = app_handle.clone();
    std::thread::spawn(move || {
        let mut reader = reader;
        let mut buffer = [0u8; 1024];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                    let _ = handle.emit("terminal-stdout", data);
                }
                Err(_) => break,
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn write_to_terminal(
    data: String,
    state: State<'_, TerminalState>,
) -> Result<(), String> {
    let mut writer = state.pty_write.lock().unwrap();
    writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn resize_terminal(
    _cols: u16,
    _rows: u16,
    // Note: resizing requires keeping the master handle, which we aren't doing perfectly here.
    // For a production IDE, we'd store the master handle in TerminalState.
) -> Result<(), String> {
    // Implementation for resizing would go here
    Ok(())
}
