import type { LanguageSupport } from '@codemirror/language';

export type SupportedLanguage =
  | 'javascript' | 'js'
  | 'typescript' | 'ts'
  | 'tsx'
  | 'jsx'
  | 'html'
  | 'css'
  | 'json'
  | 'markdown' | 'md';

// Language loader functions - dynamically imported
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
  tsx: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ typescript: true, jsx: true });
  },
  jsx: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ jsx: true });
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
  markdown: async () => {
    const { markdown } = await import('@codemirror/lang-markdown');
    return markdown();
  },
  md: async () => {
    const { markdown } = await import('@codemirror/lang-markdown');
    return markdown();
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
    return null;
  }

  try {
    const support = await loader();
    languageCache.set(normalizedLang, support);
    return support;
  } catch {
    return null;
  }
}

export function isLanguageSupported(lang: string): boolean {
  return lang.toLowerCase().trim() in languageLoaders;
}

export function getSupportedLanguages(): string[] {
  return Object.keys(languageLoaders).filter((lang, index, self) =>
    self.indexOf(lang) === index
  );
}
