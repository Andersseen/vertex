/// <reference types="vitest" />

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import path from 'node:path';

export default defineConfig(() => ({
  root: __dirname,
  build: {
    target: ['es2022'],
  },
  resolve: {
    alias: [
      { find: '@vertex/core/web', replacement: path.resolve(__dirname, '../../packages/frontend/core/src/web/index.ts') },
      { find: '@vertex/ui', replacement: path.resolve(__dirname, '../../packages/frontend/ui/src/index.ts') },
      { find: '@vertex/core', replacement: path.resolve(__dirname, '../../packages/frontend/core/src/index.ts') },
      { find: '@vertex/types', replacement: path.resolve(__dirname, '../../packages/frontend/types/src/index.ts') },
      { find: '@vertex/runtime', replacement: path.resolve(__dirname, '../../packages/frontend/runtime/src/index.ts') },
      { find: '@vertex/ide-ui', replacement: path.resolve(__dirname, '../../packages/frontend/ide-ui/src/index.ts') },
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        loadPaths: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, '../../packages/frontend/ui/src'),
        ],
      },
    },
  },
  plugins: [
    analog({
      ssr: false,
    }),
  ],
}));
