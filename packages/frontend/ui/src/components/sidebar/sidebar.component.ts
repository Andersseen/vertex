import {
  Component,
  input,
  output,
  signal,
  effect,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { VertexFile, VertexFolder } from "@vertex/types";
import { IdeTreeComponent, IdeButtonComponent } from "@vertex/ide-ui";

@Component({
  selector: "v-sidebar",
  imports: [CommonModule, IdeTreeComponent, IdeButtonComponent],
  host: {
    class: "vx-h-full vx-w-full block",
  },
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly workspaceFolder = input<VertexFolder | null>(null);
  readonly activeFileId = input<string | null>(null);

  readonly fileSelect = output<VertexFile>();
  readonly newFile = output<void>();
  readonly newFolder = output<void>();
  readonly folderToggle = output<VertexFolder>();
  readonly refresh = output<void>();
  readonly rename = output<void>();
  readonly delete = output<void>();

  protected readonly expandedFolders = signal<Set<string>>(new Set());

  constructor() {
    effect(() => {
      const folder = this.workspaceFolder();
      if (!folder) {
        this.expandedFolders.set(new Set());
        return;
      }
      // Auto-expand root
      this.expandedFolders.update((set) => {
        const next = new Set(set);
        next.add(folder.id);
        return next;
      });
    });
  }

  protected onFolderToggle(folder: VertexFolder): void {
    folder.isExpanded = !folder.isExpanded;
    this.expandedFolders.update((set) => {
      const next = new Set(set);
      if (folder.isExpanded) {
        next.add(folder.id);
      } else {
        next.delete(folder.id);
      }
      return next;
    });
    this.folderToggle.emit(folder);
  }
}
