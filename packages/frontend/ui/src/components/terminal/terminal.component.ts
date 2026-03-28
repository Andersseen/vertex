import {
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  afterNextRender,
  input,
  effect,
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
  standalone: true,
  imports: [CommonModule],
  template: `<div #terminalContainer class="terminal-container"></div>`,
  styleUrls: ["./terminal.component.scss"],
  encapsulation: ViewEncapsulation.None,
})
export class TerminalComponent implements OnInit, OnDestroy {
  @ViewChild("terminalContainer", { static: true })
  terminalContainer!: ElementRef<HTMLDivElement>;

  // Input for the working directory
  workingDirectory = input<string>("");

  private terminal!: Terminal;
  private fitAddon!: FitAddon;
  private destroy$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;
  private isConnected = false;

  constructor(
    @Inject(TERMINAL_BACKEND_ADAPTER)
    private terminalBackend: TerminalBackendAdapter,
  ) {
    // using afterNextRender for modern Angular zoneless compatibility/DOM access
    afterNextRender(() => {
      this.initTerminal();
    });

    // Effect to reconnect terminal when working directory changes
    effect(() => {
      const cwd = this.workingDirectory();
      if (cwd && this.terminal) {
        console.log(`[Terminal] Working directory changed to: ${cwd}`);
        this.reconnectTerminal(cwd);
      }
    });
  }

  ngOnInit(): void {
    // Initial connection will happen after terminal is initialized
  }

  private async reconnectTerminal(cwd: string): Promise<void> {
    // Disconnect existing connection
    if (this.isConnected) {
      await this.terminalBackend.disconnect();
      this.isConnected = false;
    }

    // Clear terminal
    this.terminal.clear();

    // Reconnect with new working directory
    try {
      await this.terminalBackend.connect(cwd);
      this.isConnected = true;
      console.log(`[Terminal] Connected to: ${cwd}`);
    } catch (err) {
      console.error("[Terminal] PTY Connect failed:", err);
    }
  }

  private initTerminal(): void {
    this.terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#020617", // vertex-dark
        foreground: "#f8fafc",
      },
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 14,
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    // Prefer DOM renderer in headless environments (E2E tests) for better stability
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

    this.terminal.open(this.terminalContainer.nativeElement);
    this.fitAddon.fit();

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => {
      this.fitAddon.fit();
      this.terminalBackend.resize(this.terminal.cols, this.terminal.rows);
    });
    this.resizeObserver.observe(this.terminalContainer.nativeElement);

    // Terminal Input -> Backend
    this.terminal.onData((data) => {
      this.terminalBackend.write(data);
    });

    // Setup data subscription
    this.terminalBackend.onData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => this.terminal?.write(data));

    // Initial connection with working directory
    const cwd = this.workingDirectory();
    if (cwd) {
      this.reconnectTerminal(cwd);
    } else {
      // Connect without specific directory (will use default)
      this.terminalBackend
        .connect()
        .catch((err) => console.error("[Terminal] PTY Connect failed:", err));
      this.isConnected = true;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resizeObserver?.disconnect();
    this.terminal?.dispose();
    if (this.isConnected) {
      this.terminalBackend.disconnect();
    }
  }
}
