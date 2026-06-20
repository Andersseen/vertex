import type * as ts from 'typescript';

export interface DiagnosticResult {
  file: string;
  start: number;
  length: number;
  message: string;
  category: 'error' | 'warning' | 'suggestion' | 'message';
  code: number;
}

export interface CompletionItem {
  label: string;
  detail?: string;
  documentation?: string;
  kind: string;
}

export type LspStatus = 'idle' | 'loading' | 'ready' | 'error';

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

let tsModule: typeof ts | null = null;
let languageService: ts.LanguageService | null = null;
const files = new Map<string, { content: string; version: number }>();

async function loadTypeScript(): Promise<typeof ts> {
  if (tsModule) return tsModule;
  tsModule = await import('typescript');
  return tsModule;
}

function getLanguageService(tsInstance: typeof ts): ts.LanguageService {
  if (languageService) return languageService;

  const compilerOptions: ts.CompilerOptions = {
    target: tsInstance.ScriptTarget.ES2022,
    module: tsInstance.ModuleKind.ESNext,
    moduleResolution: tsInstance.ModuleResolutionKind.NodeNext,
    jsx: tsInstance.JsxEmit.React,
    allowJs: true,
    strict: true,
    noEmit: true,
    noLib: true,
  };

  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => [...files.keys(), '/lib.d.ts'],
    getScriptVersion: (fileName) => files.get(fileName)?.version.toString() ?? '0',
    getScriptSnapshot: (fileName) => {
      if (fileName === '/lib.d.ts') return tsInstance.ScriptSnapshot.fromString(LIB_D_TS);
      const data = files.get(fileName);
      if (!data) return undefined;
      return tsInstance.ScriptSnapshot.fromString(data.content);
    },
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: () => '/lib.d.ts',
    fileExists: (fileName) => fileName === '/lib.d.ts' || files.has(fileName),
    readFile: (fileName) => (fileName === '/lib.d.ts' ? LIB_D_TS : files.get(fileName)?.content),
  };

  languageService = tsInstance.createLanguageService(servicesHost, tsInstance.createDocumentRegistry());
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

function convertCategory(category: ts.DiagnosticCategory): DiagnosticResult['category'] {
  switch (category) {
    case 1:
      return 'error';
    case 0:
      return 'warning';
    case 2:
      return 'suggestion';
    default:
      return 'message';
  }
}

export class TsLanguageService {
  private status: LspStatus = 'idle';
  private statusListeners = new Set<(status: LspStatus) => void>();
  private loadPromise: Promise<void> | null = null;

  onStatusChange(callback: (status: LspStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  private setStatus(status: LspStatus): void {
    this.status = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  private async ensureLoaded(): Promise<void> {
    if (tsModule) return;
    if (this.loadPromise) return this.loadPromise;

    this.setStatus('loading');
    this.loadPromise = loadTypeScript()
      .then((ts) => {
        getLanguageService(ts);
        this.setStatus('ready');
      })
      .catch((err) => {
        console.error('[TsLanguageService] failed to load TypeScript', err);
        this.setStatus('error');
        throw err;
      });

    return this.loadPromise;
  }

  get currentStatus(): LspStatus {
    return this.status;
  }

  async updateFile(path: string, content: string): Promise<void> {
    await this.ensureLoaded();
    updateFile(path, content);
  }

  async removeFile(path: string): Promise<void> {
    await this.ensureLoaded();
    removeFile(path);
  }

  async getDiagnostics(path: string): Promise<DiagnosticResult[]> {
    await this.ensureLoaded();
    const ls = getLanguageService(tsModule!);
    const syntactic = ls.getSyntacticDiagnostics(path);
    const semantic = ls.getSemanticDiagnostics(path);
    const raw = [...syntactic, ...semantic];
    return raw.map((d) => ({
      file: path,
      start: d.start ?? 0,
      length: d.length ?? 0,
      message: typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText,
      category: convertCategory(d.category),
      code: d.code,
    }));
  }

  async getCompletions(path: string, offset: number): Promise<CompletionItem[]> {
    await this.ensureLoaded();
    const ls = getLanguageService(tsModule!);
    const completions = ls.getCompletionsAtPosition(path, offset, undefined);
    if (!completions) return [];
    return completions.entries
      .slice(0, 50)
      .map((entry) => ls.getCompletionEntryDetails(path, offset, entry.name, undefined, undefined, undefined, undefined))
      .filter((d): d is ts.CompletionEntryDetails => d !== undefined)
      .map((entry) => ({
        label: entry.name,
        detail: entry.displayParts?.map((p) => p.text).join(''),
        documentation: typeof entry.documentation?.[0] === 'string' ? entry.documentation[0] : entry.documentation?.[0]?.text,
        kind: entry.kind,
      }));
  }

  async getQuickInfo(path: string, offset: number): Promise<string | undefined> {
    await this.ensureLoaded();
    const ls = getLanguageService(tsModule!);
    const info = ls.getQuickInfoAtPosition(path, offset);
    if (!info) return undefined;

    const display = info.displayParts?.map((p) => p.text).join('');
    const docs =
      typeof info.documentation?.[0] === 'string'
        ? info.documentation[0]
        : info.documentation?.[0]?.text;

    if (!display && !docs) return undefined;
    return docs ? `${display}\n\n${docs}` : display;
  }

  destroy(): void {
    if (languageService) {
      languageService.dispose();
      languageService = null;
    }
    tsModule = null;
    files.clear();
    this.setStatus('idle');
  }
}

export const tsLanguageService = new TsLanguageService();
