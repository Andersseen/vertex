import 'zone.js';
import '@angular/compiler';
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { WebEditorComponent } from './lib/web-editor.component';

async function bootstrapWebEditor(): Promise<void> {
  try {
    const app = await createApplication({
      providers: [],
    });

    const WebEditorElement = createCustomElement(WebEditorComponent, {
      injector: app.injector,
    });

    if (!customElements.get('vertex-editor')) {
      customElements.define('vertex-editor', WebEditorElement);
    }
  } catch (error) {
    console.error('[VertexEditor] Bootstrap failed:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bootstrapWebEditor();
  });
} else {
  bootstrapWebEditor();
}

export { WebEditorComponent } from './lib/web-editor.component';
export type { EditorTheme, CursorPosition } from './lib/web-editor.component';
export type { SupportedLanguage } from './lib/language-support';
export {
  getLanguageSupport,
  isLanguageSupported,
  getSupportedLanguages,
} from './lib/language-support';
