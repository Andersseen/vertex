import { Component, signal, input, ChangeDetectionStrategy } from "@angular/core";
import { TerminalPanelComponent } from "@vertex/core";
import { IdeTabsComponent } from "@vertex/ide-ui";

@Component({
  selector: "v-bottom-panel",
  standalone: true,
  imports: [TerminalPanelComponent, IdeTabsComponent],
  templateUrl: "./bottom-panel.component.html",
  styleUrls: ["./bottom-panel.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomPanelComponent {
  readonly workspacePath = input<string>("");
  readonly activeTab = signal("Terminal");

  readonly tabs = [
    { id: "Problems", label: "Problems" },
    { id: "Output", label: "Output" },
    { id: "Debug Console", label: "Debug Console" },
    { id: "Terminal", label: "Terminal" },
  ];

  // Mock content for the panels
  readonly problems = [
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

  readonly output = [
    { text: "> Building application...", type: "info" },
    { text: "✓ Compilation successful", type: "success" },
    { text: "✓ Bundle size optimized", type: "success" },
    { text: "Time: 2.3s", type: "info" },
  ];

  readonly debugConsole = [
    { text: "[HMR] Connected", type: "info" },
    { text: "✓ Module app.component loaded", type: "success" },
    { text: "⚠ Performance: Large component tree", type: "warning" },
  ];

  readonly terminal = [
    { text: "➜  ~/vertex", type: "info" },
    { text: "  bun run dev", type: "info" },
    { text: "  Started server on http://localhost:4200", type: "success" },
    { text: "", type: "info" },
    { text: "➜  ~/vertex", type: "info" },
  ];
}
