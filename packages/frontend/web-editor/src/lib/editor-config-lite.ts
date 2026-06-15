/**
 * Vertex Editor Lite - Configuration for read-only code display
 *
 * This is a minimal configuration optimized for displaying code only.
 * All editing features have been removed to reduce bundle size.
 *
 * To re-enable features later, see editor-config-full.ts for reference.
 */

import { EditorState, Extension, Compartment } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  keymap,
  lineNumbers,
  ViewUpdate,
} from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap } from "@codemirror/commands";
import {
  defaultHighlightStyle,
  LanguageSupport,
  syntaxHighlighting,
} from "@codemirror/language";

export interface EditorConfig {
  value: string;
  language: LanguageSupport | null;
  theme: "light" | "dark";
  lineNumbers: boolean;
  tabSize: number;
  onChange?: (value: string) => void; // Optional - for copy operations
}

const scrollTheme = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { overflow: "auto" },
});

// Minimal cursor theme for read-only
const cursorTheme = EditorView.theme({
  ".cm-cursor": { display: "none" }, // Hide cursor in read-only mode
});

export class EditorConfigurator {
  readonly languageCompartment = new Compartment();
  readonly themeCompartment = new Compartment();
  readonly lineNumbersCompartment = new Compartment();

  createExtensions(config: EditorConfig): Extension[] {
    return [
      scrollTheme,
      cursorTheme,

      // Basic visualization only
      // REMOVED: history(), - not needed for read-only
      drawSelection(), // Keep for selection visibility
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

      // Read-only configuration
      EditorState.readOnly.of(true), // Always read-only
      EditorView.editable.of(false),
      EditorState.tabSize.of(config.tabSize),

      // Minimal keymap (only navigation)
      keymap.of([
        // Basic navigation only
        ...defaultKeymap.filter(
          (k) =>
            k.key === "ArrowUp" ||
            k.key === "ArrowDown" ||
            k.key === "ArrowLeft" ||
            k.key === "ArrowRight" ||
            k.key === "PageUp" ||
            k.key === "PageDown" ||
            k.key === "Home" ||
            k.key === "End",
        ),
      ]),

      // Dynamic compartments
      this.languageCompartment.of(config.language || []),
      this.themeCompartment.of(this.getThemeExtension(config.theme)),
      this.lineNumbersCompartment.of(config.lineNumbers ? lineNumbers() : []),

      // Optional change listener (for copy detection)
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged && config.onChange) {
          config.onChange(update.state.doc.toString());
        }
      }),
    ];
  }

  createState(config: EditorConfig): EditorState {
    return EditorState.create({
      doc: config.value,
      extensions: this.createExtensions(config),
    });
  }

  getThemeExtension(theme: "light" | "dark"): Extension {
    return theme === "dark" ? oneDark : [];
  }
}

export { Compartment, EditorState, EditorView };
export type { Extension };

/**
 * FEATURES REMOVED in Lite version:
 *
 * 1. @codemirror/autocomplete - Autocompletion (not needed for read-only)
 * 2. @codemirror/search - Search functionality (can be added via browser Ctrl+F)
 * 3. @codemirror/lint - Linting (not editing)
 * 4. bracketMatching - Auto-matching (not editing)
 * 5. closeBrackets - Auto-closing (not editing)
 * 6. rectangularSelection - Advanced selection
 * 7. dropCursor - Drag & drop (not editing)
 * 8. indentOnInput - Auto-indent (not editing)
 * 9. placeholder - Not needed if always has content
 *
 * TO RE-ENABLE LATER:
 * Copy the createExtensions function from editor-config.ts and merge features back.
 */
