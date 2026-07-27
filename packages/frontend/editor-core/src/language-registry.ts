import type { LanguageSupport } from '@codemirror/language';

export type LanguageLoader = () => Promise<LanguageSupport>;

/**
 * Lazily resolves CodeMirror language packages and caches each language once.
 *
 * Product surfaces own their language profile: the embeddable editor can stay
 * small while the workbench opts into a broader set.
 */
export class LanguageRegistry<TLanguage extends string = string> {
  private readonly loaders = new Map<
    string,
    { canonicalName: string; loader: LanguageLoader }
  >();
  private readonly cache = new Map<string, LanguageSupport>();

  constructor(loaders: Partial<Record<TLanguage, LanguageLoader>> = {}) {
    for (const [name, loader] of Object.entries(loaders) as [string, LanguageLoader][]) {
      this.register(name, loader);
    }
  }

  register(name: string, loader: LanguageLoader, aliases: readonly string[] = []): void {
    const canonicalName = this.normalize(name);
    for (const key of [canonicalName, ...aliases]) {
      this.loaders.set(this.normalize(key), { canonicalName, loader });
    }
  }

  supports(language: string): boolean {
    return this.loaders.has(this.normalize(language));
  }

  languages(): string[] {
    return [...this.loaders.keys()];
  }

  async load(language: string): Promise<LanguageSupport | null> {
    const normalized = this.normalize(language);
    const entry = this.loaders.get(normalized);
    if (!entry) return null;

    const cached = this.cache.get(entry.canonicalName);
    if (cached) return cached;

    const support = await entry.loader();
    this.cache.set(entry.canonicalName, support);
    return support;
  }

  private normalize(language: string): string {
    return language.trim().toLowerCase();
  }
}
