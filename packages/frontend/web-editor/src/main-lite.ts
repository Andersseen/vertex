/**
 * Vertex Editor Lite - Entry Point
 *
 * Minimal bundle optimized for read-only code display.
 * No editing features, no search, no autocomplete.
 *
 * Expected bundle size: ~400-600KB minified
 */
import "@angular/compiler";
import { createApplication } from "@angular/platform-browser";
import { createCustomElement } from "@angular/elements";
import { provideZonelessChangeDetection } from "@angular/core";
import { WebEditorLiteComponent } from "./lib/web-editor-lite.component";

async function bootstrapWebEditorLite(): Promise<void> {
  const app = await createApplication({
    providers: [provideZonelessChangeDetection()],
  });

  const WebEditorLiteElement = createCustomElement(WebEditorLiteComponent, {
    injector: app.injector,
  });

  if (!customElements.get("vertex-editor-lite")) {
    customElements.define("vertex-editor-lite", WebEditorLiteElement);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => bootstrapWebEditorLite());
} else {
  bootstrapWebEditorLite();
}

/**
 * USAGE:
 *
 * HTML:
 * <vertex-editor-lite
 *   value="const x = 1;"
 *   language="javascript"
 *   theme="dark"
 *   line-numbers="true">
 * </vertex-editor-lite>
 *
 * Angular:
 * <vertex-editor-lite
 *   [attr.value]="code()"
 *   language="typescript"
 *   theme="light">
 * </vertex-editor-lite>
 *
 * NOTE: Include schemas: [CUSTOM_ELEMENTS_SCHEMA] in your Angular component
 */
