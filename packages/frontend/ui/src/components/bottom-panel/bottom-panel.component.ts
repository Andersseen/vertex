import { Component, signal, input } from "@angular/core";
import { DividerModule } from "primeng/divider";
import { TabsModule } from "primeng/tabs";
import { CommonModule } from "@angular/common";
import { TerminalPanelComponent } from "@vertex/core";

@Component({
  selector: "v-bottom-panel",
  standalone: true,
  imports: [CommonModule, TabsModule, DividerModule, TerminalPanelComponent],
  templateUrl: "./bottom-panel.component.html",
  styleUrls: ["./bottom-panel.component.scss"],
})
export class BottomPanelComponent {
  workspacePath = input<string>("");
  activeTabIndex = signal(3);
  tabs = ["Problems", "Output", "Debug Console", "Terminal"];

  // Mock content for the panels
  problems = [
    {
      type: "error",
      file: "app.ts",
      line: 15,
      message: 'Property "id" is missing in initialization',
    },
    {
      type: "warning",
      file: "app.html",
      line: 3,
      message: 'Unused variable "title"',
    },
  ];

  output = [
    { text: "> Building application...", type: "info" },
    { text: "✓ Compilation successful", type: "success" },
    { text: "✓ Bundle size optimized", type: "success" },
    { text: "Time: 2.3s", type: "info" },
  ];

  debugConsole = [
    { text: "[HMR] Connected", type: "info" },
    { text: "✓ Module app.component loaded", type: "success" },
    { text: "⚠ Performance: Large component tree", type: "warning" },
  ];

  terminal = [
    { text: "➜  ~/vertex", type: "info" },
    { text: "  bun run dev", type: "info" },
    { text: "  Started server on http://localhost:4200", type: "success" },
    { text: "", type: "info" },
    { text: "➜  ~/vertex", type: "info" },
  ];
}
