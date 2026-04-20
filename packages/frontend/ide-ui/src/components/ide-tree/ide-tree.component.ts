import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { VertexFile, VertexFolder } from '@vertex/types';
import { IdeTreeItemComponent } from './ide-tree-item.component';

@Component({
  selector: 'v-ide-tree',
  standalone: true,
  imports: [CommonModule, IdeTreeItemComponent],
  template: `
    <div class="ide-tree" role="tree" aria-label="File explorer">
      @if (root()) {
        <v-ide-tree-item
          [item]="root()!"
          [level]="0"
          [activeFileId]="activeFileId()"
          [expandedFolders]="expandedFolders()"
          (fileSelect)="fileSelect.emit($event)"
          (folderToggle)="folderToggle.emit($event)"
        />
      } @else {
        <div class="ide-tree__empty">No results found</div>
      }
    </div>
  `,
  styleUrl: './ide-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeTreeComponent {
  readonly root = input<VertexFolder | null>(null);
  readonly activeFileId = input<string | null>(null);
  readonly expandedFolders = input<Set<string>>(new Set());

  readonly fileSelect = output<VertexFile>();
  readonly folderToggle = output<VertexFolder>();
}
