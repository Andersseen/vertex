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

let workerInstance: Worker | null = null;
let messageId = 0;
const pending = new Map<string, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();

function getWorker(): Worker {
  if (workerInstance) return workerInstance;
  workerInstance = new Worker(new URL('./ts-worker.ts', import.meta.url), { type: 'module' });
  workerInstance.onmessage = (event: MessageEvent) => {
    const { id, result, error } = event.data as { id: string; result?: unknown; error?: string };
    const handler = pending.get(id);
    if (!handler) return;
    pending.delete(id);
    if (error) {
      handler.reject(new Error(error));
    } else {
      handler.resolve(result);
    }
  };
  workerInstance.onerror = (error) => {
    console.error('[TsLanguageService] worker error', error);
  };
  return workerInstance;
}

function post<T>(type: string, payload: unknown): Promise<T> {
  const id = `${++messageId}`;
  const worker = getWorker();
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
    worker.postMessage({ id, type, payload });
  });
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
  async updateFile(path: string, content: string): Promise<void> {
    await post('update', { path, content });
  }

  async removeFile(path: string): Promise<void> {
    await post('remove', { path });
  }

  async getDiagnostics(path: string): Promise<DiagnosticResult[]> {
    const raw = (await post<ts.Diagnostic[]>('diagnostics', { path })) ?? [];
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
    const raw = (await post<ts.CompletionEntryDetails[]>('completions', { path, offset })) ?? [];
    return raw.map((entry) => ({
      label: entry.name,
      detail: entry.displayParts?.map((p) => p.text).join(''),
      documentation: typeof entry.documentation?.[0] === 'string' ? entry.documentation[0] : entry.documentation?.[0]?.text,
      kind: entry.kind,
    }));
  }

  async getQuickInfo(path: string, offset: number): Promise<string | undefined> {
    const info = await post<ts.QuickInfo | undefined>('quickInfo', { path, offset });
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
    if (workerInstance) {
      workerInstance.terminate();
      workerInstance = null;
    }
  }
}

export const tsLanguageService = new TsLanguageService();
