import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { DividerModule } from "primeng/divider";
import { TabsModule } from "primeng/tabs";

@Component({
  selector: "v-bottom-panel",
  standalone: true,
  imports: [CommonModule, TabsModule, DividerModule],
  template: `
    <div class="bottom-panel h-full flex flex-col font-mono">
      <div class="bottom-panel-header shrink-0">
        <div class="flex items-center h-full px-2 gap-1">
          <button
            *ngFor="let tab of tabs; let i = index"
            (click)="activeTabIndex = i"
            [class.active]="activeTabIndex === i"
            class="tab-item"
          >
            <span class="tab-label">{{ tab }}</span>
          </button>
        </div>
        <div class="flex-1"></div>
        <div
          class="flex items-center px-4 gap-3 text-[10px] text-[var(--p-surface-500)] font-bold uppercase tracking-widest opacity-60"
        >
          <span>Terminal</span>
          <button class="hover:text-[var(--p-surface-200)] transition-all">
            <i class="pi pi-times text-[9px]"></i>
          </button>
        </div>
      </div>

      <div class="bottom-panel-content flex-1 overflow-auto p-3">
        <!-- Problems Tab -->
        <div *ngIf="activeTabIndex === 0" class="console-content fade-in">
          <div
            *ngFor="let prob of problems"
            class="flex items-start gap-2 py-1 hover:bg-[var(--p-surface-800)] px-2 rounded cursor-pointer transition-colors"
          >
            <i
              [class]="
                prob.type === 'error'
                  ? 'pi pi-times-circle text-red-400'
                  : 'pi pi-exclamation-triangle text-amber-400'
              "
              class="text-[12px] mt-0.5"
            ></i>
            <div class="flex-1">
              <span class="text-[12px] text-[var(--p-surface-300)]">{{
                prob.message
              }}</span>
              <span class="text-[10px] text-[var(--p-surface-500)] ml-2"
                >{{ prob.file }}:{{ prob.line }}</span
              >
            </div>
          </div>
          <div
            *ngIf="problems.length === 0"
            class="text-[12px] text-[var(--p-surface-500)] p-2"
          >
            No problems detected
          </div>
        </div>

        <!-- Output Tab -->
        <div *ngIf="activeTabIndex === 1" class="console-content fade-in">
          <div *ngFor="let out of output" class="py-0.5">
            <span
              [class]="
                out.type === 'success'
                  ? 'text-green-400'
                  : out.type === 'warning'
                    ? 'text-amber-400'
                    : 'text-[var(--p-surface-400)]'
              "
              class="text-[11px] font-mono"
              >{{ out.text }}</span
            >
          </div>
        </div>

        <!-- Debug Console Tab -->
        <div *ngIf="activeTabIndex === 2" class="console-content fade-in">
          <div *ngFor="let dbg of debugConsole" class="py-0.5">
            <span
              [class]="
                dbg.type === 'success'
                  ? 'text-green-400'
                  : dbg.type === 'warning'
                    ? 'text-amber-400'
                    : 'text-blue-400'
              "
              class="text-[11px] font-mono"
              >{{ dbg.text }}</span
            >
          </div>
        </div>

        <!-- Terminal Tab -->
        <div *ngIf="activeTabIndex === 3" class="console-content fade-in">
          <div *ngFor="let term of terminal" class="py-0.5">
            <span class="text-[11px] font-mono text-[var(--p-surface-300)]">{{
              term.text
            }}</span>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-[11px] text-[var(--p-primary-500)]">➜</span>
            <span
              class="text-[11px] font-mono text-[var(--p-surface-400)] animate-pulse"
              >_</span
            >
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ["./bottom-panel.component.scss"],
})
export class BottomPanelComponent {
  activeTabIndex = 0;
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
