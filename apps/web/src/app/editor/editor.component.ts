import {
  Component,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MainLayoutComponent } from '@vertex/ui';
import { EditorComponent as CodeEditorComponent } from '@vertex/ui';
import { SidebarComponent } from '@vertex/ui';
import { BottomPanelComponent } from '@vertex/ui';
import { TabsComponent } from '@vertex/ui';
import { IdeSplitterComponent } from '@vertex/ide-ui';
import { VertexFile, VertexFolder } from '@vertex/types';
import { FileService } from '@vertex/core';
import { RuntimeService } from '@vertex/core/web';
import { CloneDialogComponent } from '../components/clone-dialog/clone-dialog.component';
import { PreviewPanelComponent } from '../components/preview-panel/preview-panel.component';
import { EditorSessionService } from '../services/editor-session.service';

function findFirstFile(folder: VertexFolder): VertexFile | null {
  for (const child of folder.children ?? []) {
    if (!('children' in child)) return child as VertexFile;
    const found = findFirstFile(child as VertexFolder);
    if (found) return found;
  }
  return null;
}

@Component({
  selector: 'v-editor-page',
  standalone: true,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
  imports: [
    MainLayoutComponent,
    CodeEditorComponent,
    SidebarComponent,
    BottomPanelComponent,
    TabsComponent,
    IdeSplitterComponent,
    CloneDialogComponent,
    PreviewPanelComponent,
  ],
  templateUrl: './editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .vx-preview-toggle {
      position: absolute;
      top: 6px;
      right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--ide-text-muted, #555);
      cursor: pointer;
      z-index: 10;
      transition: background 0.15s, color 0.15s;
    }
    .vx-preview-toggle:hover {
      background: var(--ide-surface-800, #1e1e1e);
      color: var(--ide-text, #ccc);
    }
  `,
})
export class EditorComponent {
  private readonly fileService = inject(FileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly runtime = inject(RuntimeService);
  protected readonly session = inject(EditorSessionService);

  protected readonly showCloneDialog = signal(false);
  protected readonly showPreview = signal(false);
  protected readonly cloneUrlPreset = signal<string>('');
  protected readonly rootFolder = signal<VertexFolder | null>(null);
  protected readonly workspacePath = signal<string>('');

  protected readonly openFiles = this.session.files;
  protected readonly activeFileId = this.session.activeId;
  protected readonly activeFile = this.session.activeFile;

  constructor() {
    const cloneUrl = this.route.snapshot.queryParamMap.get('clone');
    if (cloneUrl) {
      this.cloneUrlPreset.set(cloneUrl);
      this.showCloneDialog.set(true);
    }

    this.runtime.loadSession().then(async (folder) => {
      if (folder) {
        this.rootFolder.set(folder);
        this.workspacePath.set(folder.path);
        this.showCloneDialog.set(false);
        await this.restoreEditorState();
      } else {
        this.loadNativeWorkspace();
      }
    }).catch(() => this.loadNativeWorkspace());
  }

  private loadNativeWorkspace(): void {
    this.fileService.getWorkspace().subscribe({
      next: (workspace) => {
        this.workspacePath.set(workspace.path);
        this.loadDirectory(workspace.path);
      },
      error: () => this.loadDirectory('.'),
    });
  }

  private loadDirectory(path: string): void {
    this.fileService.getFiles(path).subscribe({
      next: (folder: VertexFolder) => {
        this.rootFolder.set({ ...folder, path });
        if (folder.children?.length) {
          const firstFile = folder.children.find((f) => !('children' in f)) as VertexFile;
          if (firstFile) this.onFileSelect(firstFile);
        }
      },
      error: (err: unknown) => console.warn('Failed to load directory:', err),
    });
  }

  // ── Clone from URL ──────────────────────────────────────────────────────────

  openCloneDialog(): void {
    this.cloneUrlPreset.set('');
    this.showCloneDialog.set(true);
  }

  onCloneSuccess(folder: VertexFolder): void {
    this.rootFolder.set(folder);
    this.workspacePath.set(folder.path);
    this.showCloneDialog.set(false);
    this.session.clear();

    const firstFile = findFirstFile(folder);
    if (firstFile) this.onFileSelect(firstFile);

    if (this.route.snapshot.queryParamMap.has('clone')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { clone: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  // ── Folder / File ops ───────────────────────────────────────────────────────

  openFolder(): void {
    const path = window.prompt(
      'Enter absolute path to workspace folder:',
      this.rootFolder()?.path || '.',
    );
    if (path) {
      this.fileService.setWorkspace(path).subscribe({
        next: () => {
          this.workspacePath.set(path);
          this.loadDirectory(path);
        },
        error: () => this.loadDirectory(path),
      });
    }
  }

  onFolderToggle(folder: VertexFolder): void {
    if (folder.isExpanded && (!folder.children || folder.children.length === 0)) {
      if (this.runtime.isVirtualMode()) return;
      this.fileService
        .getChildren(folder.path)
        .subscribe((children: (VertexFile | VertexFolder)[]) => {
          folder.children = children;
          if (this.rootFolder()) this.rootFolder.set({ ...this.rootFolder()! });
        });
    }
  }

  async onFileSelect(file: VertexFile): Promise<void> {
    const existing = this.openFiles().find((f) => f.id === file.id);
    const hasContent = file.content || existing?.content;

    if (!hasContent) {
      const content = this.runtime.isVirtualMode()
        ? await this.runtime.readFile(file.path)
        : await new Promise<string>((res, rej) =>
            this.fileService.readFile(file.path).subscribe({
              next: (c) => res(c),
              error: rej,
            }),
          );
      this.session.open({ ...file, content });
    } else {
      const fileToUse = !file.content && existing?.content
        ? { ...file, content: existing.content }
        : file;
      this.session.open(fileToUse);
    }
  }

  onTabSelect(file: VertexFile): void {
    this.session.select(file);
  }

  onNewFile(): void {
    const name = window.prompt('Enter file name:');
    if (name) {
      const newFile: VertexFile = {
        id: `new-${Date.now()}`,
        name,
        path: name,
        content: '',
        language: 'text',
        isDirty: true,
      };
      this.session.open(newFile);
    }
  }

  onTabClose(file: VertexFile, event?: MouseEvent): void {
    event?.stopPropagation();
    this.session.close(file);
  }

  async onSave(): Promise<void> {
    const file = this.activeFile();
    if (!file) return;

    try {
      if (this.runtime.isVirtualMode()) {
        await this.runtime.writeFile(file.path, file.content ?? '');
      } else {
        await new Promise<void>((res, rej) =>
          this.fileService.writeFile(file.path, file.content ?? '').subscribe({
            next: () => res(),
            error: rej,
          }),
        );
      }
      this.session.markClean(file.id);
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      void this.onSave();
    }
  }

  onContentChange(content: string): void {
    const file = this.activeFile();
    if (!file) return;
    this.session.setContent(file.id, content);

    if (this.runtime.isVirtualMode()) {
      this.runtime.writeFile(file.path, content).catch(() => {
        this.session.setContent(file.id, content);
      });
    }
  }

  private async restoreEditorState(): Promise<void> {
    const state = this.session.loadState();
    if (!state) return;

    const files: VertexFile[] = [];
    for (const meta of state.openFiles ?? []) {
      try {
        const content = await this.runtime.readFile(meta.path);
        files.push({ ...meta, content, isDirty: false });
      } catch {
        // file no longer exists in FS
      }
    }

    this.session.restore(files, state.activeFileId);
  }
}
