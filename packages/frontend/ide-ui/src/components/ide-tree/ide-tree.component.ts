import {
  Component,
  input,
  output,
  computed,
  viewChild,
  TemplateRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TreeComponent, TreeNode, TreeNodeContext } from 'quartz-headless';
import type { VertexFile, VertexFolder } from '@vertex/types';

function isFolder(item: VertexFile | VertexFolder): item is VertexFolder {
  return 'children' in item;
}

function toTreeNodes(
  items: (VertexFile | VertexFolder)[],
  expandedFolders: Set<string>,
): TreeNode<VertexFile | VertexFolder>[] {
  return items.map((item) => {
    if (isFolder(item)) {
      return {
        id: item.id,
        label: item.name,
        expanded: item.isExpanded || expandedFolders.has(item.id),
        children: toTreeNodes(item.children ?? [], expandedFolders),
        data: item,
      };
    }
    return { id: item.id, label: item.name, data: item };
  });
}

@Component({
  selector: 'v-ide-tree',
  standalone: true,
  imports: [TreeComponent],
  template: `
    @if (treeNodes().length > 0) {
      <qz-tree [nodes]="treeNodes()" [nodeTemplate]="nodeTemplateRef()" />
    } @else {
      <div class="ide-tree__empty">No results found</div>
    }

    <ng-template #nodeTemplate let-node="node" let-level="level" let-expanded="expanded" let-toggle="toggle">
      <div
        class="ide-tree-item"
        [class.ide-tree-item--folder]="nodeIsFolder(node)"
        [class.ide-tree-item--file]="!nodeIsFolder(node)"
        [class.ide-tree-item--active]="!nodeIsFolder(node) && getData(node).id === activeFileId()"
        [style.padding-left.px]="level * 14 + 8"
        (click)="onNodeClick(getData(node), toggle)"
      >
        @if (nodeIsFolder(node)) {
          <span class="ide-tree-item__chevron" [class.ide-tree-item__chevron--open]="expanded">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M3 2L6.5 5L3 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        } @else {
          <span class="ide-tree-item__spacer"></span>
        }

        <span class="ide-tree-item__icon" aria-hidden="true">
          @if (nodeIsFolder(node)) {
            @if (expanded) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>
              </svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
              </svg>
            }
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              @switch (fileIconType(getData(node))) {
                @case ('code') {
                  <polyline points="16 18 22 12 16 6"/>
                  <polyline points="8 6 2 12 8 18"/>
                }
                @case ('style') {
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                }
                @case ('data') {
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                }
                @default {
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                }
              }
            </svg>
          }
        </span>

        <span class="ide-tree-item__label">{{ node.label }}</span>
      </div>
    </ng-template>
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

  protected readonly nodeTemplateRef =
    viewChild.required<TemplateRef<TreeNodeContext>>('nodeTemplate');

  protected readonly treeNodes = computed((): TreeNode<VertexFile | VertexFolder>[] => {
    const root = this.root();
    if (!root) return [];
    return toTreeNodes([root], this.expandedFolders());
  });

  protected nodeIsFolder(node: TreeNode<unknown>): boolean {
    return isFolder(node.data as VertexFile | VertexFolder);
  }

  protected getData(node: TreeNode<unknown>): VertexFile | VertexFolder {
    return node.data as VertexFile | VertexFolder;
  }

  protected fileIconType(item: VertexFile | VertexFolder): string {
    if (isFolder(item)) return 'folder';
    const lang = item.language?.toLowerCase() ?? '';
    if (['typescript', 'javascript', 'tsx', 'jsx', 'html', 'rust', 'go', 'python', 'sh'].includes(lang))
      return 'code';
    if (['css', 'scss', 'less'].includes(lang)) return 'style';
    if (['json', 'yaml', 'yml', 'toml'].includes(lang)) return 'data';
    return 'default';
  }

  protected onNodeClick(item: VertexFile | VertexFolder, toggle: () => void): void {
    if (isFolder(item)) {
      toggle();
      this.folderToggle.emit(item);
    } else {
      this.fileSelect.emit(item);
    }
  }
}
