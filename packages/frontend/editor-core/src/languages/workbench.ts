import { createWebLanguageRegistry, type WebLanguage } from './web';

export type WorkbenchLanguage =
  | WebLanguage
  | 'jsx'
  | 'tsx'
  | 'scss'
  | 'sass'
  | 'less'
  | 'markdown'
  | 'md'
  | 'rust'
  | 'rs'
  | 'python'
  | 'py';

export function createWorkbenchLanguageRegistry() {
  const registry = createWebLanguageRegistry();

  registry.register('jsx', async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ jsx: true });
  });
  registry.register('tsx', async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ typescript: true, jsx: true });
  });
  registry.register(
    'scss',
    async () => {
      const { css } = await import('@codemirror/lang-css');
      return css();
    },
    ['sass', 'less'],
  );
  registry.register(
    'markdown',
    async () => {
      const { markdown } = await import('@codemirror/lang-markdown');
      return markdown();
    },
    ['md'],
  );
  registry.register(
    'rust',
    async () => {
      const { rust } = await import('@codemirror/lang-rust');
      return rust();
    },
    ['rs'],
  );
  registry.register(
    'python',
    async () => {
      const { python } = await import('@codemirror/lang-python');
      return python();
    },
    ['py'],
  );

  return registry;
}
