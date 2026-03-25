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
    <div class="sidebar-container">
      <!-- Sidebar Header -->
      <div class="sidebar-header-vx">
        <div class="vx-flex vx-items-center vx-gap-2">
          <i class="pi pi-bars text-[12px] text-[var(--p-surface-400)]"></i>
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--p-surface-200)] antialiased">Explorer</span>
        </div>
        <div class="vx-flex vx-items-center vx-gap-1">
          <button
            class="p-1 hover:bg-[var(--p-surface-800)] rounded text-[var(--p-surface-400)] hover:text-[var(--p-surface-100)] transition-all vx-flex vx-items-center vx-justify-center"
            (click)="newFile.emit()"
            title="New File"
          >
            <i class="pi pi-file-plus text-[11px]"></i>
          </button>
          <button
            class="p-1 hover:bg-[var(--p-surface-800)] rounded text-[var(--p-surface-400)] hover:text-[var(--p-surface-100)] transition-all vx-flex vx-items-center vx-justify-center"
            (click)="newFolder.emit()"
            title="New Folder"
          >
            <i class="pi pi-folder-plus text-[11px]"></i>
          </button>
          <button
            class="p-1 hover:bg-[var(--p-surface-800)] rounded text-[var(--p-surface-400)] hover:text-[var(--p-surface-100)] transition-all vx-flex vx-items-center vx-justify-center"
            (click)="refresh.emit()"
            title="Refresh"
          >
            <i class="pi pi-refresh text-[11px]"></i>
          </button>
        </div>
      </div>
      
      <!-- File Tree -->
      <div class="sidebar-content custom-scrollbar-vx">
        <p-tree 
          [value]="treeNodes" 
          selectionMode="single" 
          [(selection)]="selectedNode"
          (onNodeSelect)="onNodeSelect($event)"
          (onNodeExpand)="onNodeExpand($event)"
          (onNodeCollapse)="onNodeCollapse($event)"
          class="w-full border-none p-0"
          [scrollHeight]="'100%'"
        >
          <ng-template let-node pTemplate="default">
            <div class="vx-flex vx-items-center vx-gap-2 py-0.5">
              <i [class]="node.data.customIcon + ' text-[13px] opacity-70'"></i>
              <span class="text-[12px] tracking-tight">{{node.label}}</span>
            </div>
          </ng-template>
        </p-tree>
      </div>
    </div>
  `,
  styleUrls: ["./sidebar.component.scss"],
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
