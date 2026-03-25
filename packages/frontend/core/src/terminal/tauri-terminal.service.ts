import { Injectable, NgZone } from '@angular/core';
import { TerminalBackendAdapter } from './terminal-backend-adapter';
import { Subject } from 'rxjs';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn, Event } from '@tauri-apps/api/event';

@Injectable({
  providedIn: 'root'
})
export class TauriTerminalService implements TerminalBackendAdapter {
  private dataSubject = new Subject<string>();
  private unlistenStdout: UnlistenFn | null = null;
  
  readonly onData$ = this.dataSubject.asObservable();

  constructor(private ngZone: NgZone) {}

  async connect(): Promise<void> {
    try {
      // Listen for stdout events from Tauri backend
      this.unlistenStdout = await listen<string>('terminal-stdout', (event: Event<string>) => {
        this.dataSubject.next(event.payload);
      });

      // Spawn the shell in the backend
      await invoke('spawn_terminal');
    } catch (error) {
      console.error('Failed to connect to Tauri PTY:', error);
      throw error;
    }
  }

  async write(data: string): Promise<void> {
    await invoke('write_to_terminal', { data });
  }

  async resize(cols: number, rows: number): Promise<void> {
    await invoke('resize_terminal', { cols, rows });
  }

  async disconnect(): Promise<void> {
    if (this.unlistenStdout) {
      this.unlistenStdout();
      this.unlistenStdout = null;
    }
    // We would also invoke a 'kill' command if needed
  }
}
