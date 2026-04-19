import {
  Component,
  signal,
  inject,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MainLayoutComponent } from '@vertex/ui';
import { EditorComponent } from '@vertex/ui';
import { SidebarComponent } from '@vertex/ui';
import { BottomPanelComponent } from '@vertex/ui';
import { TabsComponent } from '@vertex/ui';
import { VertexFile, VertexFolder } from '@vertex/types';
import { FileService } from '@vertex/core';
import { RuntimeService } from '@vertex/core/web';
import { CloneDialogComponent } from './components/clone-dialog/clone-dialog.component';

@Component({
  selector: 'app-root',
  imports: [
    MainLayoutComponent,
    EditorComponent,
    SidebarComponent,
    BottomPanelComponent,
    TabsComponent,
    CloneDialogComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly fileService = inject(FileService);
  protected readonly runtime = inject(RuntimeService);

  protected readonly title = signal('Vertex IDE Web');
  protected readonly showCloneDialog = signal(false);
  protected readonly openFiles = signal<VertexFile[]>([]);
  protected readonly activeFileId = signal<string | null>(null);
  protected readonly rootFolder = signal<VertexFolder | null>(null);
  protected readonly workspacePath = signal<string>('');
  private readonly EDITOR_KEY = 'vertex:editor';

  protected readonly activeFile = computed(() => {
    const id = this.activeFileId();
    if (!id) return null;
    return this.openFiles().find((f) => f.id === id) ?? null;
  });

  constructor() {
    // 1️⃣ Intentar restaurar sesión virtual previa (OPFS/IndexedDB)
    this.runtime.loadSession().then((folder) => {
      if (folder) {
        this.rootFolder.set(folder);
        this.workspacePath.set(folder.path);
        this.restoreEditorState();
      } else {
        // 2️⃣ Fallback: sidecar nativo o directorio por defecto
        this.loadNativeWorkspace();
      }
    }).catch(() => this.loadNativeWorkspace());
  }

  /** Fallback cuando no hay sesión virtual guardada */
  private loadNativeWorkspace(): void {
    this.fileService.getWorkspace().subscribe({
      next: (workspace) => {
        this.workspacePath.set(workspace.path);
        this.loadDirectory(workspace.path);
      },
      error: () => {
        this.loadDirectory('.');
      },
    });
  }

  private loadDirectory(path: string) {
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
    this.showCloneDialog.set(true);
  }

  onCloneSuccess(folder: VertexFolder): void {
    this.rootFolder.set(folder);
    this.openFiles.set([]);
    this.activeFileId.set(null);
    this.workspacePath.set(folder.path);
    this.clearEditorState();
  }

  // ── Folder / File ops ───────────────────────────────────────────────────────

  openFolder() {
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

  onFolderToggle(folder: VertexFolder) {
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

  onFileSelect(file: VertexFile) {
    this.activeFileId.set(file.id);
    const existing = this.openFiles().find((f) => f.id === file.id);

    if (!file.content && (!existing || !existing.content)) {
      const read$ = this.runtime.isVirtualMode()
        ? this.runtime.readFile(file.path).then((content) => ({ content }))
        : new Promise<{ content: string }>((res, rej) =>
            this.fileService.readFile(file.path).subscribe({
              next: (content) => res({ content }),
              error: rej,
            }),
          );

      read$.then(({ content }) => this.updateOrAddFile({ ...file, content }));
    } else {
      const fileToUse =
        !file.content && existing?.content ? { ...file, content: existing.content } : file;
      this.updateOrAddFile(fileToUse);
    }
  }

  private updateOrAddFile(file: VertexFile) {
    const current = this.openFiles();
    const idx = current.findIndex((f) => f.id === file.id);
    if (idx === -1) {
      this.openFiles.set([...current, file]);
    } else {
      const updated = [...current];
      updated[idx] = file;
      this.openFiles.set(updated);
    }
    this.saveEditorState();
  }

  /** Persiste metadatos de tabs abiertos en sessionStorage */
  private saveEditorState(): void {
    try {
      const state = {
        openFiles: this.openFiles().map((f) => ({
          id: f.id,
          path: f.path,
          name: f.name,
          language: f.language,
        })),
        activeFileId: this.activeFileId(),
      };
      sessionStorage.setItem(this.EDITOR_KEY, JSON.stringify(state));
    } catch { /* storage full or disabled */ }
  }

  /** Restaura tabs abiertos leyendo contenido desde el FS virtual */
  private async restoreEditorState(): Promise<void> {
    try {
      const raw = sessionStorage.getItem(this.EDITOR_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);

      const files: VertexFile[] = [];
      for (const meta of state.openFiles ?? []) {
        try {
          const content = await this.runtime.readFile(meta.path);
          files.push({ ...meta, content, isDirty: false });
        } catch {
          // Archivo ya no existe en el FS, omitir
        }
      }

      this.openFiles.set(files);
      const activeId = state.activeFileId;
      if (activeId && files.some((f) => f.id === activeId)) {
        this.activeFileId.set(activeId);
      } else if (files.length > 0) {
        this.activeFileId.set(files[0].id);
      }
    } catch { /* ignore */ }
  }

  private clearEditorState(): void {
    try {
      sessionStorage.removeItem(this.EDITOR_KEY);
    } catch { /* ignore */ }
  }

  onTabSelect(file: VertexFile) {
    this.activeFileId.set(file.id);
    this.saveEditorState();
  }

  onNewFile() {
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
      this.updateOrAddFile(newFile);
      this.activeFileId.set(newFile.id);
    }
  }

  onTabClose(file: VertexFile, event?: MouseEvent) {
    event?.stopPropagation();
    const filtered = this.openFiles().filter((f) => f.id !== file.id);
    this.openFiles.set(filtered);
    if (this.activeFileId() === file.id) {
      this.activeFileId.set(filtered.length > 0 ? filtered[0].id : null);
    }
    this.saveEditorState();
  }

  onContentChange(content: string) {
    const file = this.activeFile();
    if (!file) return;

    const updatedFile = { ...file, content, isDirty: true };
    const current = this.openFiles();
    const idx = current.findIndex((f) => f.id === file.id);
    if (idx !== -1) {
      const updated = [...current];
      updated[idx] = updatedFile;
      this.openFiles.set(updated);
    }

    if (this.runtime.isVirtualMode()) {
      this.runtime.writeFile(file.path, content);
    }
  }
}
