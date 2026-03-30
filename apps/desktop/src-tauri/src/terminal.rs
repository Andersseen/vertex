use portable_pty::{native_pty_system, CommandBuilder, PtySize, MasterPty};
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

    // Use default shell based on OS — try multiple fallbacks
    let shell = if cfg!(target_os = "windows") {
        "powershell.exe".to_string()
    } else {
        // Try $SHELL first, then common shell paths
        std::env::var("SHELL").unwrap_or_else(|_| {
            // Check if common shells exist
            for path in &["/bin/zsh", "/bin/bash", "/bin/sh"] {
                if std::path::Path::new(path).exists() {
                    return path.to_string();
                }
            }
            "/bin/sh".to_string()
        })
    };

    println!("[Terminal] Using shell: {}", shell);

    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let mut cmd = CommandBuilder::new(&shell);
    
    // Pass -l flag for login shell to load profile
    cmd.arg("-l");

    // Set working directory if provided
    if let Some(ref working_dir) = cwd {
        let path = std::path::PathBuf::from(working_dir);
        if path.exists() && path.is_dir() {
            cmd.cwd(path);
        } else {
            println!("[Terminal] Working directory {} does not exist, using home", working_dir);
            if let Some(home) = std::env::var("HOME").ok() {
                cmd.cwd(std::path::PathBuf::from(home));
            }
        }
    } else {
        // Default to home directory
        if let Some(home) = std::env::var("HOME").ok() {
            cmd.cwd(std::path::PathBuf::from(home));
        }
    }
    
    // Ensure PATH is inherited properly
    if let Ok(path) = std::env::var("PATH") {
        cmd.env("PATH", path);
    }
    if let Ok(home) = std::env::var("HOME") {
        cmd.env("HOME", home);
    }
    if let Ok(user) = std::env::var("USER") {
        cmd.env("USER", user);
    }
    // Set TERM to enable proper terminal features
    cmd.env("TERM", "xterm-256color");

    let _child = pair.slave.spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell '{}': {} (try installing the shell or check your PATH)", shell, e))?;

    let reader = pair.master.try_clone_reader().map_err(|e| format!("Failed to clone reader: {}", e))?;
    let writer = pair.master.take_writer().map_err(|e| format!("Failed to take writer: {}", e))?;

    // Store in TerminalManager
    let manager = app_handle.state::<TerminalManager>();
    let mut instances = manager.instances.lock().unwrap();
    instances.insert(id.clone(), TerminalInstance {
        writer,
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
        let mut buffer = [0u8; 4096];
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
    Ok(())
}
