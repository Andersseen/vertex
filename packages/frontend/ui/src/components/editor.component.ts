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
    <div class="editor-container h-full w-full flex flex-col bg-[var(--p-surface-950)]">
      <!-- Editor Header -->
      <div class="editor-header flex items-center justify-between px-4 h-9 border-b border-[var(--p-surface-800)] bg-[var(--p-surface-900)] select-none shrink-0" *ngIf="showHeader">
        <div class="file-info flex items-center gap-2">
          <i class="pi pi-file text-[11px] text-[var(--p-primary-500)]"></i>
          <span class="file-name text-[11px] font-medium text-[var(--p-surface-100)]">{{ file?.name || 'Untitled' }}</span>
          <span class="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-[var(--p-surface-800)] text-[var(--p-surface-400)] font-bold uppercase tracking-tighter">{{ file?.language || 'text' }}</span>
          <span class="w-2 h-2 rounded-full bg-[var(--p-primary-500)] ml-1 animate-pulse" *ngIf="isDirty" title="Modified"></span>
        </div>
        <div class="editor-actions">
          <button 
            class="flex items-center gap-2 px-2.5 py-1 rounded text-[10px] bg-[var(--p-primary-600)] hover:bg-[var(--p-primary-500)] text-white transition-all duration-200 disabled:opacity-30 disabled:grayscale font-bold uppercase tracking-wide" 
            (click)="onSave()" 
            [disabled]="!isDirty">
            <i class="pi pi-save text-[10px]"></i>
            <span>Save</span>
          </button>
        </div>
      </div>
      
      <!-- Editor View -->
      <div #editorHost class="editor-host flex-1 overflow-hidden"></div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; width: 100%; }
    .editor-host ::ng-deep .cm-editor { height: 100%; outline: none !important; background: transparent !important; }
    .editor-host ::ng-deep .cm-scroller { font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', monospace !important; font-size: 13px; line-height: 1.6; }
    .editor-host ::ng-deep .cm-gutters { background-color: var(--p-surface-950) !important; color: var(--p-surface-600) !important; border-right: 1px solid var(--p-surface-800) !important; }
    .editor-host ::ng-deep .cm-activeLineGutter { background-color: var(--p-surface-800) !important; color: var(--p-surface-100) !important; }
    .editor-host ::ng-deep .cm-activeLine { background-color: rgba(255, 255, 255, 0.03) !important; }
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

  focus(): void {
    this.editorView?.focus();
  }
}
