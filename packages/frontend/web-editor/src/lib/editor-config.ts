import { EditorState, Extension, Compartment } from '@codemirror/state';
import { EditorView, keymap, placeholder, ViewUpdate } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  LanguageSupport,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { lineNumbers } from '@codemirror/view';

export interface EditorConfig {
  value: string;
  language: LanguageSupport | null;
  theme: 'light' | 'dark';
  readonly: boolean;
  lineNumbers: boolean;
  wordWrap: boolean;
  tabSize: number;
  placeholder?: string;
  onChange?: (value: string) => void;
  onCursorActivity?: (position: { line: number; column: number }) => void;
}

export class EditorConfigurator {
  readonly languageCompartment = new Compartment();
  readonly themeCompartment = new Compartment();
  readonly readonlyCompartment = new Compartment();
  readonly lineNumbersCompartment = new Compartment();
  readonly wordWrapCompartment = new Compartment();

  createExtensions(config: EditorConfig): Extension[] {
    const extensions: Extension[] = [
      // Basic editing features
      history(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      
      // Syntax highlighting
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      
      // Editor behavior
      EditorState.allowMultipleSelections.of(true),
      EditorState.tabSize.of(config.tabSize),
      
      // Keymaps
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
      ]),

      // Dynamic compartments
      this.languageCompartment.of(config.language || []),
      this.themeCompartment.of(this.getThemeExtension(config.theme)),
      this.readonlyCompartment.of(EditorState.readOnly.of(config.readonly)),
      this.lineNumbersCompartment.of(config.lineNumbers ? lineNumbers() : []),
      this.wordWrapCompartment.of(
        config.wordWrap ? EditorView.lineWrapping : []
      ),

      // Event handlers
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged && config.onChange) {
          config.onChange(update.state.doc.toString());
        }

        if (config.onCursorActivity) {
          const { head } = update.state.selection.main;
          const line = update.state.doc.lineAt(head);
          config.onCursorActivity({
            line: line.number,
            column: head - line.from,
          });
        }
      }),
    ];

    if (config.placeholder) {
      extensions.push(placeholder(config.placeholder));
    }

    return extensions;
  }

  createState(config: EditorConfig): EditorState {
    return EditorState.create({
      doc: config.value,
      extensions: this.createExtensions(config),
    });
  }

  getThemeExtension(theme: 'light' | 'dark'): Extension {
    return theme === 'dark' ? oneDark : [];
  }
}

// Re-export needed types
export { Compartment, EditorState, Extension, EditorView };
