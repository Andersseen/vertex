import "@angular/compiler";
import { createApplication } from "@angular/platform-browser";
import { createCustomElement } from "@angular/elements";
import { provideZonelessChangeDetection } from "@angular/core";
import { WebEditorComponent } from "./lib/web-editor.component";

/**
 * Vertex Editor - Full-featured code editor Web Component
 *
 * This web component uses Angular's zoneless change detection
 * with signals for optimal performance.
 * No zone.js required!
 */

async function bootstrapWebEditor(): Promise<void> {
  try {
    const app = await createApplication({
      providers: [
        // Enable zoneless change detection
        provideZonelessChangeDetection(),
      ],
    });

    const WebEditorElement = createCustomElement(WebEditorComponent, {
      injector: app.injector,
    });

    if (!customElements.get("vertex-editor")) {
      customElements.define("vertex-editor", WebEditorElement);
    }
  } catch (error) {
    console.error("[VertexEditor] Bootstrap failed:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    bootstrapWebEditor();
  });
} else {
  bootstrapWebEditor();
}

// Public API exports
export { WebEditorComponent } from "./lib/web-editor.component";
export type { EditorTheme, CursorPosition } from "./lib/web-editor.component";
export type { SupportedLanguage } from "./lib/language-support";
export {
  getLanguageSupport,
  isLanguageSupported,
  getSupportedLanguages,
  registerLanguage,
} from "./lib/language-support";
