import { LanguageRegistry } from '../language-registry';

export type WebLanguage =
  | 'javascript'
  | 'js'
  | 'typescript'
  | 'ts'
  | 'html'
  | 'css'
  | 'json';

export function createWebLanguageRegistry(): LanguageRegistry<WebLanguage> {
  const registry = new LanguageRegistry<WebLanguage>();

  registry.register(
    'javascript',
    async () => {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript();
    },
    ['js'],
  );
  registry.register(
    'typescript',
    async () => {
      const { javascript } = await import('@codemirror/lang-javascript');
      return javascript({ typescript: true });
    },
    ['ts'],
  );
  registry.register('html', async () => {
    const { html } = await import('@codemirror/lang-html');
    return html();
  });
  registry.register('css', async () => {
    const { css } = await import('@codemirror/lang-css');
    return css();
  });
  registry.register('json', async () => {
    const { json } = await import('@codemirror/lang-json');
    return json();
  });

  return registry;
}
