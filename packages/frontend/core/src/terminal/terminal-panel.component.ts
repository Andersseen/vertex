import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  ViewEncapsulation,
} from "@angular/core";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { TERMINAL_BACKEND_ADAPTER } from "./terminal-tokens";
import type { TerminalBackendAdapter } from "./terminal-backend-adapter";
import { debounceTime, fromEvent } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

interface TerminalInstance {
  id: string;
  xterm: Terminal;
  fitAddon: FitAddon;
  container: HTMLDivElement;
}

@Component({
  selector: "v-terminal-panel",
  standalone: true,
  imports: [],
  template: `
    <div class="terminal-panel">
      <!-- Terminal wrapper -->
      <div class="terminal-wrap">
        <div #terminalContainer class="terminal"></div>
      </div>

      <!-- Error overlay -->
      @if (connectionError()) {
        <div class="terminal-error">
          <div class="error-message">
            <strong>Terminal no disponible</strong>
            <p>{{ connectionError() }}</p>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ["./terminal-panel.component.scss"],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalPanelComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  readonly workingDirectory = input<string>("");

  @ViewChild("terminalContainer") terminalEleRef!: ElementRef<HTMLElement>;

  // Reactive state via signals
  readonly connectionError = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly terminalBackend = inject<TerminalBackendAdapter>(
    TERMINAL_BACKEND_ADAPTER,
  );

  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private isConnecting = false;
  private dataSubscription?: { unsubscribe: () => void };
  private resizeObserver?: ResizeObserver;
  private terminalInitialized = false;

  constructor() {
    // React to workspace changes after the terminal is running
    effect(() => {
      const dir = this.workingDirectory();
      if (this.terminalInitialized && dir) {
        this.terminalBackend.write(`cd "${dir}"\n`);
      }
    });
  }

  ngOnInit(): void {
    // Nothing here — we need the ViewChild to be ready first
  }

  ngAfterViewInit(): void {
    // Initialize the terminal with a slight delay to ensure the container is rendered
    requestAnimationFrame(() => {
      this.initializeTerminal();
    });

    // Global resize handler
    fromEvent(window, "resize")
      .pipe(debounceTime(100), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.fitTerminal();
      });
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.terminal?.dispose();
    this.terminalBackend.disconnect();
  }

  private initializeTerminal(): void {
    if (!this.terminalEleRef) {
      console.error("[TerminalPanel] Container not available");
      return;
    }

    const container = this.terminalEleRef.nativeElement;

    this.terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#020617",
        foreground: "#f8fafc",
        cursor: "#f8fafc",
        selectionBackground: "#334155",
        black: "#020617",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#f8fafc",
        brightBlack: "#334155",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
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

    this.terminal.open(container);

    // Fit after opening
    requestAnimationFrame(() => {
      this.fitTerminal();
    });

    // Forward user input to backend
    this.terminal.onData((data: string) => {
      this.terminalBackend.write(data);
    });

    // Subscribe to backend output
    this.dataSubscription = this.terminalBackend.onData$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.terminal?.write(data);
      });

    // Observe container resize
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this.fitTerminal();
      });
    });
    this.resizeObserver.observe(container);

    // Connect to backend
    this.connect().then(() => {
      this.terminalInitialized = true;
    });
  }

  private fitTerminal(): void {
    if (!this.fitAddon || !this.terminal) return;

    try {
      this.fitAddon.fit();
      this.terminalBackend.resize(this.terminal.cols, this.terminal.rows);
    } catch {
      // Ignore fit errors during init/teardown
    }
  }

  private async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const cwd = this.workingDirectory() || undefined;
      console.log(
        `[TerminalPanel] Connecting${cwd ? ` to: ${cwd}` : ""}...`,
      );
      await this.terminalBackend.connect(cwd);
      this.connectionError.set(null);
      console.log("[TerminalPanel] Connected successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect";
      console.error("[TerminalPanel] Connection failed:", message);
      this.connectionError.set(message);
      this.terminal?.writeln(
        `\r\n\x1b[31mTerminal error: ${message}\x1b[0m`,
      );
    } finally {
      this.isConnecting = false;
    }
  }
}
