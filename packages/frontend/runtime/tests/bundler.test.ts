import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { MemoryFS } from '../src/fs/memory-adapter'
import { Bundler } from '../src/build/bundler'
import { readPackageJson, extractDependencyVersions, detectFramework } from '../src/build/resolver'
import { tsConfigToEsbuildTarget } from '../src/build/typescript'

// esbuild-wasm requires a real WASM binary and a Worker environment.
// These tests validate logic that doesn't require esbuild initialization.
// Bundler integration tests must run in a browser environment (Playwright).

describe('resolver', () => {
  let fs: MemoryFS

  beforeEach(() => {
    fs = new MemoryFS()
  })

  test('readPackageJson returns empty object when file missing', async () => {
    const pkg = await readPackageJson(fs, '/')
    expect(pkg).toEqual({})
  })

  test('readPackageJson parses valid package.json', async () => {
    await fs.writeFile('/package.json', JSON.stringify({ name: 'test', dependencies: { react: '^18.2.0' } }))
    const pkg = await readPackageJson(fs, '/')
    expect(pkg.name).toBe('test')
    expect(pkg.dependencies?.react).toBe('^18.2.0')
  })

  test('extractDependencyVersions strips semver prefixes', () => {
    const pkg = { dependencies: { react: '^18.2.0', lodash: '~4.17.21', zod: '>=3.0.0' } }
    const versions = extractDependencyVersions(pkg)
    expect(versions.react).toBe('18.2.0')
    expect(versions.lodash).toBe('4.17.21')
    expect(versions.zod).toBe('3.0.0')
  })

  test('detectFramework identifies react', () => {
    expect(detectFramework({ dependencies: { react: '^18.0.0' } })).toBe('react')
  })

  test('detectFramework identifies vue', () => {
    expect(detectFramework({ dependencies: { vue: '^3.0.0' } })).toBe('vue')
  })

  test('detectFramework returns unknown for empty deps', () => {
    expect(detectFramework({})).toBe('unknown')
  })
})

describe('tsConfigToEsbuildTarget', () => {
  test('maps es2022 correctly', () => {
    expect(tsConfigToEsbuildTarget({ compilerOptions: { target: 'ES2022' } })).toBe('es2022')
  })

  test('defaults to es2020 for unknown target', () => {
    expect(tsConfigToEsbuildTarget({ compilerOptions: { target: 'unknown' } })).toBe('es2020')
  })

  test('defaults to es2020 when no compilerOptions', () => {
    expect(tsConfigToEsbuildTarget({})).toBe('es2020')
  })
})

// NOTE: Bundler.build() and Bundler.transform() require a browser environment
// (Web Worker + WASM). Run these via Playwright e2e tests in apps/web.
describe('Bundler (unit stubs)', () => {
  let fs: MemoryFS
  let bundler: Bundler

  beforeEach(() => {
    fs = new MemoryFS()
    bundler = new Bundler(fs)
  })

  afterEach(() => {
    // dispose only resets state if initialized; safe to call regardless
    try { bundler.dispose() } catch { /* noop in test env */ }
  })

  test('Bundler is instantiable', () => {
    expect(bundler).toBeDefined()
  })
})
