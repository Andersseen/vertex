import { spawn as processSpawn, type ChildProcess } from "child_process";
import { resolve } from "path";
import type {
  TerminalSession,
  CreateTerminalOptions,
  TerminalMessage,
} from "./types";

/**
 * Fallback Terminal Manager using regular child_process
 * Used when node-pty is not available or fails
 */
export class FallbackTerminalManager {
  private sessions = new Map<
    string,
    { session: TerminalSession; process: ChildProcess }
  >();
  private messageHandlers: ((message: TerminalMessage) => void)[] = [];
  private workspacePath: string;

  constructor(workspacePath: string = process.cwd()) {
    this.workspacePath = workspacePath;
    console.log(
      "[FallbackTerminalManager] Using fallback mode (child_process)",
    );
    console.log(`[FallbackTerminalManager] Workspace: ${this.workspacePath}`);
  }

  createTerminal(options: CreateTerminalOptions = {}): TerminalSession {
    const id =
      options.id ||
      `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cwd = options.cwd
      ? resolve(this.workspacePath, options.cwd)
      : this.workspacePath;

    console.log(`[FallbackTerminalManager] Creating terminal ${id}`);
    console.log(`[FallbackTerminalManager]   CWD: ${cwd}`);

    // Spawn bash with interactive flag
    const shellProcess = processSpawn("/bin/bash", ["-i"], {
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        PS1: "\\w $ ",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const session: TerminalSession = {
      id,
      pid: shellProcess.pid || 0,
      cwd,
      shell: "/bin/bash",
      cols: options.cols || 80,
      rows: options.rows || 24,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(id, { session, process: shellProcess });

    // Handle stdout
    shellProcess.stdout?.on("data", (data) => {
      this.broadcast({
        type: "data",
        terminalId: id,
        data: data.toString(),
      });
    });

    // Handle stderr
    shellProcess.stderr?.on("data", (data) => {
      this.broadcast({
        type: "data",
        terminalId: id,
        data: data.toString(),
      });
    });

    // Handle exit
    shellProcess.on("exit", (code) => {
      console.log(
        `[FallbackTerminalManager] Terminal ${id} exited with code ${code}`,
      );
      this.broadcast({
        type: "exit",
        terminalId: id,
        exitCode: code ?? undefined,
      });
      this.sessions.delete(id);
    });

    // Send initial message
    setTimeout(() => {
      this.broadcast({
        type: "data",
        terminalId: id,
        data: `Vertex Terminal (Fallback Mode)\r\n${cwd} $ `,
      });
    }, 100);

    this.broadcast({
      type: "created",
      terminalId: id,
    });

    return session;
  }

  write(terminalId: string, data: string): boolean {
    const terminal = this.sessions.get(terminalId);
    if (!terminal) {
      console.warn(
        `[FallbackTerminalManager] Terminal ${terminalId} not found`,
      );
      return false;
    }

    terminal.process.stdin?.write(data);
    terminal.session.lastActivity = new Date();
    return true;
  }

  resize(_terminalId: string, _cols: number, _rows: number): boolean {
    // Resize not supported in fallback mode
    return true;
  }

  kill(terminalId: string): boolean {
    const terminal = this.sessions.get(terminalId);
    if (!terminal) {
      return false;
    }

    console.log(`[FallbackTerminalManager] Killing terminal ${terminalId}`);
    terminal.process.kill();
    this.sessions.delete(terminalId);
    return true;
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values()).map((t) => t.session);
  }

  onMessage(handler: (message: TerminalMessage) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  private broadcast(message: TerminalMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error(
          "[FallbackTerminalManager] Error in message handler:",
          error,
        );
      }
    });
  }

  dispose(): void {
    console.log("[FallbackTerminalManager] Disposing all terminals...");
    this.sessions.forEach((terminal, id) => {
      console.log(`[FallbackTerminalManager] Killing terminal ${id}`);
      terminal.process.kill();
    });
    this.sessions.clear();
    this.messageHandlers = [];
  }
}
