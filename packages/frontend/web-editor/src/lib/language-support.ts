import { StreamLanguage } from '@codemirror/language';
import { javascript, typescriptLanguage, jsxLanguage, tsxLanguage } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { LanguageSupport, Language, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

// Define supported languages
export type SupportedLanguage =
  | 'javascript' | 'js'
  | 'typescript' | 'ts'
  | 'tsx'
  | 'jsx'
  | 'html'
  | 'angular'
  | 'astro'
  | 'css'
  | 'json'
  | 'markdown' | 'md';

// Language configurations with lazy loading
const languageLoaders: Record<string, () => Promise<LanguageSupport>> = {
  javascript: async () => javascript({ jsx: false }),
  js: async () => javascript({ jsx: false }),
  typescript: async () => javascript({ typescript: true, jsx: false }),
  ts: async () => javascript({ typescript: true, jsx: false }),
  tsx: async () => javascript({ typescript: true, jsx: true }),
  jsx: async () => javascript({ jsx: true }),
  html: async () => html(),
  angular: async () => html({
    matchClosingTags: true,
    selfClosingTags: true
  }),
  astro: async () => html({
    matchClosingTags: true,
    selfClosingTags: true
  }),
  css: async () => css(),
  json: async () => json(),
  markdown: async () => markdown(),
  md: async () => markdown(),
};

// Cache for loaded languages
const languageCache: Map<string, LanguageSupport> = new Map();

/**
 * Get language support for a given language name
 */
export async function getLanguageSupport(lang: string): Promise<LanguageSupport | null> {
  const normalizedLang = lang.toLowerCase().trim();

  // Return cached language if available
  if (languageCache.has(normalizedLang)) {
    return languageCache.get(normalizedLang)!;
  }

  // Load language if supported
  const loader = languageLoaders[normalizedLang];
  if (loader) {
    try {
      const support = await loader();
      languageCache.set(normalizedLang, support);
      return support;
    } catch (error) {
      console.error(`Failed to load language: ${lang}`, error);
      return null;
    }
  }

  console.warn(`Language not supported: ${lang}`);
  return null;
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(lang: string): boolean {
  return lang.toLowerCase().trim() in languageLoaders;
}

/**
 * Get list of all supported languages
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(languageLoaders).filter((lang, index, self) =>
    self.indexOf(lang) === index
  );
}

// Simple Astro syntax highlighting using StreamLanguage as fallback
// This provides basic frontmatter and HTML tag highlighting
export const astroLanguage = StreamLanguage.define({
  name: 'astro',
  startState: () => ({ inFrontmatter: false, frontmatterLine: 0 }),
  token: (stream, state: any) => {
    // Frontmatter detection (---)
    if (stream.match('---')) {
      if (!state.inFrontmatter) {
        state.inFrontmatter = true;
        state.frontmatterLine = 0;
        return 'keyword';
      } else if (state.frontmatterLine > 0) {
        state.inFrontmatter = false;
        return 'keyword';
      }
    }

    if (state.inFrontmatter) {
      state.frontmatterLine++;
      stream.skipToEnd();
      return 'string';
    }

    // HTML tags
    if (stream.match(/<\/?[a-zA-Z][\w-]*/)) {
      stream.match(/[^>]*/);
      return 'tag';
    }

    // Expressions
    if (stream.match('{')) {
      return 'bracket';
    }
    if (stream.match('}')) {
      return 'bracket';
    }

    stream.next();
    return null;
  },
  blankLine: (state: any) => {
    if (state.inFrontmatter) {
      state.frontmatterLine++;
    }
  }
});
