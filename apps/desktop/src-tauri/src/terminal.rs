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
pub async fn spawn_terminal(app_handle: AppHandle, id: String, cwd: Option<String>) -> Result<(), String> {
    let pty_system = native_pty_system();

    // Close any existing terminal with the same ID first
    let should_wait = {
        let manager = app_handle.state::<TerminalManager>();
        let mut instances = manager.instances.lock().unwrap();
        let removed = instances.remove(&id).is_some();
        if removed {
            println!("[Terminal] Closed existing terminal with ID: {}", id);
        }
        removed
    };
    
    // Give a small delay for the old reader thread to terminate
    if should_wait {
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

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

    let mut cmd = CommandBuilder::new(shell);
    
    // Set working directory if provided
    if let Some(working_dir) = cwd {
        cmd.cwd(std::path::PathBuf::from(working_dir));
    }
    
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
    drop(instances); // Release lock before spawning thread

    // Spawn tokio task to read from PTY and emit to frontend
    let handle = app_handle.clone();
    let id_clone = id.clone();
    
    println!("[Terminal] Spawning reader thread for ID: {}", id_clone);
    
    // We use tokio::task::spawn_blocking because reading from PTY is blocking
    tokio::task::spawn_blocking(move || {
        let mut reader = reader;
        // Smaller buffer for better UTF-8 handling
        let mut buffer = [0u8; 1024];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => {
                    println!("[Terminal] EOF reached for {}", id_clone);
                    break;
                }
                Ok(n) => {
                    // Convert bytes to string, replacing invalid UTF-8 sequences
                    let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                    if let Err(e) = handle.emit(&format!("terminal-stdout-{}", id_clone), data) {
                        eprintln!("[Terminal] Failed to emit data: {}", e);
                        break;
                    }
                }
                Err(e) => {
                    eprintln!("[Terminal] Read error for {}: {}", id_clone, e);
                    break;
                }
            }
        }
        println!("[Terminal] Reader thread ended for {}", id_clone);
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
    if instances.remove(&id).is_some() {
        println!("[Terminal] Closed terminal with ID: {}", id);
    }
    // The reader thread will eventually terminate when it fails to read or gets EOF
    Ok(())
}
