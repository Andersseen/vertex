import {
  Component,
  input,
  output,
  inject,
  effect,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { VertexFolder } from '@vertex/types';
import { RuntimeService } from '@vertex/core/web';
import {
  IdeDialogComponent,
  IdeInputComponent,
  IdeProgressBarComponent,
  IdeAlertComponent,
  IdeButtonComponent,
} from '@vertex/ide-ui';

@Component({
  selector: 'app-clone-dialog',
  standalone: true,
  imports: [
    IdeDialogComponent,
    IdeInputComponent,
    IdeProgressBarComponent,
    IdeAlertComponent,
    IdeButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <v-ide-dialog
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      title="Clone Repository"
      [closable]="!runtime.isCloning()"
      [showFooter]="true"
    >
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- URL -->
        <v-ide-input
          label="Repository URL"
          placeholder="https://github.com/owner/repo"
          [value]="url()"
          [disabled]="runtime.isCloning()"
          (valueChange)="url.set($event)"
          (enterPressed)="clone()"
        />

        <!-- Token -->
        <v-ide-input
          label="GitHub Token (optional, for private repos)"
          type="password"
          placeholder="ghp_xxxxxxxxxxxx"
          [disabled]="runtime.isCloning()"
          (valueChange)="token.set($event)"
        />

        <!-- Progress -->
        @if (runtime.isCloning()) {
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--ide-text-muted);">
              <span>{{ runtime.cloneProgress()?.phase ?? 'Connecting...' }}</span>
              <span>{{ runtime.cloneProgress()?.percent ?? 0 }}%</span>
            </div>
            <v-ide-progress-bar [value]="runtime.cloneProgress()?.percent ?? 0" />
          </div>
        }

        <!-- Error -->
        @if (runtime.cloneError()) {
          <v-ide-alert severity="error" [text]="runtime.cloneError()!" />
        }
      </div>

      <div ideDialogFooter>
        <v-ide-button
          variant="ghost"
          [disabled]="runtime.isCloning()"
          (clicked)="visibleChange.emit(false)"
        >
          Cancel
        </v-ide-button>
        <v-ide-button
          variant="accent"
          [disabled]="!url().trim() || runtime.isCloning()"
          (clicked)="clone()"
        >
          Clone
        </v-ide-button>
      </div>
    </v-ide-dialog>
  `,
})
export class CloneDialogComponent {
  readonly runtime = inject(RuntimeService);

  readonly visible = input(false);
  readonly urlPreset = input('');
  readonly visibleChange = output<boolean>();
  readonly cloneSuccess = output<VertexFolder>();

  readonly url = signal('');
  readonly token = signal('');

  constructor() {
    effect(() => {
      const preset = this.urlPreset();
      if (preset) this.url.set(preset);
    });
  }

  async clone(): Promise<void> {
    if (!this.url().trim() || this.runtime.isCloning()) return;
    try {
      const folder = await this.runtime.clone({
        url: this.url().trim(),
        token: this.token().trim() || undefined,
        depth: 1,
      });
      this.url.set('');
      this.token.set('');
      this.visibleChange.emit(false);
      this.cloneSuccess.emit(folder);
    } catch {
      // error ya está en runtime.cloneError()
    }
  }
}
