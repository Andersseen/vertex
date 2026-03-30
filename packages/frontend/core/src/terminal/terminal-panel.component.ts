import {
  Component,
  OnDestroy,
  OnInit,
  input,
  ChangeDetectionStrategy,
  viewChild,
  ElementRef,
  AfterViewInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { TerminalService, TerminalMessage } from "./terminal.service";
import { Subject, takeUntil } from "rxjs";

interface TerminalInstance {
  id: string;
  xterm: Terminal;
  fitAddon: FitAddon;
  container: HTMLDivElement;
}

@Component({
  selector: "v-terminal-panel",
  imports: [CommonModule],
  template: `
    <div class="terminal-panel">
      <!-- Tabs de terminales -->
      <div class="terminal-tabs">
        @for (term of terminals; track term.id) {
          <div
            class="terminal-tab"
            [class.active]="activeTerminalId === term.id"
            (click)="activateTerminal(term.id)"
          >
            <span>Terminal {{ $index + 1 }}</span>
            <button
              class="close-btn"
              (click)="closeTerminal(term.id, $event)"
              title="Cerrar terminal"
            >
              ×
            </button>
          </div>
        }
      </div>

      <!-- Contenedor de terminales -->
      <div class="terminal-container" #terminalContainer></div>
    </div>
  `,
  styles: [
    `
      .terminal-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #020617;
      }
      .terminal-tabs {
        display: flex;
        background: #0f172a;
        border-bottom: 1px solid #1e293b;
        padding: 4px 4px 0;
        gap: 4px;
        flex-shrink: 0;
      }
      .terminal-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: #1e293b;
        border-radius: 4px 4px 0 0;
        cursor: pointer;
        font-size: 12px;
        color: #94a3b8;
        transition: all 0.2s;
      }
      .terminal-tab:hover {
        background: #334155;
      }
      .terminal-tab.active {
        background: #020617;
        color: #f8fafc;
      }
      .close-btn {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 16px;
        padding: 0 4px;
        opacity: 0.6;
      }
      .close-btn:hover {
        opacity: 1;
        color: #ef4444;
      }
      .terminal-container {
        flex: 1;
        overflow: hidden;
        position: relative;
        background: #020617;
        padding: 8px;
      }
      .terminal-instance {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
      }
      .terminal-instance.hidden {
        display: none;
      }

      /* Estilos para xterm */
      :host ::ng-deep .xterm {
        height: 100% !important;
        width: 100% !important;
      }
      :host ::ng-deep .xterm-screen {
        width: 100% !important;
        height: 100% !important;
      }
      :host ::ng-deep .xterm-rows {
        background-color: #020617 !important;
      }
      :host ::ng-deep .xterm-viewport {
        background-color: #020617 !important;
      }
      :host ::ng-deep .xterm-text-layer {
        background-color: #020617 !important;
      }
    `,
  ],
  // Note: Using Default change detection for dynamic terminal list
  changeDetection: ChangeDetectionStrategy.Default,
})
export class TerminalPanelComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  workingDirectory = input<string>("");

  protected terminals: TerminalInstance[] = [];
  protected activeTerminalId: string | null = null;
  private destroy$ = new Subject<void>();

  // Referencia al contenedor de terminales
  private terminalContainerRef =
    viewChild.required<ElementRef<HTMLDivElement>>("terminalContainer");

  constructor(private terminalService: TerminalService) {}

  ngAfterViewInit(): void {
    // El contenedor está listo, pero las terminales se crean cuando llega el mensaje "created"
  }

  ngOnInit(): void {
    // Conectar al servicio de terminal
    this.terminalService.connect();

    // Suscribirse a mensajes
    this.terminalService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => this.handleMessage(message));

    // Crear primera terminal
    this.createTerminal();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Limpiar terminales
    this.terminals.forEach((term) => {
      term.xterm.dispose();
    });

    this.terminalService.disconnect();
  }

  private handleMessage(message: TerminalMessage): void {
    switch (message.type) {
      case "created":
        if (message.terminalId) {
          this.initializeTerminal(message.terminalId);
        }
        break;

      case "data":
        if (message.terminalId && message.data) {
          const term = this.terminals.find((t) => t.id === message.terminalId);
          if (term) {
            term.xterm.write(message.data);
          }
        }
        break;

      case "exit":
        console.log(`Terminal ${message.terminalId} exited`);
        break;

      case "error":
        console.error("Terminal error:", message.error);
        // Mostrar error en la UI
        if (this.terminals.length === 0) {
          // Si no hay terminales, mostrar mensaje de error
          this.showErrorMessage(message.error || "Failed to create terminal");
        }
        break;
    }
  }

  private showErrorMessage(error: string): void {
    console.error("[TerminalPanel]", error);
    // Aquí podrías mostrar un toast o notificación
  }

  createTerminal(): void {
    const cwd = this.workingDirectory() || undefined;
    this.terminalService.createTerminal({ cwd });
  }

  private initializeTerminal(id: string): void {
    const container = this.terminalContainerRef().nativeElement;

    const div = document.createElement("div");
    div.className = "terminal-instance";
    div.style.width = "100%";
    div.style.height = "100%";
    div.style.backgroundColor = "#020617";
    if (this.activeTerminalId) {
      div.classList.add("hidden");
    }
    container.appendChild(div);

    const xterm = new Terminal({
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
      allowProposedApi: true,
      allowTransparency: false,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(div);

    // Esperar a que el DOM esté listo antes de hacer fit
    requestAnimationFrame(() => {
      fitAddon.fit();
      // Notificar al backend del tamaño inicial
      this.terminalService.resize(id, xterm.cols, xterm.rows);
    });

    // Enviar input al backend
    xterm.onData((data) => {
      this.terminalService.write(id, data);
    });

    // Redimensionar
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddon.fit();
        this.terminalService.resize(id, xterm.cols, xterm.rows);
      });
    });
    resizeObserver.observe(div);

    const instance: TerminalInstance = {
      id,
      xterm,
      fitAddon,
      container: div,
    };

    this.terminals.push(instance);
    this.activateTerminal(id);
  }

  activateTerminal(id: string): void {
    this.activeTerminalId = id;

    this.terminals.forEach((term) => {
      if (term.id === id) {
        term.container.classList.remove("hidden");
        term.fitAddon.fit();
      } else {
        term.container.classList.add("hidden");
      }
    });
  }

  closeTerminal(id: string, event: Event): void {
    event.stopPropagation();

    const index = this.terminals.findIndex((t) => t.id === id);
    if (index === -1) return;

    const term = this.terminals[index];
    term.xterm.dispose();
    term.container.remove();
    this.terminals.splice(index, 1);

    this.terminalService.kill(id);

    // Activar otra terminal si es necesario
    if (this.activeTerminalId === id && this.terminals.length > 0) {
      this.activateTerminal(
        this.terminals[Math.min(index, this.terminals.length - 1)].id,
      );
    } else if (this.terminals.length === 0) {
      this.createTerminal();
    }
  }
}
