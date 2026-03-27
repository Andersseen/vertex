import {
  Component,
  input,
  output,
  computed,
  signal,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { TreeModule } from "primeng/tree";
import { TreeNode } from "primeng/api";
import { VertexFile, VertexFolder } from "@vertex/types";

@Component({
  selector: "v-sidebar",
  standalone: true,
  imports: [CommonModule, TreeModule],
  host: {
    class: "vx-h-full vx-w-full block",
  },
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
})
export class SidebarComponent {
  workspaceFolder = input<VertexFolder | null>(null);
  activeFileId = input<string | null>(null);

  fileSelect = output<VertexFile>();
  newFile = output<void>();
  newFolder = output<void>();
  folderToggle = output<VertexFolder>();
  refresh = output<void>();

  treeNodes = computed(() => {
    const folder = this.workspaceFolder();
    if (!folder) return [];
    return [this.mapToTreeNode(folder)];
  });

  selectedNode = signal<TreeNode | null>(null);

  constructor() {
    effect(() => {
      const activeId = this.activeFileId();
      const nodes = this.treeNodes();
      if (!activeId || nodes.length === 0) {
        this.selectedNode.set(null);
        return;
      }

      // Find the node with matching id in the tree
      const findNode = (items: TreeNode[]): TreeNode | null => {
        for (const node of items) {
          if (node.key === activeId) return node;
          if (node.children) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      const foundNode = findNode(nodes);
      this.selectedNode.set(foundNode);
    });
  }

  private mapToTreeNode(item: VertexFile | VertexFolder): TreeNode {
    console.log(`[Sidebar] Mapping item to TreeNode: ${item.name}`);
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
      leaf: !isFolder, // Folder is not a leaf, even if it has no children (lazy loading)
      children: isFolder && item.children && item.children.length > 0
        ? item.children.map((child) => this.mapToTreeNode(child))
        : undefined,
      selectable: true,
    };

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
