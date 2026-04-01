import { Injectable } from "@angular/core";
import { TerminalBackendAdapter } from "./terminal-backend-adapter";
import { Subject } from "rxjs";

/**
 * Mock Terminal Service for Web Mode
 * Used when running in browser - no real terminal support
 */
@Injectable({
  providedIn: "root",
})
export class MockTerminalService implements TerminalBackendAdapter {
  private dataSubject = new Subject<string>();
  readonly onData$ = this.dataSubject.asObservable();

  async connect(cwd?: string): Promise<void> {
    console.log("[MockTerminal] Terminal not available in web mode");
    this.dataSubject.next(
      "\r\n\x1b[36m╔═══════════════════════════════════════╗\x1b[0m\r\n" +
        "\x1b[36m║  Vertex Editor - Web Mode             ║\x1b[0m\r\n" +
        "\x1b[36m╚═══════════════════════════════════════╝\x1b[0m\r\n" +
        "\r\n\x1b[33mTerminal is only available in Desktop mode.\x1b[0m\r\n" +
        "\x1b[33mDownload the app for full terminal support.\x1b[0m\r\n\r\n",
    );
    return Promise.resolve();
  }

  async write(data: string): Promise<void> {
    // No-op in web mode
    return Promise.resolve();
  }

  async resize(cols: number, rows: number): Promise<void> {
    // No-op in web mode
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    // No-op in web mode
    return Promise.resolve();
  }
}
