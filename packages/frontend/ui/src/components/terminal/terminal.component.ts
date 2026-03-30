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
import { TERMINAL_BACKEND_ADAPTER } from "@vertex/core";
import type { TerminalBackendAdapter } from "@vertex/core";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "v-terminal",
  imports: [CommonModule],
  template: `<div #terminalContainer class="terminal__container"></div>`,
  styleUrls: ["./terminal.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private dataSubscription?: ReturnType<
    typeof this.terminalBackend.onData$.subscribe
  >;
  private resizeObserver?: ResizeObserver;
  private isConnecting = false;
  private hasInitialized = false;

  constructor() {
    // Effect to handle working directory changes
    effect(() => {
      const cwd = this.workingDirectory();

      // Only reconnect if already initialized and cwd actually changed
      if (this.hasInitialized && this.terminal && cwd) {
        console.log(`[Terminal] Directory change detected: ${cwd}`);
        this.reconnect(cwd);
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
      convertEol: true,
      scrollback: 10000,
      allowTransparency: false,
      cursorStyle: "block",
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    this.setupEventHandlers();

    this.terminal.open(container.nativeElement);
    this.fitAddon.fit();

    // Initial connection
    const cwd = this.workingDirectory();
    if (cwd) {
      this.connect(cwd);
    } else {
      this.connect();
    }

    this.hasInitialized = true;
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

    // Terminal Input -> Backend (only forward, don't echo)
    this.terminal.onData((data) => {
      this.terminalBackend.write(data);
    });

    // Backend -> Terminal Output
    this.subscribeToBackend();
  }

  private subscribeToBackend(): void {
    // Unsubscribe from any existing subscription first
    this.unsubscribeFromBackend();

    // Subscribe to backend data
    this.dataSubscription = this.terminalBackend.onData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.terminal?.write(data);
      });
  }

  private unsubscribeFromBackend(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
      this.dataSubscription = undefined;
    }
  }

  private async reconnect(cwd: string): Promise<void> {
    if (this.isConnecting) {
      console.log("[Terminal] Connection in progress, skipping...");
      return;
    }

    this.isConnecting = true;

    try {
      console.log(`[Terminal] Reconnecting to: ${cwd}`);

      // Clear terminal before reconnecting
      this.terminal?.clear();

      // Reconnect backend
      await this.terminalBackend.connect(cwd);

      console.log(`[Terminal] Reconnected successfully`);
    } catch (err) {
      console.error("[Terminal] Reconnection failed:", err);
      this.terminal?.writeln(`\r\n\x1b[31mFailed to connect to: ${cwd}\x1b[0m`);
    } finally {
      this.isConnecting = false;
    }
  }

  private async connect(cwd?: string): Promise<void> {
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      console.log(`[Terminal] Initial connection${cwd ? ` to: ${cwd}` : ""}`);
      await this.terminalBackend.connect(cwd);
      console.log("[Terminal] Connected successfully");
    } catch (err) {
      console.error("[Terminal] Connection failed:", err);
      this.terminal?.writeln(
        "\r\n\x1b[31mFailed to connect to terminal\x1b[0m",
      );
    } finally {
      this.isConnecting = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.unsubscribeFromBackend();
    this.resizeObserver?.disconnect();
    this.terminal?.dispose();
    this.terminalBackend.disconnect();
  }
}
