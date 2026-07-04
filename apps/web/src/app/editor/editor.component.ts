import {
  Component,
  signal,
  inject,
  computed,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MainLayoutComponent } from '@vertex/ui';
import { EditorComponent as CodeEditorComponent } from '@vertex/ui';
import { SidebarComponent } from '@vertex/ui';
import { BottomPanelComponent } from '@vertex/ui';
import { TabsComponent } from '@vertex/ui';
import { IdeSplitterComponent } from '@vertex/ide-ui';
import { tsLspExtensions } from '@vertex/ui';
import { VertexFile, VertexFolder } from '@vertex/types';
import { FileService } from '@vertex/core';
import { RuntimeService } from '@vertex/core/web';
import { IdeToastService, IdeToasterComponent } from '@vertex/ide-ui';
import { CloneDialogComponent } from '../components/clone-dialog/clone-dialog.component';
import { PreviewPanelComponent } from '../components/preview-panel/preview-panel.component';
import { PromptDialogComponent } from '../components/prompt-dialog/prompt-dialog.component';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';
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
    IdeToasterComponent,
    CloneDialogComponent,
    PreviewPanelComponent,
    PromptDialogComponent,
    ConfirmDialogComponent,
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
      color: var(--ide-text-muted);
      cursor: pointer;
      z-index: 10;
      transition: background 0.15s, color 0.15s;
    }
    .vx-preview-toggle:hover {
      background: var(--ide-bg-elevated);
      color: var(--ide-text-primary);
    }
  `,
})
export class EditorComponent {
  private readonly fileService = inject(FileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly runtime = inject(RuntimeService);
  protected readonly session = inject(EditorSessionService);
  private readonly toast = inject(IdeToastService);

  /** Debounce window for persisting keystrokes to the virtual FS. */
  private static readonly AUTOSAVE_DEBOUNCE_MS = 400;
  /** Pending virtual-FS writes, keyed by file id, so keystrokes coalesce. */
  private readonly pendingWrites = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; path: string; content: string }
  >();

  protected readonly showCloneDialog = signal(false);
  protected readonly showPreview = signal(false);
  protected readonly cloneUrlPreset = signal<string>('');
  protected readonly rootFolder = signal<VertexFolder | null>(null);
  protected readonly workspacePath = signal<string>('');

  protected readonly showOpenFolderDialog = signal(false);
  protected readonly openFolderPreset = signal<string>('.');

  protected readonly showNewFileDialog = signal(false);
  protected readonly newFilePreset = signal<string>('');

  protected readonly showNewFolderDialog = signal(false);
  protected readonly newFolderPreset = signal<string>('');

  protected readonly showRenameDialog = signal(false);
  protected readonly renamePreset = signal<string>('');
  private renameTarget: VertexFile | VertexFolder | null = null;

  protected readonly showDeleteConfirmDialog = signal(false);
  protected readonly deleteConfirmMessage = signal<string>('');
  private deleteTarget: VertexFile | VertexFolder | null = null;

  protected readonly openFiles = this.session.files;
  protected readonly activeFileId = this.session.activeId;
  protected readonly activeFile = this.session.activeFile;
  protected readonly editorExtensions = computed(() => {
    const file = this.activeFile();
    if (!file) return [];
    const lang = file.language?.toLowerCase();
    if (lang === 'typescript' || lang === 'javascript' || lang === 'ts' || lang === 'js') {
      return tsLspExtensions(file.path);
    }
    return [];
  });

  constructor() {
    // Flush any pending autosave when the editor is torn down (e.g. route
    // change) so the last keystrokes are never dropped.
    inject(DestroyRef).onDestroy(() => this.flushPendingWrites());

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
    this.openFolderPreset.set(this.rootFolder()?.path || '.');
    this.showOpenFolderDialog.set(true);
  }

  onOpenFolderConfirm(path: string): void {
    if (!path) return;
    this.fileService.setWorkspace(path).subscribe({
      next: () => {
        this.workspacePath.set(path);
        this.loadDirectory(path);
      },
      error: () => this.loadDirectory(path),
    });
  }

  async onFolderToggle(folder: VertexFolder): Promise<void> {
    // Only load on expand, and only if we haven't loaded this level yet.
    if (!folder.isExpanded || (folder.children && folder.children.length > 0)) return;

    if (this.runtime.isVirtualMode()) {
      folder.children = await this.runtime.loadChildren(folder.path);
      if (this.rootFolder()) this.rootFolder.set({ ...this.rootFolder()! });
      return;
    }

    this.fileService
      .getChildren(folder.path)
      .subscribe((children: (VertexFile | VertexFolder)[]) => {
        folder.children = children;
        if (this.rootFolder()) this.rootFolder.set({ ...this.rootFolder()! });
      });
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
    this.newFilePreset.set('');
    this.showNewFileDialog.set(true);
  }

  onNewFileConfirm(name: string): void {
    if (!name) return;
    const newFile: VertexFile = {
      id: `new-${Date.now()}`,
      name,
      path: name,
      content: '',
      language: 'text',
      isDirty: true,
    };
    this.session.open(newFile);
    void this.persistNewFile(newFile.path, '');
  }

  onNewFolder(): void {
    this.newFolderPreset.set('');
    this.showNewFolderDialog.set(true);
  }

  async onNewFolderConfirm(name: string): Promise<void> {
    if (!name) return;
    if (this.runtime.isVirtualMode()) {
      await this.runtime.createDirectory(name);
    }
    // Native mode would need sidecar support.
    await this.refreshRootFolder();
  }

  onRename(): void {
    const target = this.activeFile() ?? this.rootFolder();
    if (!target) return;
    this.renameTarget = target;
    this.renamePreset.set(target.name);
    this.showRenameDialog.set(true);
  }

  async onRenameConfirm(newName: string): Promise<void> {
    const target = this.renameTarget;
    if (!target || !newName || newName === target.name) return;

    const parentPath = target.path.substring(0, target.path.lastIndexOf('/')) || '/';
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;

    if (this.runtime.isVirtualMode()) {
      await this.runtime.rename(target.path, newPath);
    }

    if ('children' in target) {
      // TODO: update open files inside renamed folder.
    } else {
      this.session.updateFile(target.id, { id: newPath, path: newPath, name: newName });
    }

    this.renameTarget = null;
    await this.refreshRootFolder();
  }

  onDelete(): void {
    const target = this.activeFile() ?? this.rootFolder();
    if (!target) return;
    this.deleteTarget = target;
    this.deleteConfirmMessage.set(`Are you sure you want to delete "${target.name}"?`);
    this.showDeleteConfirmDialog.set(true);
  }

  async onDeleteConfirm(): Promise<void> {
    const target = this.deleteTarget;
    if (!target) return;

    if (this.runtime.isVirtualMode()) {
      if ('children' in target) {
        await this.runtime.deleteDirectory(target.path);
      } else {
        await this.runtime.deleteFile(target.path);
        this.session.close(target);
      }
    }

    this.deleteTarget = null;
    await this.refreshRootFolder();
  }

  private async persistNewFile(path: string, content: string): Promise<void> {
    if (this.runtime.isVirtualMode()) {
      await this.runtime.writeFile(path, content);
    }
  }

  private async refreshRootFolder(): Promise<void> {
    if (!this.runtime.isVirtualMode()) return;
    // Rebuild from the FS while keeping expanded folders open, so a mutation
    // reflects on disk without collapsing the tree or leaving stale open nodes.
    const folder = await this.runtime.refreshTree(this.rootFolder());
    if (folder) {
      this.rootFolder.set(folder);
      this.workspacePath.set(folder.path);
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
        this.cancelPendingWrite(file.id);
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
      this.toast.present(`Saved ${file.name}`, 'success', 2000);
    } catch (err) {
      console.error('Failed to save file:', err);
      this.toast.present(`Failed to save ${file.name}`, 'error', 3000);
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
      this.scheduleVirtualWrite(file.id, file.path, content);
    }
  }

  /**
   * Coalesces rapid keystrokes into a single debounced write to the virtual FS.
   * The in-memory session already has the latest content, so this only governs
   * how often we hit OPFS. A failed write surfaces a toast and leaves the file
   * dirty (it is not marked clean here).
   */
  private scheduleVirtualWrite(id: string, path: string, content: string): void {
    clearTimeout(this.pendingWrites.get(id)?.timer);

    const timer = setTimeout(() => {
      this.pendingWrites.delete(id);
      void this.persistVirtual(path, content);
    }, EditorComponent.AUTOSAVE_DEBOUNCE_MS);

    this.pendingWrites.set(id, { timer, path, content });
  }

  private async persistVirtual(path: string, content: string): Promise<void> {
    try {
      await this.runtime.writeFile(path, content);
    } catch (err) {
      console.error('Autosave failed:', err);
      this.toast.present(`Failed to autosave ${path.split('/').pop()}`, 'error', 3000);
    }
  }

  /** Cancels a file's pending debounced write (e.g. after an explicit save). */
  private cancelPendingWrite(id: string): void {
    clearTimeout(this.pendingWrites.get(id)?.timer);
    this.pendingWrites.delete(id);
  }

  /**
   * Persists every pending debounced write immediately, then clears them.
   * Called on teardown so the last keystrokes are never lost to the debounce.
   */
  private flushPendingWrites(): void {
    for (const { timer, path, content } of this.pendingWrites.values()) {
      clearTimeout(timer);
      void this.persistVirtual(path, content);
    }
    this.pendingWrites.clear();
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
