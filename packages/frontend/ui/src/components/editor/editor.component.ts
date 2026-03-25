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
  templateUrl: './editor.component.html',
  styleUrls: ["./editor.component.scss"],
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
