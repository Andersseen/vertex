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
  private currentId = "default"; // In a multi-terminal app, this would be set per instance

  readonly onData$ = this.dataSubject.asObservable();

  constructor(private ngZone: NgZone) {}

  async connect(cwd?: string): Promise<void> {
    try {
      // Listen for stdout events specific to this terminal ID
      this.unlistenStdout = await listen<string>(
        `terminal-stdout-${this.currentId}`,
        (event: Event<string>) => {
          this.ngZone.run(() => {
            this.dataSubject.next(event.payload);
          });
        },
      );

      // Spawn the shell in the backend with an ID and optional working directory
      await invoke("spawn_terminal", { id: this.currentId, cwd });
    } catch (error) {
      console.error("Failed to connect to Tauri PTY:", error);
      throw error;
    }
  }

  async write(data: string): Promise<void> {
    await invoke("write_to_terminal", { id: this.currentId, data });
  }

  async resize(cols: number, rows: number): Promise<void> {
    await invoke("resize_terminal", { id: this.currentId, cols, rows });
  }

  async disconnect(): Promise<void> {
    if (this.unlistenStdout) {
      this.unlistenStdout();
      this.unlistenStdout = null;
    }
    await invoke("close_terminal", { id: this.currentId });
  }

  // Helper to set ID manually for multi-terminal support
  setTerminalId(id: string): void {
    this.currentId = id;
  }
}
