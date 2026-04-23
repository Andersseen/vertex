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
import { PreviewManager } from '@vertex/runtime/preview';
import type { PreviewSession } from '@vertex/runtime/preview';
import type { IVirtualFS } from '@vertex/runtime';
import { Bundler } from '@vertex/runtime/build';
import {
  readPackageJson,
  detectEntryPoint,
  detectEntryFromIndexHtml,
  needsNodeRuntime,
  detectDevScript,
  detectTailwindVersion,
} from '@vertex/runtime/build';
import type { TailwindVersion } from '@vertex/runtime/build';
import { NodeboxRuntime } from '@vertex/runtime/node';

type PreviewMode = 'esbuild' | 'nodebox';

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
          <span class="preview-mode">{{ activeMode() }}</span>
          <span class="preview-url">{{ rawPreviewUrl }}</span>
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
            <p>Click <strong>Run Preview</strong> to build &amp; serve</p>
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
      opacity: 0.5;
      cursor: not-allowed;
    }
    .preview-btn--icon {
      padding: 3px 7px;
    }
    .preview-mode {
      font-size: 10px;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 3px;
      background: var(--ide-surface-800, #1e1e1e);
      color: var(--ide-text-muted, #888);
      letter-spacing: 0.5px;
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
      max-width: 480px;
      white-space: pre-wrap;
      text-align: left;
      font-family: monospace;
      font-size: 12px;
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
  private esbuildManager: PreviewManager | null = null;
  private nodebox: NodeboxRuntime | null = null;
  private session: (PreviewSession & { _setIframe?(el: HTMLIFrameElement): void }) | null = null;

  readonly isRunning = signal(false);
  readonly isBusy = signal(false);
  readonly statusLabel = signal<string>('');
  readonly safePreviewUrl = signal<SafeResourceUrl>('about:blank');
  readonly errorMessage = signal<string | null>(null);
  readonly activeMode = signal<PreviewMode | null>(null);
  rawPreviewUrl = '';

  constructor() {
    effect(() => {
      const fs = this.virtualFs();
      if (untracked(this.isRunning)) void this.stopPreview();
      this.errorMessage.set(null);
      this.esbuildManager = fs ? new PreviewManager(fs) : null;
    });
  }

  async togglePreview(): Promise<void> {
    if (this.isRunning()) {
      await this.stopPreview();
    } else {
      await this.startPreview();
    }
  }

  reload(): void {
    if (this.activeMode() === 'nodebox') {
      const el = this.frameRef?.nativeElement;
      if (el) el.contentWindow?.location.reload();
      return;
    }
    this.session?.reload();
  }

  ngOnDestroy(): void {
    void this.stopPreview();
  }

  private async startPreview(): Promise<void> {
    const fs = this.virtualFs();
    if (!fs) return;

    this.errorMessage.set(null);
    this.isBusy.set(true);

    try {
      const pkg = await readPackageJson(fs, '/');
      const mode: PreviewMode = needsNodeRuntime(pkg) ? 'nodebox' : 'esbuild';
      this.activeMode.set(mode);

      if (mode === 'nodebox') {
        await this.startNodeboxPreview(fs, pkg);
      } else {
        await this.startEsbuildPreview(fs);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PreviewPanel] Failed to start preview:', err);
      this.errorMessage.set(`Preview failed to start: ${msg}`);
      await this.stopPreview();
    } finally {
      this.isBusy.set(false);
      this.statusLabel.set('');
    }
  }

  private async startEsbuildPreview(fs: IVirtualFS): Promise<void> {
    if (!this.esbuildManager) return;

    this.statusLabel.set('Building…');
    const buildOutcome = await this.runEsbuild(fs);
    if (!buildOutcome.ok) {
      this.errorMessage.set(buildOutcome.error);
      return;
    }

    this.statusLabel.set('Starting preview…');
    this.session = await this.esbuildManager.start({
      baseUrl: '/vertex-preview',
      serveDir: '/dist',
      indexHtml: '/index.html',
    });
    this.applyPreviewUrl(this.session.url);
    this.isRunning.set(true);

    setTimeout(() => {
      if (this.frameRef?.nativeElement && this.session?._setIframe) {
        this.session._setIframe(this.frameRef.nativeElement);
      }
    }, 0);
  }

  private async startNodeboxPreview(
    fs: IVirtualFS,
    pkg: Awaited<ReturnType<typeof readPackageJson>>,
  ): Promise<void> {
    const devScript = detectDevScript(pkg);
    if (!devScript) {
      this.errorMessage.set(
        'No dev script found. Expected one of `dev`, `start`, or `serve` in package.json scripts.',
      );
      return;
    }

    this.statusLabel.set('Booting Node runtime…');
    this.nodebox = new NodeboxRuntime(fs);
    await this.nodebox.init();

    this.statusLabel.set('Installing dependencies (this may take a minute)…');
    console.log('[PreviewPanel] npm install…');
    await this.nodebox.install({
      onOutput: (chunk) => console.log('[npm]', chunk),
    });

    this.statusLabel.set(`Starting dev server (npm run ${devScript})…`);
    console.log(`[PreviewPanel] npm run ${devScript}`);
    const info = await this.nodebox.startDevServer(devScript);

    this.applyPreviewUrl(info.url);
    this.isRunning.set(true);
  }

  private async runEsbuild(
    fs: IVirtualFS,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const pkg = await readPackageJson(fs, '/');

      let entryPoint = await detectEntryFromIndexHtml(fs, '/index.html');
      if (entryPoint) {
        console.log('[PreviewPanel] Entry from index.html:', entryPoint);
      }

      if (!entryPoint || !(await fs.exists(entryPoint))) {
        const pkgEntry = detectEntryPoint(pkg);
        const candidates = [
          pkgEntry,
          '/src/main.tsx',
          '/src/main.ts',
          '/src/main.jsx',
          '/src/main.js',
          '/src/index.tsx',
          '/src/index.ts',
          '/src/index.jsx',
          '/src/index.js',
          '/index.ts',
          '/main.ts',
        ];
        entryPoint = null;
        for (const candidate of candidates) {
          if (candidate && (await fs.exists(candidate))) {
            entryPoint = candidate;
            console.log('[PreviewPanel] Fallback entry point:', entryPoint);
            break;
          }
        }
      }

      if (!entryPoint) {
        return {
          ok: false,
          error:
            'Could not find an entry point. Expected a `<script type="module" src="...">` in /index.html ' +
            'or a /src/main.{ts,tsx,js,jsx} file.',
        };
      }

      console.log('[PreviewPanel] Building from:', entryPoint);
      const bundler = new Bundler(fs);
      const result = await bundler.build({
        entryPoint,
        outDir: '/dist',
        format: 'esm',
        target: 'browser',
        minify: true,
        sourcemap: true,
        npmResolution: 'cdn',
        cdnUrl: 'https://esm.sh',
      });

      console.log(
        '[PreviewPanel] Build result:',
        result.success ? 'SUCCESS' : 'FAILED',
        '- duration:',
        result.duration + 'ms',
        '- files:',
        result.files.map((f) => f.path).join(', ') || 'none',
        '- errors:',
        result.errors.length,
        '- warnings:',
        result.warnings.length,
      );

      if (!result.success || result.files.length === 0) {
        const summary = result.errors
          .slice(0, 3)
          .map((e) => `${e.file || '?'}:${e.line}: ${e.message}`)
          .join('\n');
        return {
          ok: false,
          error: `Build failed (${result.errors.length} error${result.errors.length === 1 ? '' : 's'}):\n${summary || 'no output files'}`,
        };
      }

      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PreviewPanel] Build error:', err);
      return { ok: false, error: `Build crashed: ${msg}` };
    }
  }

  private applyPreviewUrl(url: string): void {
    this.rawPreviewUrl = url;
    this.safePreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  private async stopPreview(): Promise<void> {
    try {
      await this.esbuildManager?.stop();
    } catch {
      /* ignore */
    }
    try {
      await this.nodebox?.destroy();
    } catch {
      /* ignore */
    }
    this.nodebox = null;
    this.session = null;
    this.isRunning.set(false);
    this.isBusy.set(false);
    this.statusLabel.set('');
    this.activeMode.set(null);
    this.safePreviewUrl.set('about:blank');
    this.rawPreviewUrl = '';
    this.errorMessage.set(null);
  }
}
