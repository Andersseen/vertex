import { spawn as ptySpawn, type IPty } from "node-pty";
import { resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import {
  execSync,
  spawn as processSpawn,
  type ChildProcess,
} from "child_process";
import type {
  TerminalSession,
  CreateTerminalOptions,
  TerminalMessage,
} from "./types";

// Check if node-pty is available
let nodePtyAvailable = false;
try {
  // Test if we can create a simple PTY
  const testPty = ptySpawn("echo", ["test"], {
    name: "xterm-color",
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
  });
  testPty.kill();
  nodePtyAvailable = true;
  console.log("[TerminalManager] node-pty is available");
} catch (error) {
  console.warn("[TerminalManager] node-pty not available, using fallback mode");
  nodePtyAvailable = false;
}

export class TerminalManager {
  private sessions = new Map<string, { session: TerminalSession; pty: IPty }>();
  private messageHandlers: ((message: TerminalMessage) => void)[] = [];
  private workspacePath: string;
  private availableShell: string | null = null;

  constructor(workspacePath: string = process.cwd()) {
    this.workspacePath = workspacePath;
    this.availableShell = this.detectAvailableShell();
    console.log(`[TerminalManager] Using shell: ${this.availableShell}`);
    console.log(`[TerminalManager] Workspace: ${this.workspacePath}`);
  }

  /**
   * Detect available shell on the system
   */
  private detectAvailableShell(): string {
    // Try to find a working shell
    const shellsToTry = [
      process.env.SHELL, // User's preferred shell
      "/bin/zsh",
      "/bin/bash",
      "/usr/bin/zsh",
      "/usr/bin/bash",
      "/bin/sh",
    ].filter(Boolean) as string[];

    for (const shell of shellsToTry) {
      try {
        // Test if shell exists and is executable
        execSync(`test -x ${shell}`, { stdio: "ignore" });
        console.log(`[TerminalManager] Found shell: ${shell}`);
        return shell;
      } catch {
        continue;
      }
    }

    // Fallback to 'bash' command (will use PATH)
    console.warn("[TerminalManager] No specific shell found, using 'bash'");
    return "bash";
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectoryExists(dir: string): void {
    if (!existsSync(dir)) {
      console.log(`[TerminalManager] Creating directory: ${dir}`);
      try {
        mkdirSync(dir, { recursive: true });
      } catch (error) {
        console.warn(
          `[TerminalManager] Could not create directory ${dir}:`,
          error,
        );
      }
    }
  }

  /**
   * Create a new terminal session
   */
  createTerminal(options: CreateTerminalOptions = {}): TerminalSession {
    try {
      const id =
        options.id ||
        `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Resolve working directory
      let cwd = options.cwd
        ? resolve(this.workspacePath, options.cwd)
        : this.workspacePath;

      // Ensure directory exists
      this.ensureDirectoryExists(cwd);

      // If resolved path doesn't exist, fall back to workspace
      if (!existsSync(cwd)) {
        console.warn(
          `[TerminalManager] Directory ${cwd} does not exist, using workspace`,
        );
        cwd = this.workspacePath;
      }

      const shell = options.shell || this.availableShell || "bash";
      const cols = options.cols || 80;
      const rows = options.rows || 24;

      console.log(`[TerminalManager] Creating terminal ${id}`);
      console.log(`[TerminalManager]   Shell: ${shell}`);
      console.log(`[TerminalManager]   CWD: ${cwd}`);

      const ptyProcess = ptySpawn(shell, [], {
        name: "xterm-256color",
        cols,
        rows,
        cwd,
        env: {
          ...process.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
          HOME: process.env.HOME || process.env.USERPROFILE || cwd,
          PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
        } as { [key: string]: string },
      });

      const session: TerminalSession = {
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

      // Handle data from PTY
      ptyProcess.onData((data) => {
        this.broadcast({
          type: "data",
          terminalId: id,
          data,
        });
      });

      // Handle PTY exit
      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(
          `[TerminalManager] Terminal ${id} exited with code ${exitCode}`,
        );
        this.broadcast({
          type: "exit",
          terminalId: id,
          exitCode,
          signal,
        });
        this.sessions.delete(id);
      });

      this.broadcast({
        type: "created",
        terminalId: id,
      });

      return session;
    } catch (error) {
      console.error("[TerminalManager] Failed to create terminal:", error);
      this.broadcast({
        type: "error",
        error:
          error instanceof Error ? error.message : "Failed to create terminal",
      });
      throw error;
    }
  }

  /**
   * Write data to a terminal
   */
  write(terminalId: string, data: string): boolean {
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

  /**
   * Resize a terminal
   */
  resize(terminalId: string, cols: number, rows: number): boolean {
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

  /**
   * Kill a terminal
   */
  kill(terminalId: string): boolean {
    const terminal = this.sessions.get(terminalId);
    if (!terminal) {
      return false;
    }

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

  /**
   * Get a terminal session
   */
  getSession(terminalId: string): TerminalSession | undefined {
    return this.sessions.get(terminalId)?.session;
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values()).map((t) => t.session);
  }

  /**
   * Subscribe to terminal messages
   */
  onMessage(handler: (message: TerminalMessage) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Broadcast message to all handlers
   */
  private broadcast(message: TerminalMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error("[TerminalManager] Error in message handler:", error);
      }
    });
  }

  /**
   * Clean up all terminals
   */
  dispose(): void {
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
