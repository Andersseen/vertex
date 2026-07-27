import { describe, expect, test } from 'bun:test';
import { LanguageRegistry } from './language-registry';

describe('LanguageRegistry', () => {
  test('normalizes aliases and caches loaded languages', async () => {
    let calls = 0;
    const registry = new LanguageRegistry();
    registry.register(
      'typescript',
      async () => {
        calls += 1;
        const { javascript } = await import('@codemirror/lang-javascript');
        return javascript({ typescript: true });
      },
      ['ts'],
    );

    expect(registry.supports(' TS ')).toBe(true);
    expect(await registry.load('ts')).not.toBeNull();
    expect(await registry.load('typescript')).not.toBeNull();
    expect(calls).toBe(1);
  });

  test('returns null for unsupported languages', async () => {
    const registry = new LanguageRegistry();
    expect(await registry.load('unknown')).toBeNull();
  });
});
