import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { TerminalBackendAdapter } from './terminal-backend-adapter';
import { RuntimeService } from '../services/runtime.service';

@Injectable({ providedIn: 'root' })
export class VirtualTerminalService implements TerminalBackendAdapter {
  private dataSubject = new Subject<string>();
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
        // Backspace
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

  async disconnect(): Promise<void> {
    this.ready = false;
    this.inputBuffer = '';
  }

  // ── Shell implementation ───────────────────────────────────────────────────

  private async executeCommand(line: string): Promise<void> {
    if (!line) return;

    const { cmd, args } = this.parseCommand(line);

    switch (cmd) {
      case 'help':
      case 'h':
        this.printHelp();
        break;
      case 'clear':
        this.dataSubject.next('\x1b[2J\x1b[H');
        break;
      case 'pwd':
        this.println(this.cwd);
        break;
      case 'ls':
        await this.cmdLs(args);
        break;
      case 'cd':
        await this.cmdCd(args);
        break;
      case 'cat':
        await this.cmdCat(args);
        break;
      case 'mkdir':
        await this.cmdMkdir(args);
        break;
      case 'touch':
        await this.cmdTouch(args);
        break;
      case 'rm':
        await this.cmdRm(args);
        break;
      case 'echo':
        this.println(args.join(' '));
        break;
      case 'git':
        await this.cmdGit(args);
        break;
      case 'npm':
      case 'node':
      case 'npx':
        this.printlnError(`\`${cmd}\` will be available in Phase 4 (Nodebox Runtime).`);
        break;
      default:
        this.printlnError(`Command not found: ${cmd}. Type \`help\` for available commands.`);
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

  // ── Commands ────────────────────────────────────────────────────────────────

  private async cmdLs(args: string[]): Promise<void> {
    const fs = this.runtime.fs;
    if (!fs) {
      this.printlnError('No virtual filesystem. Clone a repository first.');
      return;
    }

    const target = args[0] ? this.resolvePath(args[0]) : this.cwd;

    try {
      const entries = await fs.readDir(target);
      const dirs = entries.filter((e) => e.type === 'directory').sort((a, b) => a.name.localeCompare(b.name));
      const files = entries.filter((e) => e.type === 'file').sort((a, b) => a.name.localeCompare(b.name));

      for (const d of dirs) {
        this.dataSubject.next(`\x1b[36m${d.name}/\x1b[0m  `);
      }
      for (const f of files) {
        const color = this.fileColor(f.name);
        this.dataSubject.next(`${color}${f.name}\x1b[0m  `);
      }
      if (entries.length > 0) this.dataSubject.next('\r\n');
    } catch (err) {
      this.printlnError(`ls: cannot access '${target}': ${(err as Error).message}`);
    }
  }

  private fileColor(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        return '\x1b[33m';
      case 'json':
        return '\x1b[35m';
      case 'md':
        return '\x1b[32m';
      case 'html':
        return '\x1b[31m';
      case 'css':
      case 'scss':
        return '\x1b[34m';
      default:
        return '';
    }
  }

  private async cmdCd(args: string[]): Promise<void> {
    const fs = this.runtime.fs;
    if (!fs) {
      this.printlnError('No virtual filesystem. Clone a repository first.');
      return;
    }
    if (args.length === 0) {
      this.cwd = '/';
      return;
    }
    const target = this.resolvePath(args[0]);
    try {
      const exists = await fs.exists(target);
      if (!exists) {
        this.printlnError(`cd: no such file or directory: ${args[0]}`);
        return;
      }
      // Check it's a directory by trying to read it
      const entries = await fs.readDir(target);
      this.cwd = target;
    } catch {
      this.printlnError(`cd: not a directory: ${args[0]}`);
    }
  }

  private async cmdCat(args: string[]): Promise<void> {
    const fs = this.runtime.fs;
    if (!fs) {
      this.printlnError('No virtual filesystem. Clone a repository first.');
      return;
    }
    if (args.length === 0) {
      this.printlnError('cat: missing file operand');
      return;
    }
    for (const arg of args) {
      const path = this.resolvePath(arg);
      try {
        const content = await fs.readFile(path);
        this.println(content);
      } catch (err) {
        this.printlnError(`cat: ${arg}: ${(err as Error).message}`);
      }
    }
  }

  private async cmdMkdir(args: string[]): Promise<void> {
    const fs = this.runtime.fs;
    if (!fs) {
      this.printlnError('No virtual filesystem. Clone a repository first.');
      return;
    }
    if (args.length === 0) {
      this.printlnError('mkdir: missing operand');
      return;
    }
    for (const arg of args) {
      const path = this.resolvePath(arg);
      try {
        await fs.mkdir(path);
      } catch (err) {
        this.printlnError(`mkdir: cannot create directory '${arg}': ${(err as Error).message}`);
      }
    }
  }

  private async cmdTouch(args: string[]): Promise<void> {
    const fs = this.runtime.fs;
    if (!fs) {
      this.printlnError('No virtual filesystem. Clone a repository first.');
      return;
    }
    if (args.length === 0) {
      this.printlnError('touch: missing file operand');
      return;
    }
    for (const arg of args) {
      const path = this.resolvePath(arg);
      try {
        const exists = await fs.exists(path);
        if (!exists) {
          await fs.writeFile(path, '');
        }
      } catch (err) {
        this.printlnError(`touch: cannot touch '${arg}': ${(err as Error).message}`);
      }
    }
  }

  private async cmdRm(args: string[]): Promise<void> {
    const fs = this.runtime.fs;
    if (!fs) {
      this.printlnError('No virtual filesystem. Clone a repository first.');
      return;
    }
    if (args.length === 0) {
      this.printlnError('rm: missing operand');
      return;
    }
    for (const arg of args) {
      const path = this.resolvePath(arg);
      try {
        await fs.deleteFile(path);
      } catch (err) {
        this.printlnError(`rm: cannot remove '${arg}': ${(err as Error).message}`);
      }
    }
  }

  private async cmdGit(args: string[]): Promise<void> {
    const git = this.runtime.git;
    if (!git) {
      this.printlnError('No git repository. Clone a repository first.');
      return;
    }

    const subcmd = args[0]?.toLowerCase();

    try {
      switch (subcmd) {
        case 'status': {
          const status = await git.status('/');
          const all = [
            ...status.modified.map((f) => `\x1b[33m M\x1b[0m ${f}`),
            ...status.added.map((f) => `\x1b[32m A\x1b[0m ${f}`),
            ...status.deleted.map((f) => `\x1b[31m D\x1b[0m ${f}`),
            ...status.untracked.map((f) => `\x1b[90m??\x1b[0m ${f}`),
          ];
          if (all.length === 0) {
            this.println('Nothing to commit, working tree clean');
          } else {
            this.println(all.join('\r\n'));
          }
          break;
        }
        case 'log': {
          const limit = parseInt(args[1] || '10', 10);
          const commits = await git.log('/', limit);
          for (const c of commits) {
            const date = new Date(c.author.timestamp * 1000).toISOString().slice(0, 19).replace('T', ' ');
            this.dataSubject.next(
              `\x1b[33m${c.oid.slice(0, 7)}\x1b[0m \x1b[37m${date}\x1b[0m \x1b[32m${c.author.name}\x1b[0m\r\n  ${c.message}\r\n\r\n`,
            );
          }
          break;
        }
        case 'branch': {
          const branch = await git.currentBranch('/');
          this.println(`\x1b[32m* ${branch}\x1b[0m`);
          break;
        }
        default:
          this.printlnError(`git: '${subcmd}' is not a supported command in web shell.`);
          this.println('Supported: status, log, branch');
      }
    } catch (err) {
      this.printlnError(`git: ${(err as Error).message}`);
    }
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

  private printHelp(): void {
    const lines = [
      '\x1b[1mAvailable commands:\x1b[0m',
      '',
      '  \x1b[33mls\x1b[0m [path]        List directory contents',
      '  \x1b[33mcd\x1b[0m [path]        Change directory',
      '  \x1b[33mpwd\x1b[0m             Print working directory',
      '  \x1b[33mcat\x1b[0m <file>      Display file contents',
      '  \x1b[33mmkdir\x1b[0m <dir>    Create directory',
      '  \x1b[33mtouch\x1b[0m <file>   Create empty file',
      '  \x1b[33mrm\x1b[0m <file>       Remove file',
      '  \x1b[33mecho\x1b[0m <text>   Print text',
      '  \x1b[33mclear\x1b[0m           Clear terminal',
      '  \x1b[33mgit status\x1b[0m      Show working tree status',
      '  \x1b[33mgit log\x1b[0m [n]    Show commit history',
      '  \x1b[33mgit branch\x1b[0m      Show current branch',
      '',
      '  \x1b[90mnpm / node / npx → Phase 4 (Nodebox)\x1b[0m',
      '',
    ];
    this.println(lines.join('\r\n'));
  }

  private println(text: string): void {
    this.dataSubject.next(text + '\r\n');
  }

  private printlnError(text: string): void {
    this.dataSubject.next('\x1b[31m' + text + '\x1b[0m\r\n');
  }
}
