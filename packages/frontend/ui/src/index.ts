import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { VertexFile } from "@vertex/types";

@Component({
  selector: "v-file-tree",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="file-tree">
      <div class="file-header">
        <h3>Explorer</h3>
      </div>
      <div class="file-content">
        <div
          class="file-item"
          *ngFor="let file of files"
          [class.active]="file.id === activeFileId"
          (click)="onFileSelect(file)"
        >
          <span class="file-icon">📄</span>
          <span class="file-name">{{ file.name }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .file-tree {
        height: 100%;
        background: var(--surface);
        border-right: 1px solid var(--border);
      }

      .file-header {
        padding: 8px 12px;
        border-bottom: 1px solid var(--border);
        background: var(--surface-hover);
      }

      .file-header h3 {
        margin: 0;
        font-size: 12px;
        font-weight: 600;
        color: var(--text);
      }

      .file-content {
        padding: 4px 0;
      }

      .file-item {
        display: flex;
        align-items: center;
        padding: 4px 12px;
        cursor: pointer;
        gap: 8px;
      }

      .file-item:hover {
        background: var(--surface-hover);
      }

      .file-item.active {
        background: var(--primary);
        color: white;
      }

      .file-icon {
        font-size: 14px;
      }

      .file-name {
        font-size: 13px;
        flex: 1;
      }
    `,
  ],
})
export class FileTreeComponent {
  @Input() files: VertexFile[] = [];
  @Input() activeFileId: string | null = null;
  @Output() fileSelect = new EventEmitter<VertexFile>();

  onFileSelect(file: VertexFile): void {
    this.fileSelect.emit(file);
  }
}

export { EditorComponent } from "./components/editor.component";
export { TabsComponent } from "./components/tabs.component";
export {
  SidebarComponent,
  FolderTreeComponent,
} from "./components/sidebar.component";
export {
  MainLayoutComponent
} from './lib/layouts/main-layout.component';
