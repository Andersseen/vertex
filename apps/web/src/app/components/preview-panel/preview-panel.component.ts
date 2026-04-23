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
  untracked,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PreviewNodeManager } from '@vertex/runtime/preview-node';
import type {
  PreviewNodeConfig,
  PreviewNodePhase,
  PreviewSession,
} from '@vertex/runtime/preview-node';
import type { IVirtualFS } from '@vertex/runtime';

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview-panel">
      <div class="preview-toolbar">
        <button
          class="preview-btn"
          (click)="togglePreview()"
          [disabled]="!virtualFs() || isBusy()"
        >
          @if (isBusy()) {
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="spin"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {{ statusLabel() || 'Working…' }}
          } @else if (isRunning()) {
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            Stop
          } @else {
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run Preview
          }
        </button>

        @if (isRunning()) {
          <button class="preview-btn preview-btn--icon" (click)="reload()" title="Reload">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          <span class="preview-url">{{ rawPreviewUrl }}</span>
        }

        @if (logs().length > 0) {
          <button class="preview-btn preview-btn--log" (click)="toggleLogs()" title="Toggle logs">
            Logs ({{ logs().length }})
          </button>
        }
      </div>

      @if (isRunning()) {
        <iframe
          #previewFrame
          [src]="safePreviewUrl()"
          class="preview-frame"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        ></iframe>
      } @else {
        <div class="preview-placeholder">
          @if (!virtualFs()) {
            <p>Clone a repository first</p>
          } @else if (isBusy()) {
            <p>{{ statusLabel() || 'Working…' }}</p>
          } @else if (errorMessage()) {
            <p class="preview-error">{{ errorMessage() }}</p>
          } @else {
            <p>Click <strong>Run Preview</strong> to install deps &amp; start dev server</p>
          }
        </div>
      }

      @if (showLogs() && logs().length > 0) {
        <pre class="preview-logs"
          >{{ joinedLogs() }}</pre
        >
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
    .preview-btn:hover:not(:disabled) {
      background: var(--ide-surface-700, #2a2a2a);
    }
    .preview-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .preview-btn--icon {
      padding: 3px 7px;
    }
    .preview-btn--log {
      margin-left: auto;
    }
    .preview-url {
      font-size: 11px;
      color: var(--ide-text-muted, #555);
      font-family: monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .preview-frame {
      flex: 1;
      border: none;
      width: 100%;
      background: #fff;
    }
    .preview-placeholder {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ide-text-muted, #555);
      font-size: 13px;
      text-align: center;
      padding: 16px;
    }
    .preview-placeholder p {
      margin: 0;
      line-height: 1.6;
    }
    .preview-placeholder strong {
      color: var(--ide-text, #ccc);
    }
    .preview-error {
      color: var(--ide-text-error, #f48771);
      max-width: 560px;
      white-space: pre-wrap;
      text-align: left;
      font-family: monospace;
      font-size: 12px;
    }
    .preview-logs {
      flex-shrink: 0;
      max-height: 240px;
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
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .spin {
      animation: spin 1s linear infinite;
    }
  `,
})
export class PreviewPanelComponent implements OnDestroy {
  readonly virtualFs = input<IVirtualFS | null>(null);

  @ViewChild('previewFrame') private frameRef?: ElementRef<HTMLIFrameElement>;

  private readonly sanitizer = inject(DomSanitizer);
  private manager: PreviewNodeManager | null = null;
  private session: PreviewSession | null = null;

  readonly isRunning = signal(false);
  readonly isBusy = signal(false);
  readonly statusLabel = signal<string>('');
  readonly safePreviewUrl = signal<SafeResourceUrl>('about:blank');
  readonly errorMessage = signal<string | null>(null);
  readonly logs = signal<string[]>([]);
  readonly showLogs = signal(false);
  readonly joinedLogs = signal<string>('');
  rawPreviewUrl = '';

  constructor() {
    effect(() => {
      const fs = this.virtualFs();
      if (untracked(this.isRunning)) void this.stopPreview();
      this.errorMessage.set(null);
      this.logs.set([]);
      this.joinedLogs.set('');
      this.manager = fs ? new PreviewNodeManager(fs) : null;
    });
  }

  async togglePreview(): Promise<void> {
    if (this.isRunning()) {
      await this.stopPreview();
    } else {
      await this.startPreview();
    }
  }

  toggleLogs(): void {
    this.showLogs.update((v) => !v);
  }

  reload(): void {
    const el = this.frameRef?.nativeElement;
    if (el) el.contentWindow?.location.reload();
  }

  ngOnDestroy(): void {
    void this.stopPreview();
  }

  private async startPreview(): Promise<void> {
    if (!this.manager) return;

    this.errorMessage.set(null);
    this.logs.set([]);
    this.joinedLogs.set('');
    this.isBusy.set(true);

    const config: PreviewNodeConfig = {
      onPhase: (phase, message) => {
        this.statusLabel.set(phaseLabel(phase, message));
      },
      onLog: (chunk) => {
        this.logs.update((prev) => {
          const next = [...prev, chunk];
          return next.length > 500 ? next.slice(-500) : next;
        });
        this.joinedLogs.set(this.logs().join(''));
      },
    };

    try {
      const session = await this.manager.start(config);
      this.session = session;
      this.rawPreviewUrl = session.url;
      this.safePreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(session.url));
      this.isRunning.set(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PreviewPanel] Failed to start preview:', err);
      this.errorMessage.set(msg);
      this.showLogs.set(true);
    } finally {
      this.isBusy.set(false);
      this.statusLabel.set('');
    }
  }

  private async stopPreview(): Promise<void> {
    try {
      await this.manager?.stop();
    } catch {
      /* ignore */
    }
    this.session = null;
    this.isRunning.set(false);
    this.isBusy.set(false);
    this.statusLabel.set('');
    this.safePreviewUrl.set('about:blank');
    this.rawPreviewUrl = '';
    this.errorMessage.set(null);
  }
}

function phaseLabel(phase: PreviewNodePhase, message?: string): string {
  switch (phase) {
    case 'init':
      return 'Booting Node runtime…';
    case 'install':
      return 'Installing dependencies (first run may take a minute)…';
    case 'dev-server':
      return message ?? 'Starting dev server…';
    case 'ready':
      return 'Ready';
    case 'stopped':
      return '';
    case 'failed':
      return 'Failed';
    default:
      return 'Working…';
  }
}
