import { Injectable } from '@angular/core';
import { TerminalBackendAdapter } from './terminal-backend-adapter';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebTerminalService implements TerminalBackendAdapter {
  private dataSubject = new Subject<string>();
  readonly onData$ = this.dataSubject.asObservable();

  async connect(): Promise<void> {
    this.dataSubject.next('\r\n\x1b[1;36mVertex Web Terminal (Fallback/Mock)\x1b[0m\r\n');
    this.dataSubject.next('\x1b[33m$ \x1b[0m');
  }

  async write(data: string): Promise<void> {
    // Basic echo for mock
    if (data === '\r') {
      this.dataSubject.next('\r\n\x1b[33m$ \x1b[0m');
    } else {
      this.dataSubject.next(data);
    }
  }

  async resize(cols: number, rows: number): Promise<void> {
    console.log(`Mock PTY resized to ${cols}x${rows}`);
  }

  async disconnect(): Promise<void> {
    // Cleanup
  }
}
