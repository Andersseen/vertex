import { EditorState, Extension, Compartment } from "@codemirror/state";
import {
  drawSelection,
  dropCursor,
  EditorView,
  keymap,
  lineNumbers,
  placeholder,
  ViewUpdate,
  rectangularSelection,
} from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  LanguageSupport,
  syntaxHighlighting,
} from "@codemirror/language";

// Optional features - loaded only when needed
let searchExtension: Extension | null = null;
let autocompleteExtension: Extension | null = null;

async function getSearchExtension(): Promise<Extension> {
  if (!searchExtension) {
    const { searchKeymap, highlightSelectionMatches } =
      await import("@codemirror/search");
    searchExtension = keymap.of(searchKeymap);
  }
  return searchExtension;
}

async function getAutocompleteExtension(): Promise<Extension> {
  if (!autocompleteExtension) {
    const {
      autocompletion,
      closeBrackets,
      closeBracketsKeymap,
      completionKeymap,
    } = await import("@codemirror/autocomplete");
    autocompleteExtension = [
      autocompletion(),
      closeBrackets(),
      keymap.of([...closeBracketsKeymap, ...completionKeymap]),
    ];
  }
  return autocompleteExtension;
}

export interface EditorConfig {
  value: string;
  language: LanguageSupport | null;
  theme: "light" | "dark";
  readonly: boolean;
  lineNumbers: boolean;
  wordWrap: boolean;
  tabSize: number;
  placeholder?: string;
  enableSearch?: boolean;
  enableAutocomplete?: boolean;
  onChange?: (value: string) => void;
  onCursorActivity?: (position: { line: number; column: number }) => void;
}

const scrollTheme = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { overflow: "auto" },
});

// Core extensions always included
function getCoreExtensions(): Extension[] {
  return [
    scrollTheme,
    history(),
    drawSelection(),
    dropCursor(),
    indentOnInput(),
    bracketMatching(),
    rectangularSelection(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    EditorState.allowMultipleSelections.of(true),
    keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
  ];
}

export class EditorConfigurator {
  readonly languageCompartment = new Compartment();
  readonly themeCompartment = new Compartment();
  readonly readonlyCompartment = new Compartment();
  readonly editableCompartment = new Compartment();
  readonly lineNumbersCompartment = new Compartment();
  readonly wordWrapCompartment = new Compartment();

  async createExtensions(config: EditorConfig): Promise<Extension[]> {
    const extensions: Extension[] = [
      ...getCoreExtensions(),

      // Editor behavior
      EditorState.tabSize.of(config.tabSize),

      // Dynamic compartments
      this.languageCompartment.of(config.language || []),
      this.themeCompartment.of(this.getThemeExtension(config.theme)),
      this.readonlyCompartment.of(EditorState.readOnly.of(config.readonly)),
      this.editableCompartment.of(EditorView.editable.of(!config.readonly)),
      this.lineNumbersCompartment.of(config.lineNumbers ? lineNumbers() : []),
      this.wordWrapCompartment.of(
        config.wordWrap ? EditorView.lineWrapping : [],
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

    // Optional: Search
    if (config.enableSearch) {
      extensions.push(await getSearchExtension());
    }

    // Optional: Autocomplete
    if (config.enableAutocomplete) {
      extensions.push(await getAutocompleteExtension());
    }

    if (config.placeholder) {
      extensions.push(placeholder(config.placeholder));
    }

    return extensions;
  }

  async createState(config: EditorConfig): Promise<EditorState> {
    const extensions = await this.createExtensions(config);
    return EditorState.create({
      doc: config.value,
      extensions,
    });
  }

  getThemeExtension(theme: "light" | "dark"): Extension {
    return theme === "dark" ? oneDark : [];
  }
}

// Re-export needed types
export { Compartment, EditorState, EditorView };
export type { Extension };
