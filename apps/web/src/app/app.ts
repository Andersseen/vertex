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

  protected readonly activeFile = computed(() => {
    const id = this.activeFileId();
    if (!id) return null;
    return this.openFiles().find((f) => f.id === id) ?? null;
  });

  constructor() {
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
      error: () => {},
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
  }

  onTabSelect(file: VertexFile) {
    this.activeFileId.set(file.id);
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
