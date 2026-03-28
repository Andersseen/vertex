import {
  Component,
  OnDestroy,
  OnInit,
  viewChild,
  ElementRef,
  inject,
  input,
  effect,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebglAddon } from "xterm-addon-webgl";
import { TERMINAL_BACKEND_ADAPTER } from "@vertex/core";
import type { TerminalBackendAdapter } from "@vertex/core";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "v-terminal",
  imports: [CommonModule],
  template: `<div #terminalContainer class="terminal-container"></div>`,
  styleUrls: ["./terminal.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "block vx-h-full",
  },
})
export class TerminalComponent implements OnInit, OnDestroy {
  // Inputs
  readonly workingDirectory = input<string>("");

  // View queries
  private readonly terminalContainer =
    viewChild.required<ElementRef<HTMLDivElement>>("terminalContainer");

  // Dependencies
  private readonly terminalBackend = inject<TerminalBackendAdapter>(
    TERMINAL_BACKEND_ADAPTER,
  );

  // State
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private readonly destroy$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;
  private isConnected = false;

  constructor() {
    // Effect to reconnect terminal when working directory changes
    effect(() => {
      const cwd = this.workingDirectory();
      if (cwd && this.terminal) {
        console.log(`[Terminal] Working directory changed to: ${cwd}`);
        this.reconnectToDirectory(cwd);
      }
    });
  }

  ngOnInit(): void {
    this.initializeTerminal();
  }

  private initializeTerminal(): void {
    const container = this.terminalContainer();

    this.terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#020617",
        foreground: "#f8fafc",
      },
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 14,
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    this.configureRenderer();
    this.setupEventHandlers();

    this.terminal.open(container.nativeElement);
    this.fitAddon.fit();

    // Initial connection
    const cwd = this.workingDirectory();
    if (cwd) {
      this.reconnectToDirectory(cwd);
    } else {
      this.connectToDefaultDirectory();
    }
  }

  private configureRenderer(): void {
    if (!this.terminal) return;

    const isHeadless =
      typeof navigator !== "undefined" &&
      (navigator.webdriver || /Headless/.test(navigator.userAgent));

    if (!isHeadless) {
      try {
        const webglAddon = new WebglAddon();
        this.terminal.loadAddon(webglAddon);
      } catch (e) {
        console.warn(
          "WebGL addon failed to load, falling back to DOM renderer",
          e,
        );
      }
    } else {
      console.info(
        "Headless environment detected, using DOM renderer for stability",
      );
    }
  }

  private setupEventHandlers(): void {
    if (!this.terminal || !this.fitAddon) return;

    const container = this.terminalContainer();

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => {
      this.fitAddon?.fit();
      if (this.terminal) {
        this.terminalBackend.resize(this.terminal.cols, this.terminal.rows);
      }
    });
    this.resizeObserver.observe(container.nativeElement);

    // Terminal Input -> Backend
    this.terminal.onData((data) => {
      this.terminalBackend.write(data);
    });

    // Backend -> Terminal Output
    this.terminalBackend.onData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => this.terminal?.write(data));
  }

  private async reconnectToDirectory(cwd: string): Promise<void> {
    await this.disconnectFromBackend();
    this.terminal?.clear();

    try {
      await this.terminalBackend.connect(cwd);
      this.isConnected = true;
      console.log(`[Terminal] Connected to: ${cwd}`);
    } catch (err) {
      console.error("[Terminal] PTY Connect failed:", err);
    }
  }

  private async connectToDefaultDirectory(): Promise<void> {
    try {
      await this.terminalBackend.connect();
      this.isConnected = true;
    } catch (err) {
      console.error("[Terminal] PTY Connect failed:", err);
    }
  }

  private async disconnectFromBackend(): Promise<void> {
    if (this.isConnected) {
      await this.terminalBackend.disconnect();
      this.isConnected = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resizeObserver?.disconnect();
    this.terminal?.dispose();
    this.disconnectFromBackend();
  }
}
