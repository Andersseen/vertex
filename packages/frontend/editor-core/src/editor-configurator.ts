import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  drawSelection,
  dropCursor,
  EditorView,
  keymap,
  lineNumbers,
  placeholder,
  rectangularSelection,
  type ViewUpdate,
} from '@codemirror/view';

export type EditorTheme = 'light' | 'dark';

export interface CursorPosition {
  line: number;
  column: number;
  index: number;
}

export interface EditorConfiguration {
  value: string;
  language?: Extension | null;
  theme?: EditorTheme;
  readonly?: boolean;
  lineNumbers?: boolean;
  wordWrap?: boolean;
  tabSize?: number;
  placeholder?: string;
  enableSearch?: boolean;
  enableAutocomplete?: boolean;
  extensions?: readonly Extension[];
  onChange?: (value: string) => void;
  onCursorActivity?: (position: CursorPosition) => void;
  onSave?: () => void;
}

const scrollTheme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-scroller': {
    overflow: 'auto',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
  },
});

export class EditorConfigurator {
  readonly languageCompartment = new Compartment();
  readonly themeCompartment = new Compartment();
  readonly readonlyCompartment = new Compartment();
  readonly editableCompartment = new Compartment();
  readonly lineNumbersCompartment = new Compartment();
  readonly wordWrapCompartment = new Compartment();

  createState(config: EditorConfiguration): EditorState {
    return EditorState.create({
      doc: config.value,
      extensions: this.createExtensions(config),
    });
  }

  createExtensions(config: EditorConfiguration): Extension[] {
    const readonly = config.readonly ?? false;
    const extensions: Extension[] = [
      scrollTheme,
      history(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      bracketMatching(),
      rectangularSelection(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      EditorState.allowMultipleSelections.of(true),
      EditorState.tabSize.of(config.tabSize ?? 2),
      this.languageCompartment.of(config.language ?? []),
      this.themeCompartment.of(this.getThemeExtension(config.theme ?? 'dark')),
      this.readonlyCompartment.of(EditorState.readOnly.of(readonly)),
      this.editableCompartment.of(EditorView.editable.of(!readonly)),
      this.lineNumbersCompartment.of(config.lineNumbers === false ? [] : lineNumbers()),
      this.wordWrapCompartment.of(config.wordWrap ? EditorView.lineWrapping : []),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...(config.enableSearch === false ? [] : searchKeymap),
        ...(config.enableAutocomplete === false
          ? []
          : [...closeBracketsKeymap, ...completionKeymap]),
        {
          key: 'Mod-s',
          run: () => {
            config.onSave?.();
            return config.onSave !== undefined;
          },
        },
      ]),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          config.onChange?.(update.state.doc.toString());
        }
        if (update.selectionSet || update.docChanged) {
          const { head } = update.state.selection.main;
          const line = update.state.doc.lineAt(head);
          config.onCursorActivity?.({
            line: line.number,
            column: head - line.from + 1,
            index: head,
          });
        }
      }),
    ];

    if (config.enableAutocomplete !== false) {
      extensions.push(autocompletion(), closeBrackets());
    }
    if (config.placeholder) {
      extensions.push(placeholder(config.placeholder));
    }
    extensions.push(...(config.extensions ?? []));
    return extensions;
  }

  getThemeExtension(theme: EditorTheme): Extension {
    return theme === 'dark' ? oneDark : [];
  }
}
