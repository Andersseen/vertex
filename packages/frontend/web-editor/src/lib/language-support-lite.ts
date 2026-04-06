import type { LanguageSupport } from '@codemirror/language';

/**
 * Supported languages - Lite version
 * 
 * Reduced set of languages for code display.
 * All other languages can be added by importing their respective packages.
 */
export type SupportedLanguage =
  | 'javascript' | 'js'
  | 'typescript' | 'ts'
  | 'html'
  | 'css'
  | 'json';

// Core language loaders - these are the most common for code display
const languageLoaders: Record<string, () => Promise<LanguageSupport>> = {
  javascript: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ jsx: false });
  },
  js: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ jsx: false });
  },
  typescript: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ typescript: true, jsx: false });
  },
  ts: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ typescript: true, jsx: false });
  },
  html: async () => {
    const { html } = await import('@codemirror/lang-html');
    return html();
  },
  css: async () => {
    const { css } = await import('@codemirror/lang-css');
    return css();
  },
  json: async () => {
    const { json } = await import('@codemirror/lang-json');
    return json();
  },
};

// Cache for loaded languages
const languageCache = new Map<string, LanguageSupport>();

export async function getLanguageSupport(lang: string): Promise<LanguageSupport | null> {
  const normalizedLang = lang.toLowerCase().trim();

  if (languageCache.has(normalizedLang)) {
    return languageCache.get(normalizedLang)!;
  }

  const loader = languageLoaders[normalizedLang];
  if (!loader) {
    // Fallback to plain text for unsupported languages
    console.warn(`[VertexEditor] Language "${lang}" not supported in lite version. Using plain text.`);
    return null;
  }

  try {
    const support = await loader();
    languageCache.set(normalizedLang, support);
    return support;
  } catch (err) {
    console.warn(`[VertexEditor] Failed to load language "${lang}"`, err);
    return null;
  }
}

export function isLanguageSupported(lang: string): boolean {
  return lang.toLowerCase().trim() in languageLoaders;
}

export function getSupportedLanguages(): string[] {
  return Object.keys(languageLoaders);
}

/**
 * LANGUAGES REMOVED in Lite version:
 * 
 * - tsx (TypeScript JSX)
 * - jsx (JavaScript JSX) 
 * - markdown / md
 * 
 * TO ADD MORE LANGUAGES:
 * 
 * 1. Import the language package in your project:
 *    npm install @codemirror/lang-markdown
 * 
 * 2. Register it before using the editor:
 *    import { registerLanguage } from '@vertex/web-editor';
 *    
 *    registerLanguage('markdown', async () => {
 *      const { markdown } = await import('@codemirror/lang-markdown');
 *      return markdown();
 *    });
 * 
 * Or use the full version which includes all languages.
 */

// Extension point for adding custom languages
const customLanguages = new Map<string, () => Promise<LanguageSupport>>();

export function registerLanguage(
  name: string, 
  loader: () => Promise<LanguageSupport>
): void {
  customLanguages.set(name.toLowerCase(), loader);
}
