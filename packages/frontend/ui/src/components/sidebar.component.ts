import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VertexFile, VertexFolder } from '@vertex/types';

@Component({
  selector: 'v-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>Explorer</h3>
        <div class="sidebar-actions">
          <button class="action-btn" (click)="onNewFile()" title="New File">📄</button>
          <button class="action-btn" (click)="onNewFolder()" title="New Folder">📁</button>
        </div>
      </div>
      <div class="sidebar-content">
        <div class="tree-view">
          <v-folder-tree 
            [folder]="workspaceFolder"
            [activeFileId]="activeFileId"
            (fileSelect)="onFileSelect($event)"
            (folderToggle)="onFolderToggle($event)">
          </v-folder-tree>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sidebar {
      width: 250px;
      height: 100%;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
    }
    
    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-hover);
      min-height: 36px;
    }
    
    .sidebar-header h3 {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
    }
    
    .sidebar-actions {
      display: flex;
      gap: 4px;
    }
    
    .action-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 2px;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .action-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
    }
    
    .sidebar-content {
      flex: 1;
      overflow: auto;
      padding: 4px 0;
    }
    
    .tree-view {
      padding: 0 4px;
    }
  `]
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

  onNewFile(): void {
    this.newFile.emit();
  }

  onNewFolder(): void {
    this.newFolder.emit();
  }

  onFolderToggle(folder: VertexFolder): void {
    this.folderToggle.emit(folder);
  }
}

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
          <v-folder-tree
            *ngFor="let child of folder.children"
            [folder]="child"
            [activeFileId]="activeFileId"
            (fileSelect)="fileSelect.emit($event)"
            (folderToggle)="folderToggle.emit($event)">
          </v-folder-tree>
          <div 
            class="tree-item file-item"
            *ngFor="let file of folder.children"
            [class.active]="file.id === activeFileId"
            (click)="onFileClick(file)">
            <span class="tree-arrow"></span>
            <span class="tree-icon">{{ getFileIcon(file.language) }}</span>
            <span class="tree-name">{{ file.name }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .folder-tree {
      user-select: none;
    }
    
    .tree-item {
      margin: 1px 0;
    }
    
    .tree-content {
      display: flex;
      align-items: center;
      padding: 2px 8px;
      cursor: pointer;
      border-radius: 2px;
      gap: 4px;
    }
    
    .tree-content:hover {
      background: var(--surface-hover);
    }
    
    .tree-arrow {
      width: 12px;
      font-size: 10px;
      color: var(--text-muted);
    }
    
    .tree-icon {
      font-size: 14px;
    }
    
    .tree-name {
      font-size: 13px;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .tree-children {
      margin-left: 12px;
    }
    
    .file-item .tree-content {
      cursor: pointer;
    }
    
    .file-item.active .tree-content {
      background: var(--primary);
      color: white;
    }
    
    .file-item.active .tree-icon,
    .file-item.active .tree-name {
      color: white;
    }
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

  getFileIcon(language: string): string {
    const iconMap: Record<string, string> = {
      'typescript': '📘',
      'javascript': '📜',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'md': '📝',
      'txt': '📄',
      'xml': '🏷️',
      'yaml': '⚙️',
      'sql': '🗄️',
      'python': '🐍',
      'rust': '🦀',
      'go': '🐹',
      'java': '☕',
      'c': '⚙️',
      'cpp': '⚙️',
      'csharp': '💎'
    };
    return iconMap[language.toLowerCase()] || '📄';
  }
}
