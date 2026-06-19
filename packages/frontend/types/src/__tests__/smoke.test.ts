import { describe, it, expect } from 'bun:test';

describe('@vertex/types', () => {
  it('should be importable', async () => {
    const mod = await import('../index');

    expect(mod).toBeDefined();
  });

  it('should expose runtime-checkable type defaults', () => {
    const file: {
      id: string;
      name: string;
      path: string;
      content: string;
      language: string;
      isDirty: boolean;
    } = {
      id: 'smoke',
      name: 'smoke.ts',
      path: '/smoke.ts',
      content: '',
      language: 'typescript',
      isDirty: false,
    };

    expect(file.id).toBe('smoke');
  });
});
