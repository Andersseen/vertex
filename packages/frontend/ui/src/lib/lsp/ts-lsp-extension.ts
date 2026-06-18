import { linter, Diagnostic } from '@codemirror/lint';
import { autocompletion, CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { hoverTooltip } from '@codemirror/view';
import { tsLanguageService, type DiagnosticResult, type CompletionItem } from '@vertex/runtime/lsp';

function mapCategory(category: DiagnosticResult['category']): Diagnostic['severity'] {
  switch (category) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'suggestion':
      return 'hint';
    default:
      return 'info';
  }
}

export function tsLintExtension(path: string) {
  return linter(async (view) => {
    try {
      const content = view.state.doc.toString();
      await tsLanguageService.updateFile(path, content);
      const diagnostics = await tsLanguageService.getDiagnostics(path);
      return diagnostics.map((d: DiagnosticResult) => ({
        from: d.start,
        to: d.start + d.length,
        severity: mapCategory(d.category),
        message: d.message,
      }));
    } catch {
      return [];
    }
  });
}

function mapKind(kind: string): Completion['type'] | undefined {
  switch (kind) {
    case 'keyword':
      return 'keyword';
    case 'function':
    case 'method':
      return 'function';
    case 'class':
      return 'class';
    case 'interface':
      return 'interface';
    case 'variable':
    case 'const':
    case 'let':
      return 'variable';
    case 'module':
      return 'namespace';
    case 'property':
      return 'property';
    default:
      return undefined;
  }
}

export function tsAutocompleteExtension(path: string) {
  return autocompletion({
    override: [
      async (context: CompletionContext): Promise<CompletionResult | null> => {
        const { state, pos } = context;
        const content = state.doc.toString();

        try {
          await tsLanguageService.updateFile(path, content);
          const items = await tsLanguageService.getCompletions(path, pos);
          if (!items.length) return null;

          return {
            from: context.matchBefore(/[a-zA-Z0-9_$]*$/)?.from ?? pos,
            options: items.map((item: CompletionItem) => ({
              label: item.label,
              detail: item.detail,
              info: item.documentation,
              type: mapKind(item.kind),
              apply: item.label,
            })),
          };
        } catch {
          return null;
        }
      },
    ],
  });
}

export function tsHoverExtension(path: string) {
  return hoverTooltip(async (view, pos, side) => {
    const content = view.state.doc.toString();

    try {
      await tsLanguageService.updateFile(path, content);
      const info = await tsLanguageService.getQuickInfo(path, pos);
      if (!info) return null;

      const text = info;
      if (!text.trim()) return null;

      return {
        pos,
        above: true,
        create() {
          const dom = document.createElement('div');
          dom.className = 'vertex-ts-hover-tooltip';
          dom.textContent = text;
          return { dom };
        },
      };
    } catch {
      return null;
    }
  });
}

export function tsLspExtensions(path: string) {
  return [tsLintExtension(path), tsAutocompleteExtension(path), tsHoverExtension(path)];
}
