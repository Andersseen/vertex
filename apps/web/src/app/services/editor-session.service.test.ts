import { describe, expect, it, beforeEach } from 'bun:test';
import { EditorSessionService } from './editor-session.service';
import type { VertexFile } from '@vertex/types';

function createMockStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  } as Storage;
}

describe('EditorSessionService', () => {
  let service: EditorSessionService;

  beforeEach(() => {
    globalThis.sessionStorage = createMockStorage();
    service = new EditorSessionService();
    sessionStorage.clear();
  });

  it('should start with no files', () => {
    expect(service.files()).toEqual([]);
    expect(service.activeFile()).toBeNull();
  });

  it('should open a file and make it active', () => {
    const file: VertexFile = {
      id: '1',
      name: 'test.ts',
      path: '/test.ts',
      content: 'const x = 1;',
      language: 'typescript',
      isDirty: false,
    };

    service.open(file);

    expect(service.files()).toEqual([file]);
    expect(service.activeFile()).toEqual(file);
    expect(service.activeId()).toBe('1');
  });

  it('should not duplicate already open files', () => {
    const file: VertexFile = {
      id: '1',
      name: 'test.ts',
      path: '/test.ts',
      content: 'const x = 1;',
      language: 'typescript',
      isDirty: false,
    };

    service.open(file);
    service.open(file);

    expect(service.files()).toHaveLength(1);
  });

  it('should update file content when re-opened with different content', () => {
    const file: VertexFile = {
      id: '1',
      name: 'test.ts',
      path: '/test.ts',
      content: 'const x = 1;',
      language: 'typescript',
      isDirty: false,
    };

    service.open(file);
    service.open({ ...file, content: 'const y = 2;' });

    expect(service.files()[0].content).toBe('const y = 2;');
  });

  it('should select a file', () => {
    const file1: VertexFile = { id: '1', name: 'a.ts', path: '/a.ts', content: '', language: 'typescript', isDirty: false };
    const file2: VertexFile = { id: '2', name: 'b.ts', path: '/b.ts', content: '', language: 'typescript', isDirty: false };

    service.open(file1);
    service.open(file2);
    service.select(file1);

    expect(service.activeId()).toBe('1');
  });

  it('should close a file and update active file', () => {
    const file1: VertexFile = { id: '1', name: 'a.ts', path: '/a.ts', content: '', language: 'typescript', isDirty: false };
    const file2: VertexFile = { id: '2', name: 'b.ts', path: '/b.ts', content: '', language: 'typescript', isDirty: false };

    service.open(file1);
    service.open(file2);
    service.close(file1);

    expect(service.files()).toHaveLength(1);
    expect(service.activeId()).toBe('2');
  });

  it('should set content and mark dirty', () => {
    const file: VertexFile = { id: '1', name: 'a.ts', path: '/a.ts', content: '', language: 'typescript', isDirty: false };

    service.open(file);
    service.setContent('1', 'updated');

    expect(service.files()[0].content).toBe('updated');
    expect(service.files()[0].isDirty).toBe(true);
  });

  it('should mark file clean', () => {
    const file: VertexFile = { id: '1', name: 'a.ts', path: '/a.ts', content: '', language: 'typescript', isDirty: true };

    service.open(file);
    service.markClean('1');

    expect(service.files()[0].isDirty).toBe(false);
  });

  it('should persist session to sessionStorage', () => {
    const file: VertexFile = { id: '1', name: 'a.ts', path: '/a.ts', content: '', language: 'typescript', isDirty: false };

    service.open(file);
    const saved = sessionStorage.getItem('vertex:editor');

    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.activeFileId).toBe('1');
    expect(parsed.openFiles).toHaveLength(1);
  });

  it('should restore from sessionStorage', () => {
    const saved = JSON.stringify({
      openFiles: [{ id: '1', name: 'a.ts', path: '/a.ts', language: 'typescript' }],
      activeFileId: '1',
    });
    sessionStorage.setItem('vertex:editor', saved);

    service.restore([{ id: '1', name: 'a.ts', path: '/a.ts', content: 'restored', language: 'typescript', isDirty: false }], '1');

    expect(service.files()).toHaveLength(1);
    expect(service.files()[0].content).toBe('restored');
    expect(service.activeId()).toBe('1');
  });

  it('should clear session', () => {
    const file: VertexFile = { id: '1', name: 'a.ts', path: '/a.ts', content: '', language: 'typescript', isDirty: false };

    service.open(file);
    service.clear();

    expect(service.files()).toEqual([]);
    expect(service.activeId()).toBeNull();
    expect(sessionStorage.getItem('vertex:editor')).toBeNull();
  });
});
