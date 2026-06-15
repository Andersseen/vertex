import { Injectable, computed, signal } from '@angular/core';
import type { VertexFile } from '@vertex/types';

interface EditorSessionState {
  openFiles: Pick<VertexFile, 'id' | 'path' | 'name' | 'language'>[];
  activeFileId: string | null;
}

const SESSION_KEY = 'vertex:editor';

@Injectable({ providedIn: 'root' })
export class EditorSessionService {
  private readonly openFiles = signal<VertexFile[]>([]);
  private readonly activeFileId = signal<string | null>(null);

  readonly files = this.openFiles.asReadonly();
  readonly activeId = this.activeFileId.asReadonly();
  readonly activeFile = computed(() => {
    const id = this.activeFileId();
    if (!id) return null;
    return this.openFiles().find((f) => f.id === id) ?? null;
  });

  open(file: VertexFile): void {
    const current = this.openFiles();
    const exists = current.find((f) => f.id === file.id);
    if (!exists) {
      this.openFiles.set([...current, file]);
    } else if (file.content !== undefined && exists.content !== file.content) {
      this.updateFile(file.id, { content: file.content });
    }
    this.activeFileId.set(file.id);
    this.save();
  }

  select(file: VertexFile): void {
    this.activeFileId.set(file.id);
    this.save();
  }

  close(file: VertexFile): void {
    const filtered = this.openFiles().filter((f) => f.id !== file.id);
    this.openFiles.set(filtered);
    if (this.activeFileId() === file.id) {
      this.activeFileId.set(filtered.length > 0 ? filtered[0].id : null);
    }
    this.save();
  }

  updateFile(id: string, patch: Partial<VertexFile>): void {
    const current = this.openFiles();
    const idx = current.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const updated = [...current];
    updated[idx] = { ...updated[idx], ...patch };
    this.openFiles.set(updated);
  }

  setContent(id: string, content: string): void {
    this.updateFile(id, { content, isDirty: true });
  }

  markClean(id: string): void {
    this.updateFile(id, { isDirty: false });
    this.save();
  }

  clear(): void {
    this.openFiles.set([]);
    this.activeFileId.set(null);
    this.clearStorage();
  }

  restore(files: VertexFile[], activeId: string | null): void {
    this.openFiles.set(files);
    if (activeId && files.some((f) => f.id === activeId)) {
      this.activeFileId.set(activeId);
    } else if (files.length > 0) {
      this.activeFileId.set(files[0].id);
    } else {
      this.activeFileId.set(null);
    }
  }

  save(): void {
    try {
      const state: EditorSessionState = {
        openFiles: this.openFiles().map((f) => ({
          id: f.id,
          path: f.path,
          name: f.name,
          language: f.language,
        })),
        activeFileId: this.activeFileId(),
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch {
      /* storage full or disabled */
    }
  }

  loadState(): EditorSessionState | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as EditorSessionState) : null;
    } catch {
      return null;
    }
  }

  private clearStorage(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
}
