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
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PreviewManager } from '@vertex/runtime/preview';
import type { PreviewSession } from '@vertex/runtime/preview';
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
          [disabled]="!virtualFs()"
        >
          @if (isRunning()) {
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
            Stop
          } @else {
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Run Preview
          }
        </button>

        @if (isRunning()) {
          <button class="preview-btn preview-btn--icon" (click)="reload()" title="Reload">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
          <span class="preview-url">{{ rawPreviewUrl }}</span>
        }
      </div>

      @if (isRunning()) {
        <iframe
          #previewFrame
          [src]="safePreviewUrl()"
          class="preview-frame"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        ></iframe>
      } @else {
        <div class="preview-placeholder">
          @if (!virtualFs()) {
            <p>Clone a repository first</p>
          } @else {
            <p>Run a build, then click <strong>Run Preview</strong></p>
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
      opacity: 0.4;
      cursor: not-allowed;
    }
    .preview-btn--icon {
      padding: 3px 7px;
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
    }
    .preview-placeholder p { margin: 0; line-height: 1.6; }
    .preview-placeholder strong { color: var(--ide-text, #ccc); }
  `,
})
export class PreviewPanelComponent implements OnDestroy {
  readonly virtualFs = input<IVirtualFS | null>(null);

  @ViewChild('previewFrame') private frameRef?: ElementRef<HTMLIFrameElement>;

  private readonly sanitizer = inject(DomSanitizer);
  private manager: PreviewManager | null = null;
  private session: (PreviewSession & { _setIframe?(el: HTMLIFrameElement): void }) | null = null;

  readonly isRunning = signal(false);
  readonly safePreviewUrl = signal<SafeResourceUrl>('about:blank');
  rawPreviewUrl = '';

  constructor() {
    // Rebuild manager whenever virtualFs changes
    effect(() => {
      const fs = this.virtualFs();
      if (this.isRunning()) this.stopPreview();
      this.manager = fs ? new PreviewManager(fs) : null;
    });
  }

  async togglePreview(): Promise<void> {
    if (this.isRunning()) {
      await this.stopPreview();
    } else {
      await this.startPreview();
    }
  }

  private async startPreview(): Promise<void> {
    if (!this.manager) return;
    try {
      this.session = await this.manager.start({
        baseUrl: '/vertex-preview',
        serveDir: '/dist',
      });
      this.rawPreviewUrl = this.session.url;
      this.safePreviewUrl.set(
        this.sanitizer.bypassSecurityTrustResourceUrl(this.session.url)
      );
      this.isRunning.set(true);

      // Wire iframe reference after view updates
      setTimeout(() => {
        if (this.frameRef?.nativeElement && this.session?._setIframe) {
          this.session._setIframe(this.frameRef.nativeElement);
        }
      }, 0);
    } catch (err) {
      console.error('[PreviewPanel] Failed to start preview:', err);
    }
  }

  private async stopPreview(): Promise<void> {
    await this.manager?.stop();
    this.session = null;
    this.isRunning.set(false);
    this.safePreviewUrl.set('about:blank');
    this.rawPreviewUrl = '';
  }

  reload(): void {
    this.session?.reload();
  }

  ngOnDestroy(): void {
    this.manager?.stop();
  }
}
