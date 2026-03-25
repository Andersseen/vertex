import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VertexFile } from '@vertex/types';

@Component({
  selector: 'v-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tabs-container">
      <div class="tabs-header-vx">
        <div 
          class="tab-item-vx group"
          *ngFor="let file of files; let i = index"
          [class.active]="file.id === activeFileId"
          (click)="onTabClick(file)">
          <i [class]="getFileIcon(file.language) + ' text-[12px] opacity-70 group-hover:opacity-100'"></i>
          <span class="tab-name">{{ file.name }}</span>
          
          <div class="modified-dot animate-pulse" *ngIf="file.isDirty"></div>
 
          <button 
            class="tab-close"
            (click)="onTabClose(file, $event)"
            *ngIf="files.length > 1">
            <i class="pi pi-times text-[9px]"></i>
          </button>
        </div>
        <button class="new-tab-btn" (click)="onNewTab()">
          <i class="pi pi-plus text-[11px]"></i>
        </button>
      </div>
    </div>
  `,
  styleUrls: ["./tabs.component.scss"],
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

  getFileIcon(language?: string): string {
    const iconMap: Record<string, string> = {
      'typescript': 'pi pi-file-edit text-blue-400',
      'javascript': 'pi pi-file-edit text-yellow-400',
      'html': 'pi pi-code text-orange-500',
      'css': 'pi pi-palette text-blue-500',
      'json': 'pi pi-info-circle text-green-400',
      'md': 'pi pi-file text-slate-400',
      'rust': 'pi pi-cog text-orange-700',
      'python': 'pi pi-bolt text-blue-300'
    };
    return iconMap[language?.toLowerCase() || ''] || 'pi pi-file text-slate-500';
  }
}
