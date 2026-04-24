import { Injectable, inject, signal } from '@angular/core';
import { TERMINAL_BACKEND_ADAPTER } from '@vertex/core';
import type { TerminalBackendAdapter } from '@vertex/core';
import { WebContainerPreview } from '@vertex/runtime/preview-wc';
import type { PreviewSession, PreviewPhase } from '@vertex/runtime/preview-wc';
import type { IVirtualFS } from '@vertex/runtime';

/**
 * Global service that owns the WebContainer preview lifecycle.
 * Survives component destroy/remount so the preview keeps running
 * when the user collapses and re-expands the preview panel.
 */
@Injectable({ providedIn: 'root' })
export class PreviewSessionService {
  private readonly terminalBackend = inject<TerminalBackendAdapter>(TERMINAL_BACKEND_ADAPTER);

  // ── Public state (signals) ────────────────────────────────────────────────
  readonly isRunning   = signal(false);
  readonly isBusy      = signal(false);
  readonly currentPhase = signal<PreviewPhase | null>(null);
  readonly statusLabel  = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly previewUrl   = signal<string>('');

  // ── Internal state ────────────────────────────────────────────────────────
  private preview: WebContainerPreview | null = null;
  private session: PreviewSession | null = null;
  private currentIframe: HTMLIFrameElement | null = null;
  private logBuffer = '';

  /**
   * Start (or resume) a preview session.
   * If a session is already running, it just re-binds the iframe.
   */
  async start(fs: IVirtualFS, iframe: HTMLIFrameElement): Promise<void> {
    this.currentIframe = iframe;

    // If already running, just re-bind the new iframe to the existing URL
    if (this.session && this.isRunning()) {
      iframe.src = this.session.url;
      this.previewUrl.set(this.session.url);
      return;
    }

    this.errorMessage.set(null);
    this.isBusy.set(true);
    this.currentPhase.set(null);
    this.logBuffer = '';

    await this.writeToTerminal('\r\n\x1b[36m━━ Preview Session Started ━━\x1b[0m\r\n');

    this.preview = new WebContainerPreview(iframe, {
      fs,
      onPhase: (phase, message) => {
        this.currentPhase.set(phase);
        this.statusLabel.set(this.phaseLabel(phase, message));
        this.writeToTerminal(`\x1b[90m[${phase}]\x1b[0m ${message ?? phase}\r\n`);
      },
      onLog: ({ chunk }) => {
        this.logBuffer += chunk;
        this.writeToTerminal(chunk);
      },
    });

    try {
      this.session = await this.preview.start({});
      this.previewUrl.set(this.session.url);
      this.isRunning.set(true);
      await this.writeToTerminal(`\x1b[32m✓ Preview ready:\x1b[0m ${this.session.url}\r\n`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PreviewSession] Failed to start preview:', err);
      this.errorMessage.set(msg);
      await this.writeToTerminal(`\x1b[31m✗ Preview failed:\x1b[0m ${msg}\r\n`);
      this.cleanup();
    } finally {
      this.isBusy.set(false);
      this.statusLabel.set('');
    }
  }

  /**
   * Register a fresh iframe reference (e.g. after the panel was hidden then shown).
   * The caller is responsible for binding the URL via Angular [src].
   */
  registerIframe(iframe: HTMLIFrameElement): void {
    this.currentIframe = iframe;
  }

  /**
   * Stop the preview and tear down the WebContainer.
   */
  async stop(): Promise<void> {
    try {
      await this.preview?.stop();
      await this.writeToTerminal('\x1b[90m━━ Preview Session Stopped ━━\x1b[0m\r\n');
    } catch {
      /* ignore */
    }
    this.cleanup();
  }

  /**
   * Reload the preview iframe.
   */
  reload(): void {
    this.currentIframe?.contentWindow?.location.reload();
  }

  /**
   * Get the current preview URL (useful for binding [src] on remount).
   */
  getUrl(): string | null {
    return this.session?.url ?? null;
  }

  /**
   * Toggle fullscreen on the preview iframe.
   */
  async toggleFullscreen(): Promise<void> {
    const iframe = this.currentIframe;
    if (!iframe) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await iframe.requestFullscreen();
    }
  }

  private cleanup(): void {
    this.preview = null;
    this.session = null;
    this.currentIframe = null;
    this.isRunning.set(false);
    this.isBusy.set(false);
    this.statusLabel.set('');
    this.currentPhase.set(null);
    this.previewUrl.set('');
  }

  private async writeToTerminal(data: string): Promise<void> {
    try {
      await this.terminalBackend.writeOutput(data);
    } catch {
      // Terminal may not be ready yet; ignore.
    }
  }

  private phaseLabel(phase: PreviewPhase, message?: string): string {
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
}
