import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild, ViewEncapsulation, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebglAddon } from 'xterm-addon-webgl';
import { TERMINAL_BACKEND_ADAPTER } from '@vertex/core';
import type { TerminalBackendAdapter } from '@vertex/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'v-terminal',
  standalone: true,
  imports: [CommonModule],
  template: `<div #terminalContainer class="terminal-container"></div>`,
  styleUrls: ['./terminal.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TerminalComponent implements OnInit, OnDestroy {
  @ViewChild('terminalContainer', { static: true }) terminalContainer!: ElementRef<HTMLDivElement>;

  private terminal!: Terminal;
  private fitAddon!: FitAddon;
  private destroy$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;

  constructor(
    @Inject(TERMINAL_BACKEND_ADAPTER) private terminalBackend: TerminalBackendAdapter
  ) {
    // using afterNextRender for modern Angular zoneless compatibility/DOM access
    afterNextRender(() => {
      this.initTerminal();
    });
  }

  ngOnInit(): void {
    // Backend connection can start here
    this.terminalBackend.connect().catch(err => console.error('PTY Connect failed', err));
    
    this.terminalBackend.onData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.terminal?.write(data));
  }

  private initTerminal(): void {
    this.terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#020617', // vertex-dark
        foreground: '#f8fafc',
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14,
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    // Try WebGL, fallback to DOM if it fails
    try {
      const webglAddon = new WebglAddon();
      this.terminal.loadAddon(webglAddon);
    } catch (e) {
      console.warn('WebGL addon failed to load, falling back to DOM renderer', e);
    }

    this.terminal.open(this.terminalContainer.nativeElement);
    this.fitAddon.fit();

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => {
      this.fitAddon.fit();
      this.terminalBackend.resize(this.terminal.cols, this.terminal.rows);
    });
    this.resizeObserver.observe(this.terminalContainer.nativeElement);

    // Terminal Input -> Backend
    this.terminal.onData(data => {
      this.terminalBackend.write(data);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resizeObserver?.disconnect();
    this.terminal?.dispose();
    this.terminalBackend.disconnect();
  }
}
