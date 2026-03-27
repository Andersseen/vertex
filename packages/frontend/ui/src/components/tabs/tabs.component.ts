import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VertexFile } from '@vertex/types';

@Component({
  selector: 'v-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tabs.component.html',
  styleUrls: ["./tabs.component.scss"],
})
export class TabsComponent {
  @Input() files: VertexFile[] = [];
  @Input() activeFileId: string | null = null;
  @Output() newTab = new EventEmitter<void>();
  @Output() tabSelect = new EventEmitter<VertexFile>();
  @Output() tabClose = new EventEmitter<VertexFile>();

  trackById(index: number, item: VertexFile): string {
    return item.id;
  }

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
