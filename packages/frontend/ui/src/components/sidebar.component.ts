import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VertexFile, VertexFolder } from '@vertex/types';

@Component({
  selector: 'v-folder-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="folder-tree">
      <div 
        class="tree-item"
        *ngIf="folder"
        [class.expanded]="folder.isExpanded">
        <div 
          class="tree-content"
          (click)="onFolderClick()">
          <span class="tree-arrow">{{ folder.isExpanded ? '▼' : '▶' }}</span>
          <span class="tree-icon">📁</span>
          <span class="tree-name">{{ folder.name }}</span>
        </div>
        <div class="tree-children" *ngIf="folder.isExpanded">
          <!-- Render sub-folders -->
          <ng-container *ngFor="let child of folder.children">
            <v-folder-tree
              *ngIf="isFolder(child)"
              [folder]="asFolder(child)"
              [activeFileId]="activeFileId"
              (fileSelect)="fileSelect.emit($event)"
              (folderToggle)="folderToggle.emit($event)">
            </v-folder-tree>
          </ng-container>
          
          <!-- Render files -->
          <ng-container *ngFor="let child of folder.children">
            <div 
              class="tree-item file-item"
              *ngIf="isFile(child)"
              [class.active]="child.id === activeFileId"
              (click)="onFileClick(asFile(child))">
              <span class="tree-arrow"></span>
              <span class="tree-icon">{{ getFileIcon(asFile(child).language) }}</span>
              <span class="tree-name">{{ child.name }}</span>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .folder-tree { user-select: none; }
    .tree-item { margin: 1px 0; }
    .tree-content { display: flex; align-items: center; padding: 2px 8px; cursor: pointer; border-radius: 2px; gap: 4px; }
    .tree-content:hover { background: var(--p-surface-800); }
    .tree-arrow { width: 12px; font-size: 10px; color: var(--p-surface-400); }
    .tree-icon { font-size: 14px; }
    .tree-name { font-size: 13px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--p-surface-100); }
    .tree-children { margin-left: 12px; }
    .file-item { display: flex; align-items: center; padding: 2px 8px; cursor: pointer; border-radius: 2px; gap: 4px; }
    .file-item:hover { background: var(--p-surface-800); }
    .file-item.active { background: var(--p-primary-600); }
    .file-item.active .tree-name, .file-item.active .tree-icon { color: white; }
  `]
})
export class FolderTreeComponent {
  @Input() folder: VertexFolder | null = null;
  @Input() activeFileId: string | null = null;
  @Output() fileSelect = new EventEmitter<VertexFile>();
  @Output() folderToggle = new EventEmitter<VertexFolder>();

  onFolderClick(): void {
    if (this.folder) {
      this.folderToggle.emit(this.folder);
    }
  }

  onFileClick(file: VertexFile): void {
    this.fileSelect.emit(file);
  }

  isFolder(item: VertexFile | VertexFolder): item is VertexFolder {
    return (item as any).children !== undefined;
  }

  isFile(item: VertexFile | VertexFolder): item is VertexFile {
    return (item as any).content !== undefined;
  }

  asFolder(item: VertexFile | VertexFolder): VertexFolder {
    return item as VertexFolder;
  }

  asFile(item: VertexFile | VertexFolder): VertexFile {
    return item as VertexFile;
  }

  getFileIcon(language?: string): string {
    const iconMap: Record<string, string> = {
      'typescript': '📘', 'javascript': '📜', 'html': '🌐', 'css': '🎨',
      'json': '📋', 'md': '📝', 'txt': '📄', 'python': '🐍', 'rust': '🦀'
    };
    return iconMap[language?.toLowerCase() || ''] || '📄';
  }
}

@Component({
  selector: 'v-sidebar',
  standalone: true,
  imports: [CommonModule, FolderTreeComponent],
  template: `
    <div class="h-full flex flex-col bg-[var(--p-surface-900)] border-r border-[var(--p-surface-800)]">
      <div class="flex items-center justify-between px-4 py-2 border-b border-[var(--p-surface-800)] bg-[var(--p-surface-950)]">
        <span class="text-[10px] font-bold uppercase tracking-widest text-[var(--p-surface-400)]">Explorer</span>
        <div class="flex gap-1">
          <button class="p-1 hover:bg-[var(--p-surface-800)] rounded text-[var(--p-surface-400)] transition-colors" (click)="newFile.emit()">
            <i class="pi pi-file-plus text-xs"></i>
          </button>
          <button class="p-1 hover:bg-[var(--p-surface-800)] rounded text-[var(--p-surface-400)] transition-colors" (click)="newFolder.emit()">
            <i class="pi pi-folder-plus text-xs"></i>
          </button>
        </div>
      </div>
      <div class="flex-1 overflow-auto p-2">
        <v-folder-tree 
          [folder]="workspaceFolder"
          [activeFileId]="activeFileId"
          (fileSelect)="onFileSelect($event)"
          (folderToggle)="onFolderToggle($event)">
        </v-folder-tree>
      </div>
    </div>
  `
})
export class SidebarComponent {
  @Input() workspaceFolder: VertexFolder | null = null;
  @Input() activeFileId: string | null = null;
  @Output() fileSelect = new EventEmitter<VertexFile>();
  @Output() newFile = new EventEmitter<void>();
  @Output() newFolder = new EventEmitter<void>();
  @Output() folderToggle = new EventEmitter<VertexFolder>();

  onFileSelect(file: VertexFile): void {
    this.fileSelect.emit(file);
  }

  onFolderToggle(folder: VertexFolder): void {
    this.folderToggle.emit(folder);
  }
}
