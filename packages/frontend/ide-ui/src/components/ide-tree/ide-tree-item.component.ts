import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { VertexFile, VertexFolder } from '@vertex/types';

function isFolder(item: VertexFile | VertexFolder): item is VertexFolder {
  return 'children' in item;
}

@Component({
  selector: 'ide-tree-item',
  standalone: true,
  imports: [CommonModule, IdeTreeItemComponent],
  template: `
    <div
      class="ide-tree-item"
      [class.ide-tree-item--folder]="isFolder(item())"
      [class.ide-tree-item--file]="!isFolder(item())"
      [class.ide-tree-item--active]="isActive()"
      [style.padding-left.px]="level() * 14 + 8"
      (click)="onClick($event)"
    >
      <!-- Chevron for folders -->
      @if (isFolder(item())) {
        <span class="ide-tree-item__chevron" [class.ide-tree-item__chevron--open]="isExpanded()">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M3 2L6.5 5L3 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      } @else {
        <span class="ide-tree-item__spacer"></span>
      }

      <!-- Icon -->
      <span class="ide-tree-item__icon" [attr.aria-hidden]="true">
        @if (isFolder(item())) {
          @if (isExpanded()) {
            <!-- Folder open -->
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>
            </svg>
          } @else {
            <!-- Folder closed -->
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
            </svg>
          }
        } @else {
          <!-- File icon based on language -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            @switch (fileIconType()) {
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
              @case ('text') {
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              }
              @default {
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              }
            }
          </svg>
        }
      </span>

      <!-- Label -->
      <span class="ide-tree-item__label">{{ item().name }}</span>
    </div>

    <!-- Recursive children -->
    @if (folderChildren().length > 0 && isExpanded()) {
      @for (child of folderChildren(); track child.id) {
        <ide-tree-item
          [item]="child"
          [level]="level() + 1"
          [activeFileId]="activeFileId()"
          [expandedFolders]="expandedFolders()"
          (fileSelect)="fileSelect.emit($event)"
          (folderToggle)="folderToggle.emit($event)"
        />
      }
    }
  `,
  styleUrl: './ide-tree-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeTreeItemComponent {
  readonly item = input.required<VertexFile | VertexFolder>();
  readonly level = input<number>(0);
  readonly activeFileId = input<string | null>(null);
  readonly expandedFolders = input<Set<string>>(new Set());

  readonly fileSelect = output<VertexFile>();
  readonly folderToggle = output<VertexFolder>();

  protected isFolder = isFolder;

  protected folderChildren = computed(() => {
    const it = this.item();
    return isFolder(it) ? (it.children ?? []) : [];
  });

  protected isExpanded = () => {
    const it = this.item();
    return isFolder(it) && (it.isExpanded || this.expandedFolders().has(it.id));
  };

  protected isActive = () => {
    const it = this.item();
    return !isFolder(it) && it.id === this.activeFileId();
  };

  protected fileIconType = () => {
    const it = this.item();
    if (isFolder(it)) return 'folder';
    const lang = it.language?.toLowerCase() ?? '';
    if (['typescript', 'javascript', 'tsx', 'jsx', 'html', 'rust', 'go', 'python', 'sh'].includes(lang)) return 'code';
    if (['css', 'scss', 'less'].includes(lang)) return 'style';
    if (['json', 'yaml', 'yml', 'toml'].includes(lang)) return 'data';
    if (['md', 'txt', 'text'].includes(lang)) return 'text';
    return 'default';
  };

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    const it = this.item();
    if (isFolder(it)) {
      this.folderToggle.emit(it);
    } else {
      this.fileSelect.emit(it);
    }
  }
}
