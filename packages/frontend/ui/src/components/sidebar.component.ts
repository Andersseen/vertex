import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { TreeModule } from "primeng/tree";
import { TreeNode } from "primeng/api";
import { VertexFile, VertexFolder } from "@vertex/types";

@Component({
  selector: "v-sidebar",
  standalone: true,
  imports: [CommonModule, TreeModule],
  template: `
    <div
      class="h-full flex flex-col bg-[var(--p-surface-900)] border-r border-[var(--p-surface-800)] shadow-lg font-inter"
    >
      <!-- Explorer Header -->
      <div
        class="flex items-center justify-between px-3 h-9 border-b border-[var(--p-surface-800)] bg-[var(--p-surface-950)] shrink-0 shadow-sm"
      >
        <div class="flex items-center gap-2">
          <i class="pi pi-list text-[11px] text-[var(--p-primary-500)]"></i>
          <span
            class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--p-surface-400)] antialiased"
            >Explorer</span
          >
        </div>
        <div class="flex gap-1">
          <button
            class="p-1.5 hover:bg-[var(--p-surface-800)] rounded text-[var(--p-surface-500)] hover:text-[var(--p-surface-200)] transition-all active:scale-90"
            (click)="newFile.emit()"
            title="New File"
          >
            <i class="pi pi-file-plus text-[11px]"></i>
          </button>
          <button
            class="p-1.5 hover:bg-[var(--p-surface-800)] rounded text-[var(--p-surface-500)] hover:text-[var(--p-surface-200)] transition-all active:scale-90"
            (click)="newFolder.emit()"
            title="New Folder"
          >
            <i class="pi pi-folder-plus text-[11px]"></i>
          </button>
          <button
            class="p-1.5 hover:bg-[var(--p-surface-800)] rounded text-[var(--p-surface-500)] hover:text-[var(--p-surface-200)] transition-all active:scale-90"
            (click)="refresh.emit()"
            title="Refresh"
          >
            <i class="pi pi-refresh text-[11px]"></i>
          </button>
        </div>
      </div>

      <!-- File Tree -->
      <div
        class="flex-1 overflow-auto custom-tree-container py-2 selection-none"
      >
        <p-tree
          [value]="treeNodes"
          selectionMode="single"
          [(selection)]="selectedNode"
          (onNodeSelect)="onNodeSelect($event)"
          (onNodeExpand)="onNodeExpand($event)"
          (onNodeCollapse)="onNodeCollapse($event)"
          class="w-full no-border-tree"
          [scrollHeight]="'100%'"
        >
          <ng-template let-node pTemplate="default">
            <div class="flex items-center gap-2 py-1 group w-full truncate">
              <i
                [class]="
                  node.data.customIcon +
                  ' text-[14px] group-hover:scale-110 transition-transform duration-200'
                "
              ></i>
              <span
                class="text-[12px] font-medium truncate group-hover:text-[var(--p-primary-300)] transition-colors antialiased select-none tracking-tight"
                >{{ node.label }}</span
              >
            </div>
          </ng-template>
        </p-tree>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        font-family: "Inter", sans-serif;
      }

      ::ng-deep .no-border-tree.p-tree {
        background: transparent !important;
        border: none !important;
        padding: 2px !important;
      }

      ::ng-deep .p-tree-toggler {
        width: 1.25rem !important;
        height: 1.25rem !important;
        color: var(--p-surface-600) !important;
        transition:
          color 0.2s,
          transform 0.2s !important;
      }

      ::ng-deep .p-tree-toggler:hover {
        color: var(--p-surface-300) !important;
      }

      ::ng-deep .p-treenode-content {
        padding: 0.15rem 0.5rem !important;
        border-radius: 4px !important;
        transition:
          background 0.15s,
          border-left 0.1s !important;
        border-left: 2px solid transparent !important;
      }

      ::ng-deep .p-treenode-content:hover {
        background: var(--p-surface-800) !important;
      }

      ::ng-deep .p-treenode-content.p-highlight {
        background: rgba(var(--p-primary-500-rgb), 0.1) !important;
        border-left: 2px solid var(--p-primary-500) !important;
        color: var(--p-primary-300) !important;
      }

      ::ng-deep .p-treenode-content.p-highlight .p-tree-toggler {
        color: var(--p-primary-400) !important;
      }
    `,
  ],
})
export class SidebarComponent implements OnChanges {
  @Input() workspaceFolder: VertexFolder | null = null;
  @Input() activeFileId: string | null = null;

  @Output() fileSelect = new EventEmitter<VertexFile>();
  @Output() newFile = new EventEmitter<void>();
  @Output() newFolder = new EventEmitter<void>();
  @Output() folderToggle = new EventEmitter<VertexFolder>();
  @Output() refresh = new EventEmitter<void>();

  treeNodes: TreeNode[] = [];
  selectedNode: TreeNode | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["workspaceFolder"] || changes["activeFileId"]) {
      this.updateTreeNodes();
    }
  }

  private updateTreeNodes(): void {
    if (!this.workspaceFolder) {
      this.treeNodes = [];
      return;
    }
    this.treeNodes = [this.mapToTreeNode(this.workspaceFolder)];
  }

  private mapToTreeNode(item: VertexFile | VertexFolder): TreeNode {
    const isFolder = "children" in item;
    const node: TreeNode = {
      key: item.id,
      label: item.name,
      data: {
        ...item,
        customIcon: isFolder
          ? item.isExpanded
            ? "pi pi-folder-open text-yellow-500"
            : "pi pi-folder text-yellow-500"
          : this.getFileIcon(item.language),
      },
      expanded: isFolder ? item.isExpanded : false,
      children: isFolder
        ? item.children.map((child) => this.mapToTreeNode(child))
        : undefined,
      selectable: true,
    };

    if (item.id === this.activeFileId) {
      this.selectedNode = node;
    }

    return node;
  }

  private getFileIcon(language?: string): string {
    const iconMap: Record<string, string> = {
      typescript: "pi pi-file-edit text-blue-400",
      javascript: "pi pi-file-edit text-yellow-400",
      html: "pi pi-code text-orange-500",
      css: "pi pi-palette text-blue-500",
      json: "pi pi-info-circle text-green-400",
      md: "pi pi-file text-slate-400",
      rust: "pi pi-cog text-orange-700",
      python: "pi pi-bolt text-blue-300",
    };
    return (
      iconMap[language?.toLowerCase() || ""] || "pi pi-file text-slate-500"
    );
  }

  onNodeSelect(event: any): void {
    const item = event.node.data;
    if ("children" in item) {
      // Folder - toggle expansion instead of selecting
      event.node.expanded = !event.node.expanded;
      if (event.node.expanded) {
        this.onNodeExpand(event);
      } else {
        this.onNodeCollapse(event);
      }
    } else {
      // File - select it
      this.fileSelect.emit(item as VertexFile);
    }
  }

  onNodeExpand(event: any): void {
    const folder = event.node.data as VertexFolder;
    folder.isExpanded = true;
    this.folderToggle.emit(folder);
  }

  onNodeCollapse(event: any): void {
    const folder = event.node.data as VertexFolder;
    folder.isExpanded = false;
    this.folderToggle.emit(folder);
  }
}
