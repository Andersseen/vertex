import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
  inject,
  OnDestroy,
  ViewChild,
  ElementRef,
  effect,
  untracked,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { WebContainerPreview } from '@vertex/runtime/preview-wc';
import type { PreviewSession, PreviewConfig, PreviewPhase } from '@vertex/runtime/preview-wc';
import type { IVirtualFS } from '@vertex/runtime';

interface Step {
  phase: PreviewPhase;
  label: string;
}

const STEPS: Step[] = [
  { phase: 'boot',    label: 'Boot WebContainer' },
  { phase: 'mount',   label: 'Mount files' },
  { phase: 'install', label: 'Install dependencies' },
  { phase: 'dev',     label: 'Start dev server' },
  { phase: 'ready',   label: 'Ready' },
];

const PHASE_ORDER: Record<string, number> = {};
STEPS.forEach((s, i) => (PHASE_ORDER[s.phase] = i));

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview-panel">
      <!-- ── toolbar ── -->
      <div class="preview-toolbar">
        <button
          class="preview-btn"
          (click)="togglePreview()"
          [disabled]="!virtualFs() || isBusy()"
        >
          @if (isBusy()) {
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" class="spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Stop
          } @else if (isRunning()) {
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            Stop
          } @else {
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run Preview
          }
        </button>

        @if (isRunning()) {
          <button class="preview-btn preview-btn--icon" (click)="reload()" title="Reload">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          <span class="preview-url">{{ rawPreviewUrl }}</span>
        }

        @if (logs().length > 0) {
          <button class="preview-btn preview-btn--log" (click)="toggleLogs()">
            Logs {{ showLogs() ? '▾' : '▸' }}
          </button>
        }
      </div>

      <!-- ── iframe (always in DOM so @ViewChild resolves before isRunning flips) ── -->
      <iframe
        #previewFrame
        [src]="safePreviewUrl()"
        class="preview-frame"
        [class.preview-frame--hidden]="!isRunning()"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
      ></iframe>

      <!-- ── loading / idle / error screen ── -->
      @if (!isRunning()) {
        <div class="preview-overlay">

          @if (isBusy()) {
            <!-- ── loading state ── -->
            <div class="loading-card">
              <div class="loading-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" class="spin loading-spinner">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>{{ statusLabel() || 'Starting…' }}</span>
              </div>

              <div class="steps">
                @for (step of steps(); track step.phase) {
                  <div class="step" [class]="'step--' + step.status">
                    <div class="step-icon">
                      @if (step.status === 'done') {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      } @else if (step.status === 'active') {
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="2" class="spin">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      } @else {
                        <div class="step-dot"></div>
                      }
                    </div>
                    <span class="step-label">{{ step.label }}</span>
                  </div>
                }
              </div>

              @if (logTail().length > 0) {
                <div class="log-tail">
                  @for (line of logTail(); track $index) {
                    <div class="log-line">{{ line }}</div>
                  }
                </div>
              }
            </div>

          } @else if (errorMessage()) {
            <!-- ── error state ── -->
            <div class="loading-card loading-card--error">
              <div class="loading-title loading-title--error">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Preview failed
              </div>
              <pre class="error-msg">{{ errorMessage() }}</pre>
              @if (logs().length > 0) {
                <details class="error-logs">
                  <summary>Show logs ({{ logs().length }} lines)</summary>
                  <pre class="error-logs-body">{{ joinedLogs() }}</pre>
                </details>
              }
            </div>

          } @else if (!virtualFs()) {
            <!-- ── idle: no repo ── -->
            <div class="idle-msg">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5" class="idle-icon">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <p>Clone a repository first</p>
            </div>

          } @else {
            <!-- ── idle: repo ready ── -->
            <div class="idle-msg">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5" class="idle-icon">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <p>Click <strong>Run Preview</strong> to install deps &amp; start the dev server</p>
              <p class="idle-hint">First run installs dependencies — may take 1–3 min</p>
            </div>
          }

        </div>
      }

      <!-- ── log drawer (visible while running) ── -->
      @if (showLogs() && logs().length > 0) {
        <pre class="preview-logs">{{ joinedLogs() }}</pre>
      }
    </div>
  `,
  styles: `
    .preview-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--ide-bg-950, #0a0a0a);
      border-left: 1px solid var(--ide-border, #1e1e1e);
    }

    /* ── toolbar ── */
    .preview-toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-bottom: 1px solid var(--ide-border, #1e1e1e);
      min-height: 36px;
      flex-shrink: 0;
    }
    .preview-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 4px;
      border: none;
      background: var(--ide-surface-800, #1e1e1e);
      color: var(--ide-text, #ccc);
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .preview-btn:hover:not(:disabled) { background: var(--ide-surface-700, #2a2a2a); }
    .preview-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .preview-btn--icon { padding: 3px 7px; }
    .preview-btn--log { margin-left: auto; }
    .preview-url {
      font-size: 11px;
      color: var(--ide-text-muted, #555);
      font-family: monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 260px;
    }

    /* ── iframe ── */
    .preview-frame { flex: 1; border: none; width: 100%; background: #fff; }
    .preview-frame--hidden { display: none; }

    /* ── overlay (loading / idle / error) ── */
    .preview-overlay {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: hidden;
    }

    /* ── idle ── */
    .idle-msg {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      color: var(--ide-text-muted, #555);
      font-size: 13px;
      text-align: center;
      max-width: 280px;
    }
    .idle-msg p { margin: 0; line-height: 1.6; }
    .idle-msg strong { color: var(--ide-text, #ccc); }
    .idle-hint { font-size: 11px; color: var(--ide-text-muted, #444); }
    .idle-icon { opacity: 0.2; }

    /* ── loading card ── */
    .loading-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: var(--ide-surface-800, #141414);
      border: 1px solid var(--ide-border, #222);
      border-radius: 8px;
      padding: 20px 24px;
      width: 100%;
      max-width: 360px;
    }
    .loading-card--error {
      border-color: color-mix(in srgb, var(--ide-text-error, #f48771) 30%, transparent);
    }

    .loading-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--ide-text, #ddd);
    }
    .loading-title--error { color: var(--ide-text-error, #f48771); }
    .loading-spinner { flex-shrink: 0; }

    /* ── stepper ── */
    .steps {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .step {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
    }
    .step-icon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .step-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .step--done .step-icon {
      background: color-mix(in srgb, #4ade80 15%, transparent);
      color: #4ade80;
    }
    .step--done .step-label { color: var(--ide-text-muted, #666); }

    .step--active .step-icon {
      background: color-mix(in srgb, #60a5fa 15%, transparent);
      color: #60a5fa;
    }
    .step--active .step-label {
      color: var(--ide-text, #ddd);
      font-weight: 500;
    }

    .step--pending .step-icon { color: var(--ide-text-muted, #444); }
    .step--pending .step-label { color: var(--ide-text-muted, #444); }

    /* ── log tail (inside loading card) ── */
    .log-tail {
      background: var(--ide-bg-900, #0a0a0a);
      border: 1px solid var(--ide-border, #1e1e1e);
      border-radius: 4px;
      padding: 8px 10px;
      font-family: monospace;
      font-size: 10.5px;
      line-height: 1.55;
      color: var(--ide-text-muted, #777);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .log-line {
      white-space: pre;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── error detail ── */
    .error-msg {
      margin: 0;
      font-family: monospace;
      font-size: 11px;
      color: var(--ide-text-error, #f48771);
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 120px;
      overflow: auto;
    }
    .error-logs { font-size: 11px; color: var(--ide-text-muted, #666); }
    .error-logs summary { cursor: pointer; user-select: none; margin-bottom: 6px; }
    .error-logs-body {
      margin: 0;
      font-family: monospace;
      font-size: 10.5px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--ide-text-muted, #777);
      max-height: 180px;
      overflow: auto;
    }

    /* ── log drawer (after running) ── */
    .preview-logs {
      flex-shrink: 0;
      max-height: 220px;
      overflow: auto;
      margin: 0;
      padding: 8px 12px;
      background: var(--ide-bg-900, #0d0d0d);
      border-top: 1px solid var(--ide-border, #1e1e1e);
      color: var(--ide-text-muted, #bbb);
      font-family: monospace;
      font-size: 11px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }
  `,
})
export class PreviewPanelComponent implements OnDestroy {
  readonly virtualFs = input<IVirtualFS | null>(null);

  @ViewChild('previewFrame') private frameRef?: ElementRef<HTMLIFrameElement>;

  private readonly sanitizer = inject(DomSanitizer);
  private preview: WebContainerPreview | null = null;
  private session: PreviewSession | null = null;

  readonly isRunning   = signal(false);
  readonly isBusy      = signal(false);
  readonly currentPhase = signal<PreviewPhase | null>(null);
  readonly statusLabel  = signal<string>('');
  readonly safePreviewUrl = signal<SafeResourceUrl>('about:blank');
  readonly errorMessage = signal<string | null>(null);
  readonly logs         = signal<string[]>([]);
  readonly showLogs     = signal(false);
  readonly joinedLogs   = signal<string>('');
  rawPreviewUrl = '';

  /** Steps enriched with status for the template. */
  readonly steps = computed(() => {
    const phase = this.currentPhase();
    const currentIdx = phase != null ? (PHASE_ORDER[phase] ?? -1) : -1;
    return STEPS.map((s, i) => ({
      ...s,
      status: i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending',
    }));
  });

  /** Last 8 non-empty log lines shown in the loading card. */
  readonly logTail = computed(() => {
    const all = this.joinedLogs()
      .split('\n')
      .map((l) => l.replace(/\x1b\[[0-9;]*m/g, '').trimEnd()) // strip ANSI
      .filter((l) => l.length > 0);
    return all.slice(-8);
  });

  constructor() {
    effect(() => {
      const fs = this.virtualFs();
      if (untracked(this.isRunning)) void this.stopPreview();
      this.errorMessage.set(null);
      this.logs.set([]);
      this.joinedLogs.set('');
      if (!fs) this.preview = null;
    });
  }

  async togglePreview(): Promise<void> {
    if (this.isRunning() || this.isBusy()) {
      await this.stopPreview();
    } else {
      await this.startPreview();
    }
  }

  toggleLogs(): void {
    this.showLogs.update((v) => !v);
  }

  reload(): void {
    this.frameRef?.nativeElement.contentWindow?.location.reload();
  }

  ngOnDestroy(): void {
    void this.stopPreview();
  }

  private async startPreview(): Promise<void> {
    const fs = this.virtualFs();
    const iframe = this.frameRef?.nativeElement;
    if (!fs || !iframe) return;

    this.errorMessage.set(null);
    this.logs.set([]);
    this.joinedLogs.set('');
    this.currentPhase.set(null);
    this.isBusy.set(true);

    this.preview = new WebContainerPreview(iframe, {
      fs,
      onPhase: (phase, message) => {
        this.currentPhase.set(phase);
        this.statusLabel.set(phaseLabel(phase, message));
      },
      onLog: ({ chunk }) => {
        this.logs.update((prev) => {
          const next = [...prev, chunk];
          return next.length > 800 ? next.slice(-800) : next;
        });
        this.joinedLogs.set(this.logs().join(''));
      },
    });

    try {
      const session = await this.preview.start({} satisfies PreviewConfig);
      this.session = session;
      this.rawPreviewUrl = session.url;
      this.safePreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(session.url));
      this.isRunning.set(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PreviewPanel] Failed to start preview:', err);
      this.errorMessage.set(msg);
    } finally {
      this.isBusy.set(false);
      this.statusLabel.set('');
      this.currentPhase.set(null);
    }
  }

  private async stopPreview(): Promise<void> {
    try {
      await this.preview?.stop();
    } catch {
      /* ignore */
    }
    this.preview        = null;
    this.session        = null;
    this.isRunning.set(false);
    this.isBusy.set(false);
    this.statusLabel.set('');
    this.currentPhase.set(null);
    this.safePreviewUrl.set('about:blank');
    this.rawPreviewUrl  = '';
    this.errorMessage.set(null);
  }
}

function phaseLabel(phase: PreviewPhase, message?: string): string {
  switch (phase) {
    case 'boot':    return 'Booting WebContainer…';
    case 'mount':   return message ?? 'Mounting files…';
    case 'install': return 'Installing dependencies…';
    case 'run':     return message ? `Running ${message}…` : 'Running…';
    case 'dev':     return message ?? 'Starting dev server…';
    case 'ready':   return 'Ready';
    case 'stopped': return '';
    case 'failed':  return 'Failed';
    default:        return 'Working…';
  }
}
