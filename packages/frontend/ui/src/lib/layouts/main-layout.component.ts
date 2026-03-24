import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SplitterModule } from 'primeng/splitter';
import { ToolbarModule } from 'primeng/toolbar';

@Component({
  selector: 'v-main-layout',
  standalone: true,
  imports: [CommonModule, SplitterModule, ToolbarModule],
  template: `
    <div class="h-screen w-screen flex flex-col bg-[var(--p-surface-950)] text-[var(--p-surface-0)] select-none overflow-hidden font-inter">
      <!-- Top Toolbar -->
      <p-toolbar class="h-10 shrink-0 border-b border-[var(--p-surface-800)] bg-[var(--p-surface-900)] p-0 shadow-sm z-20">
        <ng-template pTemplate="start">
          <div class="flex items-center gap-3 pl-3">
            <div class="w-6 h-6 bg-gradient-to-br from-[var(--p-primary-500)] to-[var(--p-primary-700)] rounded shadow-inner flex items-center justify-center">
              <span class="text-[11px] font-extrabold text-white tracking-tighter">V</span>
            </div>
            <span class="text-[11px] font-bold tracking-[0.2em] text-[var(--p-surface-300)] uppercase antialiased">Vertex <span class="text-[var(--p-primary-500)]">IDE</span></span>
          </div>
          <div class="w-[1px] h-4 bg-[var(--p-surface-700)] mx-4"></div>
          <div class="flex items-center gap-1 text-[12px] text-[var(--p-surface-400)] font-medium">
            <button class="hover:text-[var(--p-surface-100)] hover:bg-[var(--p-surface-800)] px-3 py-1.5 rounded transition-all duration-200 active:scale-95">File</button>
            <button class="hover:text-[var(--p-surface-100)] hover:bg-[var(--p-surface-800)] px-3 py-1.5 rounded transition-all duration-200 active:scale-95">Edit</button>
            <button class="hover:text-[var(--p-surface-100)] hover:bg-[var(--p-surface-800)] px-3 py-1.5 rounded transition-all duration-200 active:scale-95">Selection</button>
            <button class="hover:text-[var(--p-surface-100)] hover:bg-[var(--p-surface-800)] px-3 py-1.5 rounded transition-all duration-200 active:scale-95">View</button>
            <button class="hover:text-[var(--p-surface-100)] hover:bg-[var(--p-surface-800)] px-3 py-1.5 rounded transition-all duration-200 active:scale-95">Go</button>
          </div>
        </ng-template>

        <ng-template pTemplate="center">
          <div class="flex items-center bg-[var(--p-surface-950)] border border-[var(--p-surface-700)] rounded-md px-3 py-1 gap-2 w-96 hover:border-[var(--p-surface-500)] transition-all cursor-pointer group shadow-sm">
            <i class="pi pi-search text-[11px] text-[var(--p-surface-500)] group-hover:text-[var(--p-surface-300)]"></i>
            <span class="text-[11px] text-[var(--p-surface-500)] group-hover:text-[var(--p-surface-300)] flex-1">Search components, files, actions...</span>
            <span class="text-[9px] text-[var(--p-surface-600)] bg-[var(--p-surface-800)] px-1.5 py-0.5 rounded border border-[var(--p-surface-700)]">⌘K</span>
          </div>
        </ng-template>

        <ng-template pTemplate="end">
          <div class="flex items-center gap-2 pr-3">
            <button class="p-2 hover:bg-[var(--p-surface-800)] rounded-full text-[var(--p-surface-400)] hover:text-[var(--p-surface-100)] transition-all">
              <i class="pi pi-bell text-[12px]"></i>
            </button>
            <button class="p-2 hover:bg-[var(--p-surface-800)] rounded-full text-[var(--p-surface-400)] hover:text-[var(--p-surface-100)] transition-all">
              <i class="pi pi-cog text-[12px]"></i>
            </button>
            <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-[var(--p-surface-800)] to-[var(--p-surface-700)] flex items-center justify-center border border-[var(--p-surface-600)] cursor-pointer hover:border-[var(--p-primary-500)] transition-all ml-1 shadow-sm">
              <i class="pi pi-user text-[11px] text-[var(--p-surface-300)]"></i>
            </div>
          </div>
        </ng-template>
      </p-toolbar>

      <!-- Main Body -->
      <main class="flex-1 overflow-hidden relative">
        <p-splitter [style]="{ height: '100%', border: 'none', background: 'transparent' }" [panelSizes]="[18, 82]" [minSizes]="[10, 30]" gutterSize="1">
          <!-- Sidebar Panel -->
          <ng-template pTemplate="content">
            <div class="h-full flex flex-col bg-[var(--p-surface-900)] border-r border-[var(--p-surface-800)]">
              <ng-content select="[sidebar]"></ng-content>
            </div>
          </ng-template>
          
          <!-- Editor & Bottom Panel -->
          <ng-template pTemplate="content">
            <p-splitter layout="vertical" [style]="{ height: '100%', border: 'none', background: 'transparent' }" [panelSizes]="[72, 28]" [minSizes]="[40, 10]" gutterSize="1">
              <ng-template pTemplate="content">
                <div class="h-full flex flex-col bg-[var(--p-surface-950)]">
                  <ng-content select="[editor]"></ng-content>
                </div>
              </ng-template>
              <ng-template pTemplate="content">
                <div class="h-full bg-[var(--p-surface-900)] overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] border-t border-[var(--p-surface-800)]">
                  <ng-content select="[bottom]"></ng-content>
                </div>
              </ng-template>
            </p-splitter>
          </ng-template>
        </p-splitter>
      </main>

      <!-- Status Bar -->
      <footer class="h-6 shrink-0 border-t border-[var(--p-surface-800)] bg-[var(--p-primary-600)] flex items-center px-2 justify-between text-[11px] text-white/95 font-medium shadow-[0_-2px_10px_rgba(var(--p-primary-700),0.2)]">
        <div class="flex items-center gap-1">
          <div class="flex items-center gap-2 hover:bg-white/10 px-2 py-0.5 rounded cursor-pointer transition-all active:bg-white/20 group">
            <i class="pi pi-sync text-[10px] animate-spin-slow group-hover:scale-110 duration-200"></i>
            <span class="antialiased">Ready</span>
          </div>
          <div class="w-[1px] h-3 bg-white/20 mx-1"></div>
          <div class="flex items-center gap-2 hover:bg-white/10 px-2 py-0.5 rounded cursor-pointer transition-all active:bg-white/20 group">
            <i class="pi pi-github text-[11px] group-hover:scale-110 duration-200"></i>
            <span class="antialiased font-semibold tracking-tight">main</span>
            <span class="text-white/60 font-normal">*</span>
          </div>
          <div class="w-[1px] h-3 bg-white/20 mx-1"></div>
          <div class="flex items-center gap-1.5 hover:bg-white/10 px-2 py-0.5 rounded cursor-pointer transition-all active:bg-white/20 group">
            <i class="pi pi-exclamation-triangle text-[10px] text-amber-200"></i>
            <span>0</span>
            <i class="pi pi-times-circle text-[10px] text-red-200"></i>
            <span>0</span>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <div class="px-3 py-0.5 hover:bg-white/10 rounded cursor-pointer transition-all antialiased">Spaces: 2</div>
          <div class="w-[1px] h-3 bg-white/20 mx-1"></div>
          <div class="px-3 py-0.5 hover:bg-white/10 rounded cursor-pointer transition-all antialiased">UTF-8</div>
          <div class="w-[1px] h-3 bg-white/20 mx-1"></div>
          <div class="px-3 py-0.5 hover:bg-white/10 rounded cursor-pointer transition-all antialiased flex items-center gap-1.5 font-bold">
             <i class="pi pi-code text-[11px]"></i>
             <span>TypeScript</span>
          </div>
          <div class="w-[1px] h-3 bg-white/20 mx-1"></div>
          <div class="flex items-center justify-center w-8 h-full hover:bg-white/10 cursor-pointer transition-all">
            <i class="pi pi-bell text-[10px]"></i>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; width: 100vw; font-family: 'Inter', system-ui, sans-serif; }
    ::ng-deep .p-toolbar { background: var(--p-surface-900) !important; border-radius: 0 !important; }
    ::ng-deep .p-splitter { background: transparent !important; }
    ::ng-deep .p-splitter-gutter { background: var(--p-surface-800) !important; transition: background 0.2s, width 0.2s; position: relative; }
    ::ng-deep .p-splitter-gutter:hover { background: var(--p-primary-500) !important; z-index: 50; }
    ::ng-deep .p-splitter-gutter:hover::after { content: ''; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 2px; height: 30px; background: rgba(255,255,255,0.4); border-radius: 1px; }
    ::ng-deep .p-splitter-gutter-handle { display: none; }
    .animate-spin-slow { animation: spin 4s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class MainLayoutComponent {}
