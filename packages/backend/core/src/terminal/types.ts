// Tipos para el sistema de terminal

export interface TerminalSession {
  id: string;
  pid: number;
  cwd: string;
  shell: string;
  cols: number;
  rows: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface CreateTerminalOptions {
  id?: string;
  cwd?: string;
  shell?: string;
  cols?: number;
  rows?: number;
}

export interface TerminalMessage {
  type: "data" | "exit" | "created" | "error" | "connected";
  terminalId?: string;
  data?: string;
  exitCode?: number;
  signal?: number;
  error?: string;
}

export interface TerminalWriteRequest {
  terminalId: string;
  data: string;
}

export interface TerminalResizeRequest {
  terminalId: string;
  cols: number;
  rows: number;
}

// Interface for terminal manager implementations
export interface ITerminalManager {
  createTerminal(options?: CreateTerminalOptions): TerminalSession;
  write(terminalId: string, data: string): boolean;
  resize(terminalId: string, cols: number, rows: number): boolean;
  kill(terminalId: string): boolean;
  getAllSessions(): TerminalSession[];
  onMessage(handler: (message: TerminalMessage) => void): () => void;
  dispose(): void;
}
