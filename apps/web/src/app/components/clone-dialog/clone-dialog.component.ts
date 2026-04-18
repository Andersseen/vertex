import {
  Component,
  input,
  output,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import type { VertexFolder } from '@vertex/types';
import { RuntimeService } from '@vertex/core';

@Component({
  selector: 'app-clone-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    ProgressBarModule,
    MessageModule,
  ],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      header="Clone Repository"
      [modal]="true"
      [closable]="!runtime.isCloning()"
      [style]="{ width: '480px' }"
      [draggable]="false"
    >
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 8px 0;">
        <!-- URL -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label for="repo-url" style="font-size: 0.8125rem; font-weight: 500; color: var(--p-surface-300);">
            Repository URL
          </label>
          <input
            pInputText
            id="repo-url"
            [(ngModel)]="url"
            placeholder="https://github.com/owner/repo"
            [disabled]="runtime.isCloning()"
            style="width: 100%;"
            (keydown.enter)="clone()"
          />
        </div>

        <!-- Token -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label for="repo-token" style="font-size: 0.8125rem; font-weight: 500; color: var(--p-surface-300);">
            GitHub Token
            <span style="color: var(--p-surface-500); font-weight: 400;"> (optional, for private repos)</span>
          </label>
          <p-password
            inputId="repo-token"
            [(ngModel)]="token"
            placeholder="ghp_xxxxxxxxxxxx"
            [disabled]="runtime.isCloning()"
            [feedback]="false"
            [toggleMask]="true"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>

        <!-- Progress -->
        @if (runtime.isCloning()) {
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--p-surface-400);">
              <span>{{ runtime.cloneProgress()?.phase ?? 'Connecting...' }}</span>
              <span>{{ runtime.cloneProgress()?.percent ?? 0 }}%</span>
            </div>
            <p-progressbar
              [value]="runtime.cloneProgress()?.percent ?? 0"
              [showValue]="false"
            />
          </div>
        }

        <!-- Error -->
        @if (runtime.cloneError()) {
          <p-message severity="error" [text]="runtime.cloneError()!" />
        }
      </div>

      <ng-template pTemplate="footer">
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          (onClick)="visibleChange.emit(false)"
          [disabled]="runtime.isCloning()"
        />
        <p-button
          label="Clone"
          icon="pi pi-download"
          (onClick)="clone()"
          [loading]="runtime.isCloning()"
          [disabled]="!url.trim() || runtime.isCloning()"
        />
      </ng-template>
    </p-dialog>
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
