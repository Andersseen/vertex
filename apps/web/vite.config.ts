/// <reference types="vitest" />

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import path from 'node:path';
import { build as esbuildBundle, stop as esbuildStop } from 'esbuild';

let esbuildRefCount = 0;

const runtimeSrc = path.resolve(__dirname, '../../packages/frontend/runtime/src');

// Subpath → entry point map.
// These are served as virtual (bundled) modules so the Angular Vite plugin
// never sees them. Without this, AnalogJS's Angular compiler produces empty
// output for TypeScript files that have no Angular decorators.
const RUNTIME_SUBPATHS: Record<string, string> = {
  '@vertex/runtime/preview': path.join(runtimeSrc, 'preview/index.ts'),
  '@vertex/runtime/build': path.join(runtimeSrc, 'build/index.ts'),
  '@vertex/runtime/node': path.join(runtimeSrc, 'node/index.ts'),
  '@vertex/runtime/deploy': path.join(runtimeSrc, 'deploy/index.ts'),
};

export default defineConfig(({ mode }) => ({
  root: __dirname,
  build: {
    target: ['es2022'],
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
      name: 'vertex-runtime-subpaths',
      enforce: 'pre',

      resolveId(id: string) {
        if (RUNTIME_SUBPATHS[id]) return `\0vertex-runtime:${id}`;
      },

      async load(id: string) {
        if (!id.startsWith('\0vertex-runtime:')) return;
        const subpath = id.slice('\0vertex-runtime:'.length);
        const entry = RUNTIME_SUBPATHS[subpath];
        if (!entry) return;

        esbuildRefCount++;
        // Bundle the subpath with plain esbuild — bypasses Angular's compiler
        const result = await esbuildBundle({
          entryPoints: [entry],
          bundle: true,
          write: false,
          format: 'esm',
          platform: 'browser',
          target: 'es2022',
          // Keep large external packages out of the inline bundle
          external: ['esbuild-wasm', 'isomorphic-git', '@isomorphic-git/*'],
          logLevel: 'silent',
        });

        return { code: result.outputFiles[0].text, map: null };
      },

      closeBundle() {
        esbuildStop();
        esbuildRefCount = 0;
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
