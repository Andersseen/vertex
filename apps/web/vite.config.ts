/// <reference types="vitest" />

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import path from 'node:path';
import { build as esbuildBundle, stop as esbuildStop } from 'esbuild';

const runtimeSrc = path.resolve(__dirname, '../../packages/frontend/runtime/src');
const editorCoreSrc = path.resolve(__dirname, '../../packages/frontend/editor-core/src');
const uiSrc = path.resolve(__dirname, '../../packages/frontend/ui/src');

// Subpath → entry point map.
// These are served as virtual (bundled) modules so the Angular Vite plugin
// never sees them. Without this, AnalogJS's Angular compiler produces empty
// output for TypeScript files that have no Angular decorators.
const RUNTIME_SUBPATHS: Record<string, string> = {
  '@vertex/runtime/build': path.join(runtimeSrc, 'build/index.ts'),
  '@vertex/runtime/deploy': path.join(runtimeSrc, 'deploy/index.ts'),
  '@vertex/runtime/preview-wc-headless': path.join(runtimeSrc, 'preview-wc-headless/index.ts'),
  '@vertex/runtime/preview-wc': path.join(runtimeSrc, 'preview-wc/index.ts'),
};

const EDITOR_CORE_ENTRIES: Record<string, string> = {
  '@vertex/editor-core': path.join(editorCoreSrc, 'index.ts'),
  '@vertex/editor-core/languages/workbench': path.join(
    editorCoreSrc,
    'languages/workbench.ts',
  ),
};

const UI_PLAIN_TS_ENTRIES: Record<string, string> = {
  '@vertex/ui/lsp': path.join(uiSrc, 'lib/lsp/ts-lsp-extension.ts'),
};

const PLAIN_TS_ENTRIES = {
  ...RUNTIME_SUBPATHS,
  ...EDITOR_CORE_ENTRIES,
  ...UI_PLAIN_TS_ENTRIES,
};

const COOP_COEP_HEADERS = {
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export default defineConfig(() => ({
  root: __dirname,
  build: {
    target: ['es2022'],
  },
  server: {
    headers: COOP_COEP_HEADERS,
  },
  preview: {
    headers: COOP_COEP_HEADERS,
  },
  resolve: {
    alias: [
      {
        find: /^@vertex\/core\/web$/,
        replacement: path.resolve(__dirname, '../../packages/frontend/core/src/web/index.ts'),
      },
      {
        find: /^@vertex\/ui$/,
        replacement: path.resolve(__dirname, '../../packages/frontend/ui/src/index.ts'),
      },
      {
        find: /^@vertex\/core$/,
        replacement: path.resolve(__dirname, '../../packages/frontend/core/src/index.ts'),
      },
      {
        find: /^@vertex\/types$/,
        replacement: path.resolve(__dirname, '../../packages/frontend/types/src/index.ts'),
      },
      {
        find: /^@vertex\/runtime$/,
        replacement: path.resolve(__dirname, '../../packages/frontend/runtime/src/index.ts'),
      },
      {
        find: /^@vertex\/ide-ui$/,
        replacement: path.resolve(__dirname, '../../packages/frontend/ide-ui/src/index.ts'),
      },
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
        loadPaths: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, '../../packages/frontend/ui/src'),
        ],
      },
    },
  },
  plugins: [
    {
      name: 'vertex-plain-typescript-packages',
      enforce: 'pre',

      resolveId(id: string) {
        if (PLAIN_TS_ENTRIES[id]) return `\0vertex-plain-ts:${id}`;
      },

      async load(id: string) {
        if (!id.startsWith('\0vertex-plain-ts:')) return;
        const subpath = id.slice('\0vertex-plain-ts:'.length);
        const entry = PLAIN_TS_ENTRIES[subpath];
        if (!entry) return;
        const isEditorCore = subpath.startsWith('@vertex/editor-core');
        const isUiPlainModule = subpath.startsWith('@vertex/ui/');

        // Bundle the subpath with plain esbuild — bypasses Angular's compiler
        const result = await esbuildBundle({
          entryPoints: [entry],
          bundle: true,
          write: false,
          format: 'esm',
          platform: 'browser',
          target: 'es2022',
          // Keep large external packages out of the inline bundle.
          // @webcontainer/api is bundled inline so the virtual module is self-contained
          // and Vite's import-analysis never has to resolve a bare specifier from a virtual ID.
          external: isEditorCore
            ? ['@codemirror/*']
            : isUiPlainModule
              ? ['@codemirror/*', '@vertex/runtime/lsp']
            : ['esbuild-wasm', 'isomorphic-git', '@isomorphic-git/*'],
          logLevel: 'silent',
        });

        return { code: result.outputFiles[0].text, map: null };
      },

      closeBundle() {
        esbuildStop();
      },
    },
    analog({
      ssr: false,
      prerender: {
        routes: [],
      },
      nitro: {
        preset: 'cloudflare-pages',
        externals: {
          inline: ['@analogjs/router'],
        },
      },
    }),
  ],
}));
