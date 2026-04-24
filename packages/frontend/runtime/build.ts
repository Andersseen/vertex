import { build } from 'bun'
import path from 'node:path'

// All runtime deps treated as external — consumer's bundler resolves them.
const external = [
  '@webcontainer/api',
  '@isomorphic-git/lightning-fs',
  'isomorphic-git',
  'esbuild-wasm',
  'typescript',
  'eslint',
  'prettier',
  'postcss',
  'sass',
]

const subpaths = [
  'index',
  'fs/index',
  'git/index',
  'build/index',
  'preview-wc-headless/index',
  'preview-wc/index',
  'deploy/index',
  'extras/types/index',
  'extras/lint/index',
  'extras/format/index',
  'extras/css/index',
]

let failed = false

for (const entry of subpaths) {
  const result = await build({
    entrypoints: [`./src/${entry}.ts`],
    outdir: `./dist/${path.dirname(entry)}`,
    target: 'browser',
    format: 'esm',
    external,
    splitting: false,
    minify: false,
    sourcemap: 'external',
    naming: '[dir]/[name].[ext]',
  })

  if (!result.success) {
    console.error(`[build] FAILED: ${entry}`)
    for (const log of result.logs) console.error(log)
    failed = true
  } else {
    const size = result.outputs.reduce((s, o) => s + o.size, 0)
    console.log(`  ✓ ${entry}  (${(size / 1024).toFixed(1)} kB)`)
  }
}

if (failed) process.exit(1)
console.log('\nBuild complete → dist/')
