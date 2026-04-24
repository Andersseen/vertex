import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  inject,
  OnDestroy,
  ViewChild,
  ElementRef,
  effect,
  AfterViewInit,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PreviewSessionService } from '../../services/preview-session.service';
import type { PreviewPhase } from '@vertex/runtime/preview-wc';
import type { IVirtualFS } from '@vertex/runtime';

interface Step {
  phase: PreviewPhase;
  label: string;
}

const STEPS: Step[] = [
  { phase: 'boot',    label: 'Boot' },
  { phase: 'mount',   label: 'Mount' },
  { phase: 'install', label: 'Install' },
  { phase: 'dev',     label: 'Dev' },
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
          [disabled]="!virtualFs() || session.isBusy()"
        >
          @if (session.isBusy()) {
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" class="spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Stop
          } @else if (session.isRunning()) {
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
            Run
          }
        </button>

        @if (session.isRunning()) {
          <button class="preview-btn preview-btn--icon" (click)="reload()" title="Reload">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>

          <button class="preview-btn preview-btn--icon" (click)="fullscreen()" title="Fullscreen">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>

          <span class="preview-url">{{ session.previewUrl() }}</span>
        }
      </div>

      <!-- ── iframe (always in DOM so @ViewChild resolves) ── -->
      <iframe
        #previewFrame
        [src]="safePreviewUrl()"
        class="preview-frame"
        [class.preview-frame--hidden]="!session.isRunning()"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
      ></iframe>

      <!-- ── loading / idle / error screen ── -->
      @if (!session.isRunning()) {
        <div class="preview-overlay">

          @if (session.isBusy()) {
            <!-- ── loading state: compact stepper only ── -->
            <div class="loading-card">
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
            </div>

          } @else if (session.errorMessage()) {
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
              <pre class="error-msg">{{ session.errorMessage() }}</pre>
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
              <p>Click <strong>Run</strong> to start preview</p>
              <p class="idle-hint">First run installs deps — may take 1–3 min</p>
            </div>
          }

        </div>
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
    .preview-url {
      font-size: 11px;
      color: var(--ide-text-muted, #555);
      font-family: monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 260px;
      margin-left: auto;
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
      gap: 10px;
      background: var(--ide-surface-800, #141414);
      border: 1px solid var(--ide-border, #222);
      border-radius: 8px;
      padding: 16px 20px;
      width: 100%;
      max-width: 280px;
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

    /* ── stepper ── */
    .steps {
      display: flex;
      flex-direction: column;
      gap: 5px;
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

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }
  `,
})
export class PreviewPanelComponent implements AfterViewInit, OnDestroy {
  readonly virtualFs = input<IVirtualFS | null>(null);

  @ViewChild('previewFrame') private frameRef?: ElementRef<HTMLIFrameElement>;

  private readonly sanitizer = inject(DomSanitizer);
  protected readonly session = inject(PreviewSessionService);

  readonly safePreviewUrl = signal<SafeResourceUrl>(
    this.session.previewUrl()
      ? this.sanitizer.bypassSecurityTrustResourceUrl(this.session.previewUrl())
      : 'about:blank',
  );

  /** Steps enriched with status for the template. */
  readonly steps = signal(
    STEPS.map((s) => ({ ...s, status: 'pending' as 'pending' | 'active' | 'done' })),
  );

  constructor() {
    effect(() => {
      const phase = this.session.currentPhase();
      const currentIdx = phase != null ? (PHASE_ORDER[phase] ?? -1) : -1;
      this.steps.set(
        STEPS.map((s, i) => ({
          ...s,
          status: i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'pending',
        })),
      );
    });

    effect(() => {
      const url = this.session.previewUrl();
      this.safePreviewUrl.set(
        url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : 'about:blank',
      );
    });

    effect(() => {
      const fs = this.virtualFs();
      if (!fs && this.session.isRunning()) {
        void this.session.stop();
      }
    });
  }

  ngAfterViewInit(): void {
    // Register the fresh iframe so the service can reload / fullscreen it
    if (this.frameRef) {
      this.session.registerIframe(this.frameRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    // Intentionally do NOT stop the session — it survives panel collapse.
  }

  async togglePreview(): Promise<void> {
    if (this.session.isRunning() || this.session.isBusy()) {
      await this.session.stop();
    } else {
      const fs = this.virtualFs();
      const iframe = this.frameRef?.nativeElement;
      if (!fs || !iframe) return;
      await this.session.start(fs, iframe);
    }
  }

  reload(): void {
    this.session.reload();
  }

  fullscreen(): void {
    void this.session.toggleFullscreen();
  }
}
