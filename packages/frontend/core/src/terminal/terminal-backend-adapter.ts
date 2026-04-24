import { Observable } from "rxjs";

/**
 * Interface defining the contract for terminal backend implementations (Tauri, Web, etc.)
 */
export interface TerminalBackendAdapter {
  /**
   * Initialize the terminal connection (spawn PTY)
   * @param cwd - Optional current working directory to start the terminal in
   */
  connect(cwd?: string): Promise<void>;

  /**
   * Write data to the backend PTY
   */
  write(data: string): Promise<void>;

  /**
   * Observable stream of data from the backend PTY
   */
  readonly onData$: Observable<string>;

  /**
   * Disconnect and cleanup resources
   */
  disconnect(): Promise<void>;

  /**
   * Write output text directly to the terminal display
   * (bypasses command input processing; used for streaming logs)
   */
  writeOutput(data: string): Promise<void>;

  /**
   * Resize the backend PTY
   */
  resize(cols: number, rows: number): Promise<void>;
}
