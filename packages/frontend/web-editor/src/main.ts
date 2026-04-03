import "zone.js";
import { createApplication } from "@angular/platform-browser";
import { createCustomElement } from "@angular/elements";
import { WebEditorComponent } from "./lib/web-editor.component";

// Bootstrap function for the Web Component
async function bootstrapWebEditor() {
  try {
    // Create Angular application
    const app = await createApplication({
      providers: [],
    });

    // Create the custom element from the Angular component
    const WebEditorElement = createCustomElement(WebEditorComponent, {
      injector: app.injector,
    });

    // Register the custom element with the browser
    if (!customElements.get("web-editor")) {
      customElements.define("web-editor", WebEditorElement);
      console.log("[WebEditor] Custom element registered successfully");
    }

    return app;
  } catch (error) {
    console.error("[WebEditor] Error bootstrapping:", error);
    throw error;
  }
}

// Auto-bootstrap when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    bootstrapWebEditor();
  });
} else {
  bootstrapWebEditor();
}

// Export types for TypeScript users
export { WebEditorComponent } from "./lib/web-editor.component";
export type { EditorTheme, CursorPosition } from "./lib/web-editor.component";
export type { SupportedLanguage } from "./lib/language-support";
export {
  getLanguageSupport,
  isLanguageSupported,
  getSupportedLanguages,
} from "./lib/language-support";
