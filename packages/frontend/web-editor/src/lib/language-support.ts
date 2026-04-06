import type { LanguageSupport } from '@codemirror/language';

/**
 * Supported languages - Core set for web development
 * 
 * Reduced to essential web languages for optimal bundle size.
 * Removed: TSX, JSX, JSON, Markdown (saves ~150KB+)
 */
export type SupportedLanguage =
  | 'javascript' | 'js'
  | 'typescript' | 'ts'
  | 'html'
  | 'css';

// Core language loaders - dynamically imported for tree-shaking
const languageLoaders: Record<string, () => Promise<LanguageSupport>> = {
  javascript: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ jsx: false, typescript: false });
  },
  js: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ jsx: false, typescript: false });
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
    console.warn(`[VertexEditor] Language "${lang}" not supported. Using plain text.`);
    return null;
  }

  try {
    const support = await loader();
    languageCache.set(normalizedLang, support);
    return support;
  } catch (err) {
    console.warn(`[VertexEditor] Failed to load language "${lang}":`, err);
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
 * REMOVED LANGUAGES (load them dynamically if needed):
 * 
 * - tsx: JavaScript/TypeScript with JSX
 *   const { javascript } = await import('@codemirror/lang-javascript');
 *   return javascript({ typescript: true, jsx: true });
 * 
 * - jsx: JavaScript with JSX  
 *   const { javascript } = await import('@codemirror/lang-javascript');
 *   return javascript({ jsx: true });
 * 
 * - json: JSON syntax
 *   const { json } = await import('@codemirror/lang-json');
 *   return json();
 * 
 * - markdown/md: Markdown syntax
 *   const { markdown } = await import('@codemirror/lang-markdown');
 *   return markdown();
 */
