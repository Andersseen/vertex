import { Component, Input, Output, EventEmitter, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, basicSetup } from '@codemirror/view';
import { keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { searchKeymap } from '@codemirror/search';
import { historyKeymap } from '@codemirror/commands';
import { autocompletion } from '@codemirror/autocomplete';
import { bracketMatching } from '@codemirror/language';
import { VertexFile } from '@vertex/types';

@Component({
  selector: 'v-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editor-container">
      <div class="editor-header" *ngIf="showHeader">
        <div class="file-info">
          <span class="file-name">{{ file?.name || 'Untitled' }}</span>
          <span class="file-language">{{ file?.language || 'text' }}</span>
        </div>
        <div class="editor-actions">
          <button class="action-btn" (click)="save()" [disabled]="!isDirty">
            💾 Save
          </button>
        </div>
      </div>
      <div #editorHost class="editor-host"></div>
    </div>
  `,
  styles: [`
    .editor-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--surface);
    }
    
    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-hover);
      min-height: 40px;
    }
    
    .file-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .file-name {
      font-weight: 600;
      color: var(--text);
      font-size: 14px;
    }
    
    .file-language {
      background: var(--primary);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      text-transform: uppercase;
    }
    
    .editor-actions {
      display: flex;
      gap: 8px;
    }
    
    .action-btn {
      background: var(--primary);
      color: white;
      border: none;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .action-btn:hover:not(:disabled) {
      background: var(--primary-hover);
    }
    
    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .editor-host {
      flex: 1;
      overflow: auto;
    }
    
    .editor-host .cm-editor {
      height: 100%;
    }
    
    .editor-host .cm-focused {
      outline: none;
    }
    
    .editor-host .cm-content {
      padding: 16px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .editor-host .cm-line {
      padding: 0 0 0 4px;
    }
    
    .editor-host .cm-gutter {
      background: var(--surface-hover);
      border-right: 1px solid var(--border);
    }
    
    .editor-host .cm-gutterElement {
      padding: 0 8px 0 16px;
      color: var(--text-muted);
    }
  `]
})
export class EditorComponent implements AfterViewInit, OnDestroy {
  @Input() file: VertexFile | null = null;
  @Input() showHeader = true;
  @Input() extensions: Extension[] = [];
  @Output() contentChange = new EventEmitter<string>();
  @Output() save = new EventEmitter<void>();

  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  private editorView: EditorView | null = null;
  private isDirty = false;

  ngAfterViewInit(): void {
    this.initializeEditor();
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }

  private initializeEditor(): void {
    const startState = EditorState.create({
      doc: this.file?.content || '',
      extensions: [
        basicSetup,
        keymap.of([...defaultKeymap, ...searchKeymap, ...historyKeymap]),
        autocompletion(),
        bracketMatching(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.isDirty = true;
            this.contentChange.emit(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': {
            color: 'var(--text)',
            backgroundColor: 'var(--surface)'
          },
          '.cm-content': {
            caretColor: 'var(--text)'
          },
          '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: 'var(--text)'
          },
          '.cm-selectionBackground, ::selection': {
            backgroundColor: 'var(--selection)'
          },
          '.cm-focused .cm-selectionBackground': {
            backgroundColor: 'var(--selection-focused)'
          },
          '.cm-gutters': {
            backgroundColor: 'var(--surface-hover)',
            color: 'var(--text-muted)',
            border: 'none'
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'var(--surface-hover)'
          },
          '.cm-activeLine': {
            backgroundColor: 'var(--surface-hover)'
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
    if (this.editorView) {
      this.editorView.focus();
    }
  }
}
