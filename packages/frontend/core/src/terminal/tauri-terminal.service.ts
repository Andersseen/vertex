import { Injectable, NgZone } from "@angular/core";
import { TerminalBackendAdapter } from "./terminal-backend-adapter";
import { Subject } from "rxjs";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn, Event } from "@tauri-apps/api/event";

@Injectable({
  providedIn: "root",
})
export class TauriTerminalService implements TerminalBackendAdapter {
  private dataSubject = new Subject<string>();
  private unlistenStdout: UnlistenFn | null = null;
  private isConnected = false;
  private connectionId = 0; // Unique ID for each connection

  readonly onData$ = this.dataSubject.asObservable();

  constructor(private ngZone: NgZone) {}

  async connect(cwd?: string): Promise<void> {
    // Prevent multiple simultaneous connections
    if (this.isConnected) {
      console.log("[TauriTerminal] Already connected, disconnecting first...");
      await this.disconnect();
    }

    // Generate new unique ID for this connection
    this.connectionId++;
    const currentConnectionId = this.connectionId;

    try {
      console.log(`[TauriTerminal] Connecting with ID: ${currentConnectionId}`);

      // Listen for stdout events - use connection-specific ID
      this.unlistenStdout = await listen<string>(
        `terminal-stdout-${currentConnectionId}`,
        (event: Event<string>) => {
          // Only process events for current connection
          if (currentConnectionId === this.connectionId) {
            this.ngZone.run(() => {
              this.dataSubject.next(event.payload);
            });
          }
        },
      );

      // Spawn the shell in the backend
      await invoke("spawn_terminal", {
        id: currentConnectionId.toString(),
        cwd,
      });

      this.isConnected = true;
      console.log(`[TauriTerminal] Connected successfully`);
    } catch (error) {
      console.error("[TauriTerminal] Failed to connect:", error);
      this.cleanup();
      throw error;
    }
  }

  async write(data: string): Promise<void> {
    if (!this.isConnected) {
      console.warn("[TauriTerminal] Not connected, cannot write");
      return;
    }
    await invoke("write_to_terminal", {
      id: this.connectionId.toString(),
      data,
    });
  }

  async resize(cols: number, rows: number): Promise<void> {
    if (!this.isConnected) return;
    await invoke("resize_terminal", {
      id: this.connectionId.toString(),
      cols,
      rows,
    });
  }

  async disconnect(): Promise<void> {
    console.log("[TauriTerminal] Disconnecting...");

    if (this.isConnected) {
      try {
        await invoke("close_terminal", { id: this.connectionId.toString() });
      } catch (e) {
        console.warn("[TauriTerminal] Error closing terminal:", e);
      }
    }

    this.cleanup();
  }

  private cleanup(): void {
    if (this.unlistenStdout) {
      this.unlistenStdout();
      this.unlistenStdout = null;
    }
    this.isConnected = false;
  }
}
