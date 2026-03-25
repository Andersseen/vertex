import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VertexFile } from '@vertex/types';

@Component({
  selector: 'v-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tabs-container bg-[var(--p-surface-900)] border-b border-[var(--p-surface-800)]">
      <div class="tabs-header-vx flex-vx items-center-vx overflow-x-auto scrollbar-hide">
        <div 
          class="tab-item-vx flex-vx items-center-vx gap-vx px-4 h-full-vx cursor-pointer border-r border-[var(--p-surface-800)] relative transition-all duration-200 group"
          *ngFor="let file of files; let i = index"
          [class.active]="file.id === activeFileId"
          (click)="onTabClick(file)">
          <i [class]="getFileIcon(file.language) + ' text-[12px] opacity-70 group-hover:opacity-100'"></i>
          <span class="tab-name text-[11px] font-bold text-[var(--p-surface-400)] group-hover:text-[var(--p-surface-100)] transition-colors antialiased uppercase tracking-tight">{{ file.name }}</span>
          
          <div class="w-1.5 h-1.5 rounded-full bg-[var(--p-primary-500)] ml-1 animate-pulse" *ngIf="file.isDirty"></div>

          <button 
            class="tab-close ml-2 p-1 rounded hover:bg-[var(--p-surface-700)] text-[var(--p-surface-500)] hover:text-[var(--p-surface-100)] opacity-0 group-hover:opacity-100 transition-all flex-vx items-center-vx justify-center-vx"
            (click)="onTabClose(file, $event)"
            *ngIf="files.length > 1">
            <i class="pi pi-times text-[9px]"></i>
          </button>
          
          <div class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[var(--p-primary-500)] shadow-[0_0_8px_rgba(99,102,241,0.5)]" *ngIf="file.id === activeFileId"></div>
        </div>
        <button class="px-4 h-full-vx text-[var(--p-surface-500)] hover:text-[var(--p-surface-100)] hover:bg-[var(--p-surface-800)] transition-all flex-vx items-center-vx" (click)="onNewTab()">
          <i class="pi pi-plus text-[11px]"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .tabs-header-vx {
      height: 36px;
      display: flex !important;
      align-items: center !important;
    }
    .tab-item-vx {
      display: flex !important;
      align-items: center !important;
      height: 100% !important;
    }
    .tab-item-vx.active {
      background: var(--p-surface-950);
    }
    .tab-item-vx.active .tab-name {
      color: var(--p-surface-100);
    }
    .flex-vx { display: flex !important; }
    .items-center-vx { align-items: center !important; }
    .justify-center-vx { justify-content: center !important; }
    .gap-vx { gap: 0.5rem !important; }
    .h-full-vx { height: 100% !important; }
    
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
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
