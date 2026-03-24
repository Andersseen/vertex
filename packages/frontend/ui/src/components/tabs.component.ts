import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VertexFile } from '@vertex/types';

@Component({
  selector: 'v-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tabs-container">
      <div class="tabs-header">
        <div 
          class="tab-item"
          *ngFor="let file of files; let i = index"
          [class.active]="file.id === activeFileId"
          [class.dirty]="file.isDirty"
          (click)="onTabClick(file)">
          <span class="tab-icon">{{ getFileIcon(file.language) }}</span>
          <span class="tab-name">{{ file.name }}</span>
          <button 
            class="tab-close"
            (click)="onTabClose(file, $event)"
            *ngIf="files.length > 1">
            ✕
          </button>
        </div>
        <button class="tab-new" (click)="onNewTab()">+</button>
      </div>
    </div>
  `,
  styles: [`
    .tabs-container {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    
    .tabs-header {
      display: flex;
      align-items: center;
      height: 36px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    
    .tabs-header::-webkit-scrollbar {
      display: none;
    }
    
    .tab-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 12px;
      height: 100%;
      cursor: pointer;
      border-right: 1px solid var(--border);
      background: var(--surface);
      transition: background-color 0.2s;
      min-width: 0;
      max-width: 200px;
    }
    
    .tab-item:hover {
      background: var(--surface-hover);
    }
    
    .tab-item.active {
      background: var(--surface-active);
      color: var(--text);
    }
    
    .tab-item.dirty .tab-name::after {
      content: '●';
      margin-left: 4px;
      color: var(--primary);
      font-size: 10px;
    }
    
    .tab-icon {
      font-size: 14px;
      flex-shrink: 0;
    }
    
    .tab-name {
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    
    .tab-close {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 2px;
      border-radius: 2px;
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .tab-item:hover .tab-close {
      opacity: 1;
    }
    
    .tab-close:hover {
      background: var(--surface-hover);
      color: var(--text);
    }
    
    .tab-new {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0 12px;
      height: 100%;
      font-size: 16px;
      transition: background-color 0.2s;
    }
    
    .tab-new:hover {
      background: var(--surface-hover);
      color: var(--text);
    }
  `]
})
export class TabsComponent {
  @Input() files: VertexFile[] = [];
  @Input() activeFileId: string | null = null;
  @Output() tabSelect = new EventEmitter<VertexFile>();
  @Output() tabClose = new EventEmitter<VertexFile>();
  @Output() newTab = new EventEmitter<void>();

  onTabClick(file: VertexFile): void {
    this.tabSelect.emit(file);
  }

  onTabClose(file: VertexFile, event: MouseEvent): void {
    event.stopPropagation();
    this.tabClose.emit(file);
  }

  onNewTab(): void {
    this.newTab.emit();
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
