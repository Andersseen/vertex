import "zone.js";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { WebEditorModule } from "./lib/web-editor.module";

// Bootstrap the Angular module which registers the custom element
function bootstrap() {
  platformBrowserDynamic()
    .bootstrapModule(WebEditorModule)
    .then(() => {
      console.log("[WebEditor] Custom element registered successfully");
    })
    .catch((err) => {
      console.error("[WebEditor] Error bootstrapping:", err);
    });
}

// Auto-bootstrap when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

// Export types for TypeScript users
export { WebEditorComponent } from "./lib/web-editor.component";
export type {
  EditorTheme,
  SupportedLanguage,
} from "./lib/web-editor.component";
export {
  getLanguageSupport,
  isLanguageSupported,
  getSupportedLanguages,
} from "./lib/language-support";
