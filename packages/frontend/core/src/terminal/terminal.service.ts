import { Injectable } from "@angular/core";
import { Subject, Observable } from "rxjs";

export interface TerminalMessage {
  type: "data" | "exit" | "created" | "error" | "connected" | "list";
  terminalId?: string;
  data?: string;
  exitCode?: number;
  signal?: number;
  error?: string;
  message?: string;
  terminals?: any[];
}

@Injectable({
  providedIn: "root",
})
export class TerminalService {
  private ws: WebSocket | null = null;
  private messageSubject = new Subject<TerminalMessage>();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private basePort = 3002;
  private maxPortAttempts = 5;
  private currentPort: number | null = null;

  readonly messages$ = this.messageSubject.asObservable();

  connect(url?: string): void {
    // If no URL provided, try with dynamic port detection
    if (!url) {
      this.tryConnectWithPort(this.basePort, 0);
      return;
    }

    this.doConnect(url);
  }

  private tryConnectWithPort(port: number, attempt: number): void {
    if (attempt >= this.maxPortAttempts) {
      console.error("[TerminalService] Failed to connect to any port");
      this.messageSubject.next({
        type: "error",
        error: `Could not connect to terminal server on ports ${this.basePort}-${this.basePort + this.maxPortAttempts - 1}`,
      });
      return;
    }

    const url = `ws://localhost:${port}/ws`;
    console.log(`[TerminalService] Trying port ${port}...`);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log(`[TerminalService] Connected on port ${port}`);
      this.ws = ws;
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.currentPort = port;
      this.basePort = port; // Remember the working port
      this.messageSubject.next({ type: "connected" });

      // Set up message handlers
      ws.onmessage = (event) => {
        try {
          const message: TerminalMessage = JSON.parse(event.data);
          this.messageSubject.next(message);
        } catch (error) {
          console.error("[TerminalService] Failed to parse message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[TerminalService] WebSocket error:", error);
        this.messageSubject.next({ type: "error", error: "Connection error" });
      };

      ws.onclose = () => {
        console.log("[TerminalService] WebSocket closed");
        this.isConnected = false;

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(
            `[TerminalService] Reconnecting... Attempt ${this.reconnectAttempts}`,
          );
          setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
        }
      };
    };

    ws.onerror = () => {
      // Port not available, try next
      ws.close();
      this.tryConnectWithPort(port + 1, attempt + 1);
    };
  }

  private doConnect(url: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[TerminalService] Already connected");
      return;
    }

    console.log(`[TerminalService] Connecting to ${url}`);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("[TerminalService] WebSocket connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.messageSubject.next({ type: "connected" });
    };

    this.ws.onmessage = (event) => {
      try {
        const message: TerminalMessage = JSON.parse(event.data);
        this.messageSubject.next(message);
      } catch (error) {
        console.error("[TerminalService] Failed to parse message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("[TerminalService] WebSocket error:", error);
      this.messageSubject.next({ type: "error", error: "Connection error" });
    };

    this.ws.onclose = () => {
      console.log("[TerminalService] WebSocket closed");
      this.isConnected = false;

      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(
          `[TerminalService] Reconnecting... Attempt ${this.reconnectAttempts}`,
        );
        setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
      }
    };
  }

  createTerminal(config?: {
    cwd?: string;
    shell?: string;
    cols?: number;
    rows?: number;
  }): void {
    this.send({ type: "create", config });
  }

  write(terminalId: string, data: string): void {
    this.send({ type: "write", terminalId, data });
  }

  resize(terminalId: string, cols: number, rows: number): void {
    this.send({ type: "resize", terminalId, cols, rows });
  }

  kill(terminalId: string): void {
    this.send({ type: "kill", terminalId });
  }

  listTerminals(): void {
    this.send({ type: "list" });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("[TerminalService] WebSocket not connected");
    }
  }
}
