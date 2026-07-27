import {
  createWebLanguageRegistry,
  type WebLanguage,
} from '@vertex/editor-core/languages/web';
import type { LanguageLoader } from '@vertex/editor-core';

export type SupportedLanguage = WebLanguage;

const registry = createWebLanguageRegistry();

export async function getLanguageSupport(language: string) {
  try {
    return await registry.load(language);
  } catch (error) {
    console.warn(`[VertexEditor] Failed to load language "${language}"`, error);
    return null;
  }
}

export function isLanguageSupported(language: string): boolean {
  return registry.supports(language);
}

export function getSupportedLanguages(): string[] {
  return registry.languages();
}

export function registerLanguage(
  name: string,
  loader: LanguageLoader,
  aliases: readonly string[] = [],
): void {
  registry.register(name, loader, aliases);
}
