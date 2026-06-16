import type * as ts from 'typescript';

const TS_CDN = 'https://esm.sh/typescript@5.9.2';
const tsModulePromise: Promise<typeof ts> = import(TS_CDN);

interface FileRecord {
  content: string;
  version: number;
}

const files = new Map<string, FileRecord>();

// Minimal ambient declarations so basic examples type-check without lib files.
const LIB_D_TS = `
declare const console: { log(...args: any[]): void; error(...args: any[]): void; warn(...args: any[]): void };
declare const window: any;
declare const document: any;
declare const globalThis: any;
interface Promise<T> {
  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;
}
declare const Promise: {
  new <T>(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
  resolve<T>(value?: T | PromiseLike<T>): Promise<T>;
  reject<T = never>(reason?: any): Promise<T>;
};
interface Array<T> {
  length: number;
  push(...items: T[]): number;
  pop(): T | undefined;
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
  filter(callbackfn: (value: T, index: number, array: T[]) => any): T[];
  forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
}
`;

let languageService: ts.LanguageService | null = null;

async function getLanguageService(): Promise<ts.LanguageService> {
  if (languageService) return languageService;

  const ts = await tsModulePromise;

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.React,
    allowJs: true,
    strict: true,
    noEmit: true,
    noLib: true,
  };

  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => [...files.keys(), '/lib.d.ts'],
    getScriptVersion: (fileName) => files.get(fileName)?.version.toString() ?? '0',
    getScriptSnapshot: (fileName) => {
      if (fileName === '/lib.d.ts') return ts.ScriptSnapshot.fromString(LIB_D_TS);
      const data = files.get(fileName);
      if (!data) return undefined;
      return ts.ScriptSnapshot.fromString(data.content);
    },
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: () => '/lib.d.ts',
    fileExists: (fileName) => fileName === '/lib.d.ts' || files.has(fileName),
    readFile: (fileName) => (fileName === '/lib.d.ts' ? LIB_D_TS : files.get(fileName)?.content),
  };

  languageService = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
  return languageService;
}

function updateFile(path: string, content: string): void {
  const record = files.get(path);
  if (record) {
    record.content = content;
    record.version += 1;
  } else {
    files.set(path, { content, version: 1 });
  }
}

function removeFile(path: string): void {
  files.delete(path);
}

async function getDiagnostics(path: string): Promise<ts.Diagnostic[]> {
  const ls = await getLanguageService();
  const ts = await tsModulePromise;
  const syntactic = ls.getSyntacticDiagnostics(path);
  const semantic = ls.getSemanticDiagnostics(path);
  return [...syntactic, ...semantic];
}

async function getCompletions(path: string, offset: number): Promise<ts.CompletionEntryDetails[]> {
  const ls = await getLanguageService();
  const completions = ls.getCompletionsAtPosition(path, offset, undefined);
  if (!completions) return [];
  return completions.entries
    .slice(0, 50)
    .map((entry) => ls.getCompletionEntryDetails(path, offset, entry.name, undefined, undefined, undefined, undefined))
    .filter((d): d is ts.CompletionEntryDetails => d !== undefined);
}

async function getQuickInfo(path: string, offset: number): Promise<ts.QuickInfo | undefined> {
  const ls = await getLanguageService();
  return ls.getQuickInfoAtPosition(path, offset);
}

self.onmessage = async (event: MessageEvent) => {
  const { id, type, payload } = event.data as { id: string; type: string; payload: unknown };

  try {
    switch (type) {
      case 'update': {
        const { path, content } = payload as { path: string; content: string };
        updateFile(path, content);
        postMessage({ id, type, result: { ok: true } });
        break;
      }
      case 'remove': {
        const { path } = payload as { path: string };
        removeFile(path);
        postMessage({ id, type, result: { ok: true } });
        break;
      }
      case 'diagnostics': {
        const { path } = payload as { path: string };
        const diagnostics = await getDiagnostics(path);
        postMessage({ id, type, result: diagnostics });
        break;
      }
      case 'completions': {
        const { path, offset } = payload as { path: string; offset: number };
        const completions = await getCompletions(path, offset);
        postMessage({ id, type, result: completions });
        break;
      }
      case 'quickInfo': {
        const { path, offset } = payload as { path: string; offset: number };
        const info = await getQuickInfo(path, offset);
        postMessage({ id, type, result: info });
        break;
      }
      default:
        postMessage({ id, type, error: `Unknown message type: ${type}` });
    }
  } catch (error) {
    postMessage({ id, type, error: error instanceof Error ? error.message : String(error) });
  }
};
