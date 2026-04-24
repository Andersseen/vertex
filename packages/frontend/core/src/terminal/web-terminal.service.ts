import { Injectable } from "@angular/core";
import { TerminalBackendAdapter } from "./terminal-backend-adapter";
import { Subject } from "rxjs";

interface TerminalMessage {
  type: "data" | "exit" | "created" | "error" | "connected" | "list";
  terminalId?: string;
  data?: string;
  error?: string;
}

@Injectable({
  providedIn: "root",
})
export class WebTerminalService implements TerminalBackendAdapter {
  private dataSubject = new Subject<string>();
  private ws: WebSocket | null = null;
  private terminalId: string | null = null;
  private isConnected = false;
  private basePort = 3002;
  private maxPortAttempts = 5;
  private currentPort: number | null = null;

  readonly onData$ = this.dataSubject.asObservable();

  async connect(cwd?: string): Promise<void> {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      console.log("[WebTerminal] Already connected");
      return;
    }

    return new Promise((resolve, reject) => {
      this.tryConnect(this.basePort, 0, cwd, resolve, reject);
    });
  }

  private tryConnect(
    port: number,
    attempt: number,
    cwd: string | undefined,
    resolve: () => void,
    reject: (error: Error) => void,
  ): void {
    if (attempt >= this.maxPortAttempts) {
      const error = new Error(
        `Could not connect to terminal server on ports ${this.basePort}-${this.basePort + this.maxPortAttempts - 1}`,
      );
      console.error("[WebTerminal]", error.message);
      reject(error);
      return;
    }

    const url = `ws://localhost:${port}/ws`;
    console.log(`[WebTerminal] Trying port ${port}...`);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log(`[WebTerminal] Connected on port ${port}`);
      this.ws = ws;
      this.currentPort = port;
      this.basePort = port;
      this.isConnected = true;

      // Set up message handler
      ws.onmessage = (event) => {
        try {
          const message: TerminalMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("[WebTerminal] Failed to parse message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebTerminal] WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("[WebTerminal] WebSocket closed");
        this.isConnected = false;
        this.terminalId = null;
      };

      // Create terminal
      ws.send(
        JSON.stringify({
          type: "create",
          config: { cwd },
        }),
      );

      resolve();
    };

    ws.onerror = () => {
      ws.close();
      this.tryConnect(port + 1, attempt + 1, cwd, resolve, reject);
    };
  }

  private handleMessage(message: TerminalMessage): void {
    switch (message.type) {
      case "created":
        this.terminalId = message.terminalId || null;
        console.log("[WebTerminal] Terminal created:", this.terminalId);
        break;

      case "data":
        if (message.data) {
          this.dataSubject.next(message.data);
        }
        break;

      case "error":
        console.error("[WebTerminal] Error:", message.error);
        this.dataSubject.next(`\r\n\x1b[31mError: ${message.error}\x1b[0m\r\n`);
        break;

      case "exit":
        console.log("[WebTerminal] Terminal exited");
        this.terminalId = null;
        break;
    }
  }

  async write(data: string): Promise<void> {
    if (!this.isConnected || !this.ws || !this.terminalId) {
      console.warn("[WebTerminal] Not connected, cannot write");
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "write",
        terminalId: this.terminalId,
        data,
      }),
    );
  }

  async resize(cols: number, rows: number): Promise<void> {
    if (!this.isConnected || !this.ws || !this.terminalId) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "resize",
        terminalId: this.terminalId,
        cols,
        rows,
      }),
    );
  }

  async writeOutput(_data: string): Promise<void> {
    // No-op for PTY-backed terminal; output only comes from the shell process.
    // To stream external logs into the desktop terminal a new WebSocket message
    // type would be needed. Skipped for now per desktop-out-of-scope policy.
  }

  async disconnect(): Promise<void> {
    if (this.terminalId && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "kill",
          terminalId: this.terminalId,
        }),
      );
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.terminalId = null;
  }
}
