import { Component, Input, Output, EventEmitter, AfterViewInit, ViewChild, ElementRef, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, basicSetup } from 'codemirror';
import { keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { rust } from '@codemirror/lang-rust';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { VertexFile } from '@vertex/types';

@Component({
  selector: 'v-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-container h-full w-full flex flex-col bg-[var(--p-surface-950)] font-inter">
      <!-- Editor Header / Tabs -->
      <div class="editor-header-vx flex-vx items-center-vx justify-between-vx" *ngIf="showHeader">
        <div class="flex-vx items-center-vx h-full-vx">
          <div class="active-tab flex-vx items-center-vx gap-vx px-4 h-full-vx bg-[var(--p-surface-950)] border-r border-[var(--p-surface-800)] relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--p-primary-500)]">
            <i [class]="getFileIcon(file?.language) + ' text-[12px] opacity-80'"></i>
            <span class="file-name text-[10px] font-bold text-[var(--p-surface-100)] tracking-tight antialiased uppercase opacity-90">{{ file?.name || 'Untitled' }}</span>
            <div class="w-1.5 h-1.5 rounded-full border border-[var(--p-primary-500)] flex-vx items-center-vx justify-center-vx ml-1 group cursor-pointer" *ngIf="isDirty" title="Modified">
              <span class="w-1 h-1 rounded-full bg-[var(--p-primary-500)] animate-pulse"></span>
            </div>
            <button class="ml-2 p-1 hover:bg-[var(--p-surface-800)] rounded text-[var(--p-surface-500)] hover:text-[var(--p-surface-200)] transition-all flex-vx items-center-vx justify-center-vx">
              <i class="pi pi-times text-[8px]"></i>
            </button>
          </div>
        </div>
        
        <div class="editor-actions flex-vx items-center-vx gap-vx pr-3 h-full-vx">
          <span class="text-[9px] text-[var(--p-surface-500)] font-bold uppercase tracking-widest opacity-40">{{ file?.language || 'text' }}</span>
          <button 
            class="flex-vx items-center-vx gap-vx px-2.5 py-1 rounded text-[9px] bg-gradient-to-r from-[var(--p-primary-600)] to-[var(--p-primary-700)] hover:from-[var(--p-primary-500)] hover:to-[var(--p-primary-600)] text-white border border-[var(--p-primary-500)] shadow-lg shadow-indigo-500/10 transition-all duration-200 disabled:opacity-20 disabled:grayscale disabled:shadow-none font-bold uppercase tracking-wider active:scale-95" 
            (click)="onSave()" 
            [disabled]="!isDirty">
            <i class="pi pi-save text-[9px]"></i>
            <span>Save</span>
          </button>
        </div>
      </div>
      
      <!-- Editor View -->
      <div #editorHost class="editor-host flex-1 overflow-hidden"></div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; width: 100%; font-family: 'Inter', sans-serif; }
    .editor-header-vx {
      height: 32px;
      background: var(--p-surface-900);
      border-bottom: 1px solid var(--p-surface-800);
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      flex-shrink: 0;
    }
    .flex-vx { display: flex !important; }
    .items-center-vx { align-items: center !important; }
    .justify-between-vx { justify-content: space-between !important; }
    .justify-center-vx { justify-content: center !important; }
    .gap-vx { gap: 0.5rem !important; }
    .h-full-vx { height: 100% !important; }

    .editor-host ::ng-deep .cm-editor { height: 100%; outline: none !important; background: transparent !important; }
    .editor-host ::ng-deep .cm-scroller { font-family: 'JetBrains Mono', monospace !important; font-size: 13px; line-height: 1.6; }
    .editor-host ::ng-deep .cm-gutters { background-color: var(--p-surface-950) !important; color: var(--p-surface-600) !important; border-right: 1px solid var(--p-surface-800) !important; }
    .editor-host ::ng-deep .cm-activeLineGutter { background-color: var(--p-surface-800) !important; color: var(--p-surface-100) !important; }
    .editor-host ::ng-deep .cm-activeLine { background-color: rgba(255, 255, 255, 0.02) !important; }
    .editor-host ::ng-deep .cm-foldPlaceholder { background: var(--p-surface-800) !important; border: none !important; color: var(--p-surface-400) !important; }
  `]
})
export class EditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() file: VertexFile | null = null;
  @Input() showHeader = true;
  @Input() extensions: Extension[] = [];
  @Output() contentChange = new EventEmitter<string>();
  @Output() save = new EventEmitter<void>();

  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  private editorView: EditorView | null = null;
  public isDirty = false;

  ngAfterViewInit(): void {
    this.initializeEditor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['file'] && !changes['file'].firstChange && this.editorView) {
      this.updateContent(this.file?.content || '');
    }
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }

  private getLanguageExtension(lang?: string): Extension {
    switch (lang?.toLowerCase()) {
      case 'javascript':
      case 'typescript':
      case 'ts':
      case 'js':
        return javascript({ typescript: true });
      case 'html': return html();
      case 'css': return css();
      case 'json': return json();
      case 'rust': return rust();
      case 'python': return python();
      case 'markdown':
      case 'md':
        return markdown();
      default: return [];
    }
  }

  private initializeEditor(): void {
    const startState = EditorState.create({
      doc: this.file?.content || '',
      extensions: [
        basicSetup,
        history(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
        ]),
        oneDark,
        this.getLanguageExtension(this.file?.language),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.isDirty = true;
            this.contentChange.emit(update.state.doc.toString());
          }
        }),
        ...this.extensions
      ]
    });

    this.editorView = new EditorView({
      state: startState,
      parent: this.editorHost.nativeElement
    });
  }

  private destroyEditor(): void {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
  }

  onSave(): void {
    this.save.emit();
    this.isDirty = false;
  }

  updateContent(content: string): void {
    if (this.editorView) {
      const state = this.editorView.state;
      this.editorView.dispatch({
        changes: {
          from: 0,
          to: state.doc.length,
          insert: content
        }
      });
      this.isDirty = false;
    }
  }

  public getFileIcon(language?: string): string {
    const iconMap: Record<string, string> = {
      'typescript': 'pi pi-file-edit text-blue-400',
      'javascript': 'pi pi-file-edit text-yellow-400',
      'html': 'pi pi-code text-orange-500',
      'css': 'pi pi-palette text-blue-500',
      'json': 'pi pi-info-circle text-green-400',
      'md': 'pi pi-file text-slate-400',
      'rust': 'pi pi-cog text-orange-700',
      'python': 'pi pi-bolt text-blue-300'
    };
    return iconMap[language?.toLowerCase() || ''] || 'pi pi-file text-slate-500';
  }

  focus(): void {
    this.editorView?.focus();
  }
}
