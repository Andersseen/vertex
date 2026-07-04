import { describe, test, expect } from 'bun:test';
import type { DirEntry } from '@vertex/runtime';
import type { VertexFile, VertexFolder } from '@vertex/types';
import {
  buildRootFolder,
  readLevel,
  refreshTree,
  isVertexFolder,
  type TreeFs,
} from '../file-tree';

/**
 * Minimal in-memory FS seeded from a flat list of file paths. Directories are
 * implicit (derived from path segments), mirroring MemoryFS/OPFS behaviour.
 */
class FakeFs implements TreeFs {
  constructor(private files: Set<string>) {}

  add(path: string): void {
    this.files.add(path);
  }
  remove(path: string): void {
    this.files.delete(path);
  }

  async readDir(dir: string): Promise<DirEntry[]> {
    const prefix = dir === '/' ? '/' : dir + '/';
    const seen = new Set<string>();
    const entries: DirEntry[] = [];
    for (const file of this.files) {
      if (!file.startsWith(prefix)) continue;
      const rest = file.slice(prefix.length);
      const segment = rest.split('/')[0];
      if (!segment || seen.has(segment)) continue;
      seen.add(segment);
      entries.push({
        name: segment,
        path: prefix + segment,
        type: rest.includes('/') ? 'directory' : 'file',
      });
    }
    return entries;
  }
}

function fs(...paths: string[]): FakeFs {
  return new FakeFs(new Set(paths));
}

function childNamed(folder: VertexFolder, name: string): VertexFile | VertexFolder {
  const found = folder.children.find((c) => c.name === name);
  if (!found) throw new Error(`No child named ${name}`);
  return found;
}

describe('buildRootFolder', () => {
  test('loads the top level and leaves sub-folders lazy', async () => {
    const root = await buildRootFolder(
      fs('/README.md', '/src/index.ts', '/src/app/main.ts'),
      '/',
      'repo',
    );

    expect(root.isExpanded).toBe(true);
    expect(root.children.map((c) => c.name)).toEqual(['src', 'README.md']); // dirs first, then alpha

    const src = childNamed(root, 'src') as VertexFolder;
    expect(isVertexFolder(src)).toBe(true);
    expect(src.isExpanded).toBe(false);
    expect(src.children).toEqual([]); // lazy, not walked eagerly
  });

  test('ignores heavy/hidden directories', async () => {
    const root = await buildRootFolder(
      fs('/index.ts', '/node_modules/x/y.js', '/.git/config', '/dist/out.js'),
      '/',
      'repo',
    );
    expect(root.children.map((c) => c.name)).toEqual(['index.ts']);
  });

  test('assigns a language to files by extension', async () => {
    const root = await buildRootFolder(fs('/a.ts', '/b.unknown'), '/', 'repo');
    expect((childNamed(root, 'a.ts') as VertexFile).language).toBe('typescript');
    expect((childNamed(root, 'b.unknown') as VertexFile).language).toBe('text');
  });
});

describe('readLevel', () => {
  test('returns files and collapsed sub-folders for one level', async () => {
    const level = await readLevel(fs('/src/a.ts', '/src/sub/b.ts'), '/src');
    expect(level.map((c) => c.name)).toEqual(['sub', 'a.ts']);
    const sub = level.find((c) => c.name === 'sub') as VertexFolder;
    expect(sub.children).toEqual([]);
  });
});

describe('refreshTree (preserves expansion)', () => {
  async function expandedTree(store: FakeFs): Promise<VertexFolder> {
    // Root with src expanded, and src/app still collapsed (lazy).
    const root = await buildRootFolder(store, '/', 'repo');
    const src = childNamed(root, 'src') as VertexFolder;
    src.isExpanded = true;
    src.children = await readLevel(store, '/src');
    return root;
  }

  test('keeps expanded folders open and reflects a newly added file', async () => {
    const store = fs('/README.md', '/src/index.ts', '/src/app/main.ts');
    const tree = await expandedTree(store);

    store.add('/src/added.ts');
    const refreshed = await refreshTree(store, tree);

    const src = childNamed(refreshed, 'src') as VertexFolder;
    expect(src.isExpanded).toBe(true);
    expect(src.children.map((c) => c.name)).toEqual(['app', 'added.ts', 'index.ts']);

    // The un-expanded nested folder stays lazy and collapsed — consistent state.
    const app = childNamed(src, 'app') as VertexFolder;
    expect(app.isExpanded).toBe(false);
    expect(app.children).toEqual([]);
  });

  test('reflects a deleted file at an expanded level', async () => {
    const store = fs('/src/index.ts', '/src/old.ts');
    const tree = await expandedTree(store);

    store.remove('/src/old.ts');
    const refreshed = await refreshTree(store, tree);

    const src = childNamed(refreshed, 'src') as VertexFolder;
    expect(src.children.map((c) => c.name)).toEqual(['index.ts']);
  });

  test('leaves never-expanded folders lazy (no open-but-empty nodes)', async () => {
    const store = fs('/src/index.ts', '/lib/util.ts');
    const root = await buildRootFolder(store, '/', 'repo'); // nothing expanded

    const refreshed = await refreshTree(store, root);

    for (const name of ['src', 'lib']) {
      const folder = childNamed(refreshed, name) as VertexFolder;
      expect(folder.isExpanded).toBe(false);
      expect(folder.children).toEqual([]);
    }
  });

  test('preserves deep (nested) expansion', async () => {
    const store = fs('/src/app/main.ts', '/src/app/util.ts', '/src/index.ts');
    const root = await buildRootFolder(store, '/', 'repo');
    const src = childNamed(root, 'src') as VertexFolder;
    src.isExpanded = true;
    src.children = await readLevel(store, '/src');
    const app = childNamed(src, 'app') as VertexFolder;
    app.isExpanded = true;
    app.children = await readLevel(store, '/src/app');

    store.add('/src/app/new.ts');
    const refreshed = await refreshTree(store, root);

    const refreshedApp = childNamed(
      childNamed(refreshed, 'src') as VertexFolder,
      'app',
    ) as VertexFolder;
    expect(refreshedApp.isExpanded).toBe(true);
    expect(refreshedApp.children.map((c) => c.name)).toEqual([
      'main.ts',
      'new.ts',
      'util.ts',
    ]);
  });

  test('drops an expanded folder that was deleted on disk', async () => {
    const store = fs('/src/index.ts', '/src/app/main.ts');
    const tree = await expandedTree(store);

    // Delete the whole src/app directory (its only file).
    store.remove('/src/app/main.ts');
    const refreshed = await refreshTree(store, tree);

    const src = childNamed(refreshed, 'src') as VertexFolder;
    expect(src.children.map((c) => c.name)).toEqual(['index.ts']);
  });
});
