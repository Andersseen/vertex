/**
 * Terminal Manager for Node.js
 * Uses node-pty for PTY support
 */

import pty from "node-pty";
import { resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";

export class TerminalManager {
  constructor(workspacePath = process.cwd()) {
    this.workspacePath = workspacePath;
    this.sessions = new Map();
    this.messageHandlers = [];
    this.availableShell = this.detectAvailableShell();

    console.log(`[TerminalManager] Using shell: ${this.availableShell}`);
    console.log(`[TerminalManager] Workspace: ${this.workspacePath}`);
  }

  detectAvailableShell() {
    const shellsToTry = [
      process.env.SHELL,
      "/bin/zsh",
      "/bin/bash",
      "/usr/bin/zsh",
      "/usr/bin/bash",
      "/bin/sh",
    ].filter(Boolean);

    for (const shell of shellsToTry) {
      try {
        // Usar fs.existsSync en lugar de execSync para mejor compatibilidad
        if (existsSync(shell)) {
          console.log(`[TerminalManager] Found shell: ${shell}`);
          return shell;
        }
      } catch {
        continue;
      }
    }

    return "/bin/bash";
  }

  ensureDirectoryExists(dir) {
    if (!existsSync(dir)) {
      try {
        mkdirSync(dir, { recursive: true });
      } catch (error) {
        console.warn(
          `[TerminalManager] Could not create directory ${dir}:`,
          error.message,
        );
      }
    }
  }

  createTerminal(options = {}) {
    try {
      const id =
        options.id ||
        `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      let cwd = options.cwd
        ? resolve(this.workspacePath, options.cwd)
        : this.workspacePath;

      this.ensureDirectoryExists(cwd);

      if (!existsSync(cwd)) {
        console.warn(
          `[TerminalManager] Directory ${cwd} does not exist, using workspace`,
        );
        cwd = this.workspacePath;
      }

      const shell = options.shell || this.availableShell;
      const cols = options.cols || 80;
      const rows = options.rows || 24;

      console.log(`[TerminalManager] Creating terminal ${id}`);
      console.log(`[TerminalManager]   Shell: ${shell}`);
      console.log(`[TerminalManager]   CWD: ${cwd}`);

      const ptyProcess = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols,
        rows,
        cwd,
        env: {
          ...process.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        },
      });

      const session = {
        id,
        pid: ptyProcess.pid,
        cwd,
        shell,
        cols,
        rows,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      this.sessions.set(id, { session, pty: ptyProcess });

      ptyProcess.onData((data) => {
        this.broadcast({ type: "data", terminalId: id, data });
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(
          `[TerminalManager] Terminal ${id} exited with code ${exitCode}`,
        );
        this.broadcast({ type: "exit", terminalId: id, exitCode, signal });
        this.sessions.delete(id);
      });

      this.broadcast({ type: "created", terminalId: id });

      return session;
    } catch (error) {
      console.error("[TerminalManager] Failed to create terminal:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create terminal";

      // Enviar mensaje de error informativo al frontend
      const errorData =
        `\r\n\x1b[31m[ERROR] Terminal could not be started\x1b[0m\r\n` +
        `\x1b[33mReason: ${errorMessage}\x1b[0m\r\n\r\n` +
        `\x1b[36mThis is a known issue with node-pty on macOS.\x1b[0m\r\n` +
        `\x1b[36mTry running: cd node_modules/node-pty && bun run build\x1b[0m\r\n`;

      // Crear un ID para el terminal fallido
      const failedId = `term-${Date.now()}-error`;
      this.broadcast({ type: "created", terminalId: failedId });

      // Enviar mensaje de error como datos
      setTimeout(() => {
        this.broadcast({ type: "data", terminalId: failedId, data: errorData });
      }, 100);

      this.broadcast({
        type: "error",
        error: errorMessage,
      });

      // No lanzar el error para que el frontend pueda manejarlo
      return { id: failedId, error: errorMessage, failed: true };
    }
  }

  write(terminalId, data) {
    const terminal = this.sessions.get(terminalId);
    if (!terminal) {
      console.warn(`[TerminalManager] Terminal ${terminalId} not found`);
      return false;
    }

    try {
      terminal.pty.write(data);
      terminal.session.lastActivity = new Date();
      return true;
    } catch (error) {
      console.error(
        `[TerminalManager] Error writing to terminal ${terminalId}:`,
        error,
      );
      return false;
    }
  }

  resize(terminalId, cols, rows) {
    const terminal = this.sessions.get(terminalId);
    if (!terminal) {
      console.warn(`[TerminalManager] Terminal ${terminalId} not found`);
      return false;
    }

    try {
      terminal.pty.resize(cols, rows);
      terminal.session.cols = cols;
      terminal.session.rows = rows;
      return true;
    } catch (error) {
      console.error(
        `[TerminalManager] Error resizing terminal ${terminalId}:`,
        error,
      );
      return false;
    }
  }

  kill(terminalId) {
    const terminal = this.sessions.get(terminalId);
    if (!terminal) return false;

    console.log(`[TerminalManager] Killing terminal ${terminalId}`);
    try {
      terminal.pty.kill();
    } catch (error) {
      console.error(
        `[TerminalManager] Error killing terminal ${terminalId}:`,
        error,
      );
    }
    this.sessions.delete(terminalId);
    return true;
  }

  getAllSessions() {
    return Array.from(this.sessions.values()).map((t) => t.session);
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  broadcast(message) {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error("[TerminalManager] Error in message handler:", error);
      }
    });
  }

  dispose() {
    console.log("[TerminalManager] Disposing all terminals...");
    this.sessions.forEach((terminal, id) => {
      console.log(`[TerminalManager] Killing terminal ${id}`);
      try {
        terminal.pty.kill();
      } catch (error) {
        console.error(`[TerminalManager] Error killing terminal ${id}:`, error);
      }
    });
    this.sessions.clear();
    this.messageHandlers = [];
  }
}
