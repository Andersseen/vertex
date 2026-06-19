import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { VertexFile } from "@vertex/types";

@Component({
  selector: "v-tabs",
  imports: [CommonModule],
  templateUrl: "./tabs.component.html",
  styleUrls: ["./tabs.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  // Inputs
  readonly files = input<VertexFile[]>([]);
  readonly activeFileId = input<string | null>(null);

  // Outputs
  readonly tabSelect = output<VertexFile>();
  readonly tabClose = output<VertexFile>();
  readonly newTab = output<void>();

  protected selectTab(file: VertexFile): void {
    this.tabSelect.emit(file);
  }

  protected closeTab(file: VertexFile, event: MouseEvent): void {
    event.stopPropagation();
    this.tabClose.emit(file);
  }

  protected createNewTab(): void {
    this.newTab.emit();
  }

  protected getFileIcon(language?: string): string {
    const iconMap: Record<string, string> = {
      typescript: "TS",
      javascript: "JS",
      html: "HTML",
      css: "CSS",
      json: "JSON",
      md: "MD",
      rust: "RS",
      python: "PY",
    };
    return iconMap[language?.toLowerCase() || ""] || "FILE";
  }

  protected getIconColor(language?: string): string {
    const colorMap: Record<string, string> = {
      typescript: "#60a5fa",
      javascript: "#facc15",
      html: "#f97316",
      css: "#3b82f6",
      json: "#4ade80",
      md: "#94a3b8",
      rust: "#c2410c",
      python: "#93c5fd",
    };
    return colorMap[language?.toLowerCase() || ""] || "#64748b";
  }

  protected trackById(index: number, item: VertexFile): string {
    return item.id;
  }
}
