import { Injectable, inject } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { TerminalBackendAdapter } from './terminal-backend-adapter';
import { RuntimeService } from '../services/runtime.service';
import { commandRegistry } from './commands';

@Injectable({ providedIn: 'root' })
export class VirtualTerminalService implements TerminalBackendAdapter {
  private dataSubject = new ReplaySubject<string>(500);
  readonly onData$ = this.dataSubject.asObservable();

  private runtime = inject(RuntimeService);
  private cwd = '/';
  private inputBuffer = '';
  private ready = false;

  async connect(cwd?: string): Promise<void> {
    this.cwd = cwd || '/';
    this.ready = true;
    this.inputBuffer = '';
    this.printBanner();
    this.printPrompt();
  }

  async write(data: string): Promise<void> {
    if (!this.ready) return;

    for (const char of data) {
      if (char === '\r' || char === '\n') {
        this.dataSubject.next('\r\n');
        const line = this.inputBuffer;
        this.inputBuffer = '';
        await this.executeCommand(line.trim());
        if (this.ready) this.printPrompt();
      } else if (char === '\x7f' || char === '\b') {
        if (this.inputBuffer.length > 0) {
          this.inputBuffer = this.inputBuffer.slice(0, -1);
          this.dataSubject.next('\b \b');
        }
      } else if (char >= ' ' || char === '\t') {
        this.inputBuffer += char;
        this.dataSubject.next(char);
      }
    }
  }

  async resize(_cols: number, _rows: number): Promise<void> {
    // No-op for virtual shell
  }

  async writeOutput(data: string): Promise<void> {
    this.dataSubject.next(data);
  }

  async disconnect(): Promise<void> {
    this.ready = false;
    this.inputBuffer = '';
  }

  // ── Shell implementation ───────────────────────────────────────────────────

  private async executeCommand(line: string): Promise<void> {
    if (!line) return;

    const { cmd, args } = this.parseCommand(line);
    const handler = commandRegistry[cmd];

    if (!handler) {
      this.printlnError(`Command not found: ${cmd}. Type \`help\` for available commands.`);
      return;
    }

    try {
      await handler(
        {
          runtime: this.runtime,
          getCwd: () => this.cwd,
          setCwd: (cwd) => {
            this.cwd = cwd;
          },
          resolvePath: (input) => this.resolvePath(input),
          output: (text) => this.dataSubject.next(text),
          outputError: (text) => this.printlnError(text),
          progressBar: (percent, width) => this.progressBar(percent, width),
          humanSize: (bytes) => this.humanSize(bytes),
        },
        args,
      );
    } catch (err) {
      this.printlnError(`${cmd}: ${(err as Error).message}`);
    }
  }

  private parseCommand(line: string): { cmd: string; args: string[] } {
    const tokens: string[] = [];
    let current = '';
    let quote: string | null = null;

    for (const char of line) {
      if (quote) {
        if (char === quote) {
          quote = null;
        } else {
          current += char;
        }
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ' ' || char === '\t') {
        if (current.length > 0) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current.length > 0) tokens.push(current);

    const cmd = tokens.shift()?.toLowerCase() ?? '';
    return { cmd, args: tokens };
  }

  private resolvePath(input: string): string {
    if (input.startsWith('/')) return input;
    const parts = this.cwd.split('/').filter(Boolean);
    const targetParts = input.split('/').filter(Boolean);
    for (const part of targetParts) {
      if (part === '..') parts.pop();
      else if (part !== '.') parts.push(part);
    }
    return '/' + parts.join('/');
  }

  private relativePath(path: string): string {
    if (path === '/') return '~';
    return path;
  }

  private progressBar(percent: number, width: number): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return '\x1b[32m' + '█'.repeat(filled) + '\x1b[90m' + '░'.repeat(empty) + '\x1b[0m';
  }

  private humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── UI helpers ──────────────────────────────────────────────────────────────

  private printBanner(): void {
    const banner =
      '\r\n\x1b[36m╔═══════════════════════════════════════════════════════════╗\x1b[0m\r\n' +
      '\x1b[36m║\x1b[0m  \x1b[1mVertex Web Shell\x1b[0m  —  Browser-native filesystem & Git      \x1b[36m║\x1b[0m\r\n' +
      '\x1b[36m╚═══════════════════════════════════════════════════════════╝\x1b[0m\r\n' +
      '\r\n' +
      'Type \x1b[33mhelp\x1b[0m to see available commands.\r\n' +
      '\r\n';
    this.dataSubject.next(banner);
  }

  private printPrompt(): void {
    const repo = this.runtime.repoName();
    const displayCwd = this.relativePath(this.cwd);
    const prompt =
      '\x1b[32mvertex\x1b[0m' +
      (repo ? `\x1b[90m(${repo})\x1b[0m` : '') +
      `:\x1b[34m${displayCwd}\x1b[0m$ `;
    this.dataSubject.next(prompt);
  }

  private printlnError(text: string): void {
    this.dataSubject.next('\x1b[31m' + text + '\x1b[0m\r\n');
  }
}
