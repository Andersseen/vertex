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
        <div class="flex items-center px-4 gap-3 text-[10px] text-[var(--p-surface-500)] font-bold uppercase tracking-widest opacity-60">
          <span>Terminal</span>
          <button class="hover:text-[var(--p-surface-200)] transition-all">
            <i class="pi pi-times text-[9px]"></i>
          </button>
        </div>
      </div>
      
      <div class="bottom-panel-content flex-1 overflow-auto">
        <div *ngIf="activeTabIndex === 0" class="console-content fade-in">Problems content here</div>
        <div *ngIf="activeTabIndex === 1" class="console-content fade-in">Output content here</div>
        <div *ngIf="activeTabIndex === 2" class="console-content fade-in">Debug Console content here</div>
        <div *ngIf="activeTabIndex === 3" class="console-content fade-in">Terminal content here</div>
      </div>
    </div>
  `,
  styleUrls: ["./bottom-panel.component.scss"],
})
export class BottomPanelComponent {
  activeTabIndex = 0;
  tabs = ["Problems", "Output", "Debug Console", "Terminal"];
}
