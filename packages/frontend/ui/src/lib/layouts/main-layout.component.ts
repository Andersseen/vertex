import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SplitterModule } from 'primeng/splitter';

@Component({
  selector: 'v-main-layout',
  standalone: true,
  imports: [CommonModule, SplitterModule],
  template: `
    <div class="h-screen w-screen flex flex-col bg-[var(--p-surface-950)] text-[var(--p-surface-0)] font-sans select-none">
      <!-- Top Toolbar / Header -->
      <header class="h-9 border-b border-[var(--p-surface-800)] flex items-center px-3 bg-[var(--p-surface-900)] shrink-0">
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 bg-[var(--p-primary-600)] rounded flex items-center justify-center">
            <span class="text-[10px] font-bold text-white">V</span>
          </div>
          <span class="text-[11px] font-bold tracking-widest text-[var(--p-surface-400)]">VERTEX <span class="text-[var(--p-primary-500)]">IDE</span></span>
        </div>
        <div class="flex-1"></div>
        <div class="flex items-center gap-4 text-[11px] text-[var(--p-surface-500)]">
          <span class="hover:text-[var(--p-surface-200)] cursor-pointer">File</span>
          <span class="hover:text-[var(--p-surface-200)] cursor-pointer">Edit</span>
          <span class="hover:text-[var(--p-surface-200)] cursor-pointer">Selection</span>
          <span class="hover:text-[var(--p-surface-200)] cursor-pointer">View</span>
        </div>
        <div class="flex-1"></div>
      </header>

      <!-- Main Body -->
      <main class="flex-1 overflow-hidden">
        <p-splitter [style]="{ height: '100%', border: 'none', background: 'transparent' }" [panelSizes]="[20, 80]" [minSizes]="[10, 30]" gutterSize="2">
          <!-- Sidebar Panel -->
          <ng-template pTemplate="content">
            <div class="h-full flex flex-col bg-[var(--p-surface-900)]">
              <ng-content select="[sidebar]"></ng-content>
            </div>
          </ng-template>
          
          <!-- Editor & Bottom Panel -->
          <ng-template pTemplate="content">
            <p-splitter layout="vertical" [style]="{ height: '100%', border: 'none', background: 'transparent' }" [panelSizes]="[75, 25]" [minSizes]="[40, 10]" gutterSize="2">
              <ng-template pTemplate="content">
                <div class="h-full flex flex-col bg-[var(--p-surface-950)]">
                  <ng-content select="[editor]"></ng-content>
                </div>
              </ng-template>
              <ng-template pTemplate="content">
                <div class="h-full border-t border-[var(--p-surface-800)] bg-[var(--p-surface-900)] overflow-auto">
                  <ng-content select="[bottom]"></ng-content>
                </div>
              </ng-template>
            </p-splitter>
          </ng-template>
        </p-splitter>
      </main>

      <!-- Status Bar -->
      <footer class="h-6 shrink-0 border-t border-[var(--p-surface-800)] bg-[var(--p-primary-600)] flex items-center px-3 justify-between text-[10px] text-white/90">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1.5 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors">
            <i class="pi pi-sync text-[10px]"></i>
            <span>Ready</span>
          </div>
          <div class="flex items-center gap-1.5 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors">
            <i class="pi pi-github text-[10px]"></i>
            <span>main*</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors">UTF-8</span>
          <span class="hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors">TypeScript</span>
          <div class="flex items-center gap-1 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors">
            <i class="pi pi-bell text-[10px]"></i>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; width: 100vw; }
    ::ng-deep .p-splitter { background: transparent !important; }
    ::ng-deep .p-splitter-gutter { background: var(--p-surface-800) !important; transition: background 0.2s; }
    ::ng-deep .p-splitter-gutter:hover { background: var(--p-primary-500) !important; }
    ::ng-deep .p-splitter-gutter-handle { display: none; }
  `]
})
export class MainLayoutComponent {}
