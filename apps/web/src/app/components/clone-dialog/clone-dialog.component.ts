import {
  Component,
  input,
  output,
  inject,
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
    <ide-dialog
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      title="Clone Repository"
      [closable]="!runtime.isCloning()"
    >
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- URL -->
        <ide-input
          label="Repository URL"
          placeholder="https://github.com/owner/repo"
          [disabled]="runtime.isCloning()"
          (valueChange)="url = $event"
          (enterPressed)="clone()"
        />

        <!-- Token -->
        <ide-input
          label="GitHub Token (optional, for private repos)"
          type="password"
          placeholder="ghp_xxxxxxxxxxxx"
          [disabled]="runtime.isCloning()"
          (valueChange)="token = $event"
        />

        <!-- Progress -->
        @if (runtime.isCloning()) {
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--ide-text-muted);">
              <span>{{ runtime.cloneProgress()?.phase ?? 'Connecting...' }}</span>
              <span>{{ runtime.cloneProgress()?.percent ?? 0 }}%</span>
            </div>
            <ide-progress-bar [value]="runtime.cloneProgress()?.percent ?? 0" />
          </div>
        }

        <!-- Error -->
        @if (runtime.cloneError()) {
          <ide-alert severity="error" [text]="runtime.cloneError()!" />
        }
      </div>

      <div ideDialogFooter>
        <ide-button
          variant="ghost"
          [disabled]="runtime.isCloning()"
          (clicked)="visibleChange.emit(false)"
        >
          Cancel
        </ide-button>
        <ide-button
          variant="accent"
          [disabled]="!url.trim() || runtime.isCloning()"
          (clicked)="clone()"
        >
          Clone
        </ide-button>
      </div>
    </ide-dialog>
  `,
})
export class CloneDialogComponent {
  readonly runtime = inject(RuntimeService);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  readonly cloneSuccess = output<VertexFolder>();

  url = '';
  token = '';

  async clone(): Promise<void> {
    if (!this.url.trim() || this.runtime.isCloning()) return;
    try {
      const folder = await this.runtime.clone({
        url: this.url.trim(),
        token: this.token.trim() || undefined,
        depth: 1,
      });
      this.url = '';
      this.token = '';
      this.visibleChange.emit(false);
      this.cloneSuccess.emit(folder);
    } catch {
      // error ya está en runtime.cloneError()
    }
  }
}
