import type { DirEntry } from '@vertex/runtime';
import type { VertexFile, VertexFolder } from '@vertex/types';

/** Minimal FS surface the tree builder needs — satisfied by OPFSFS/MemoryFS. */
export interface TreeFs {
  readDir(path: string): Promise<DirEntry[]>;
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.angular',
  'build',
  '.next',
]);

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  html: 'html', css: 'css', scss: 'css', json: 'json', md: 'markdown',
  py: 'python', rs: 'rust', go: 'go', sh: 'bash', yaml: 'yaml', yml: 'yaml',
  toml: 'toml', txt: 'text',
};

export function isVertexFolder(
  node: VertexFile | VertexFolder,
): node is VertexFolder {
  return 'children' in node;
}

export function toVertexFile(path: string, name: string): VertexFile {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return {
    id: path,
    name,
    path,
    content: '',
    language: LANGUAGE_MAP[ext] ?? 'text',
    isDirty: false,
  };
}

/**
 * Reads exactly one directory level. Sub-directories are returned as collapsed
 * folders with empty `children` so large repos aren't walked eagerly; call
 * {@link readLevel} again (via a folder toggle) when the user expands one.
 */
export async function readLevel(
  fs: TreeFs,
  dir: string,
): Promise<(VertexFile | VertexFolder)[]> {
  const entries = await fs.readDir(dir);
  const sorted = entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const children: (VertexFile | VertexFolder)[] = [];
  for (const entry of sorted) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    if (entry.type === 'directory') {
      children.push({
        id: entry.path,
        name: entry.name,
        path: entry.path,
        children: [],
        isExpanded: false,
      });
    } else {
      children.push(toVertexFile(entry.path, entry.name));
    }
  }

  return children;
}

/** Builds the visible root: its immediate children loaded, sub-folders lazy. */
export async function buildRootFolder(
  fs: TreeFs,
  dir: string,
  name: string,
): Promise<VertexFolder> {
  return {
    id: dir,
    name,
    path: dir,
    children: await readLevel(fs, dir),
    isExpanded: true,
  };
}

/**
 * Rebuilds the tree from the FS while preserving expansion. Only the levels that
 * were already loaded/expanded in `previous` are re-read (recursively); folders
 * that were still collapsed stay lazy. This keeps each folder's `isExpanded`
 * consistent with what the sidebar renders, so a refresh reflects on-disk
 * changes without collapsing the user's expansion or leaving open-but-empty
 * folders behind.
 */
export async function refreshTree(
  fs: TreeFs,
  previous: VertexFolder,
): Promise<VertexFolder> {
  const wasLoaded = previous.isExpanded || previous.children.length > 0;
  if (!wasLoaded) {
    // Untouched folder — keep it exactly as lazy as it was.
    return {
      id: previous.path,
      name: previous.name,
      path: previous.path,
      children: [],
      isExpanded: false,
    };
  }

  const level = await readLevel(fs, previous.path);
  const prevFolders = new Map<string, VertexFolder>();
  for (const child of previous.children) {
    if (isVertexFolder(child)) prevFolders.set(child.path, child);
  }

  const children: (VertexFile | VertexFolder)[] = [];
  for (const node of level) {
    if (isVertexFolder(node)) {
      const prevChild = prevFolders.get(node.path);
      children.push(prevChild ? await refreshTree(fs, prevChild) : node);
    } else {
      children.push(node);
    }
  }

  return {
    id: previous.path,
    name: previous.name,
    path: previous.path,
    children,
    isExpanded: true,
  };
}
