import type ts from 'typescript'
import type { Diagnostic, ITypeScriptChecker } from '../../types/extras.types'

type TsModule = typeof import('typescript')

export interface TypeScriptCheckerOptions {
  ts: TsModule
  compilerOptions?: ts.CompilerOptions
  projectRoot?: string
  libFiles?: Record<string, string>
}

export class TypeScriptChecker implements ITypeScriptChecker {
  private readonly ts: TsModule
  private readonly projectRoot: string
  private readonly compilerOptions: ts.CompilerOptions
  private readonly libFiles: Record<string, string>
  private readonly fileVersions = new Map<string, number>()
  private readonly fileContents = new Map<string, string>()
  private service: ts.LanguageService | null = null

  constructor(opts: TypeScriptCheckerOptions) {
    this.ts = opts.ts
    this.projectRoot = opts.projectRoot ?? '/'
    this.libFiles = opts.libFiles ?? {}
    this.compilerOptions = opts.compilerOptions ?? {
      target: this.ts.ScriptTarget.ES2022,
      module: this.ts.ModuleKind.ESNext,
      moduleResolution: this.ts.ModuleResolutionKind.Bundler,
      jsx: this.ts.JsxEmit.Preserve,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      isolatedModules: true,
      allowImportingTsExtensions: false,
      noEmit: true,
      lib: ['esnext', 'dom', 'dom.iterable'],
    }
  }

  updateFile(path: string, content: string): void {
    this.fileContents.set(path, content)
    this.fileVersions.set(path, (this.fileVersions.get(path) ?? 0) + 1)
  }

  deleteFile(path: string): void {
    this.fileContents.delete(path)
    this.fileVersions.delete(path)
  }

  async getDiagnostics(path: string): Promise<Diagnostic[]> {
    const service = this.getService()
    const syntactic = service.getSyntacticDiagnostics(path)
    const semantic = service.getSemanticDiagnostics(path)
    return [...syntactic, ...semantic].map((d) => this.toDiagnostic(d))
  }

  async getAllDiagnostics(): Promise<Diagnostic[]> {
    const service = this.getService()
    const out: Diagnostic[] = []
    for (const path of this.fileContents.keys()) {
      for (const d of service.getSyntacticDiagnostics(path)) out.push(this.toDiagnostic(d))
      for (const d of service.getSemanticDiagnostics(path)) out.push(this.toDiagnostic(d))
    }
    return out
  }

  dispose(): void {
    this.service?.dispose()
    this.service = null
    this.fileContents.clear()
    this.fileVersions.clear()
  }

  private getService(): ts.LanguageService {
    if (this.service) return this.service
    const host: ts.LanguageServiceHost = {
      getScriptFileNames: () => [...this.fileContents.keys()],
      getScriptVersion: (fileName) => String(this.fileVersions.get(fileName) ?? 0),
      getScriptSnapshot: (fileName) => {
        const content = this.fileContents.get(fileName) ?? this.libFiles[fileName]
        if (content === undefined) return undefined
        return this.ts.ScriptSnapshot.fromString(content)
      },
      getCurrentDirectory: () => this.projectRoot,
      getCompilationSettings: () => this.compilerOptions,
      getDefaultLibFileName: (options) => this.ts.getDefaultLibFilePath(options),
      fileExists: (fileName) =>
        this.fileContents.has(fileName) || fileName in this.libFiles,
      readFile: (fileName) =>
        this.fileContents.get(fileName) ?? this.libFiles[fileName],
      readDirectory: () => [],
      directoryExists: () => true,
      getDirectories: () => [],
    }
    this.service = this.ts.createLanguageService(host, this.ts.createDocumentRegistry())
    return this.service
  }

  private toDiagnostic(d: ts.Diagnostic): Diagnostic {
    const fileName = d.file?.fileName ?? '<unknown>'
    let line = 0
    let column = 0
    let endLine: number | undefined
    let endColumn: number | undefined
    if (d.file && typeof d.start === 'number') {
      const start = d.file.getLineAndCharacterOfPosition(d.start)
      line = start.line + 1
      column = start.character + 1
      if (typeof d.length === 'number') {
        const end = d.file.getLineAndCharacterOfPosition(d.start + d.length)
        endLine = end.line + 1
        endColumn = end.character + 1
      }
    }
    return {
      file: fileName,
      line,
      column,
      endLine,
      endColumn,
      message: this.ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      severity:
        d.category === this.ts.DiagnosticCategory.Error
          ? 'error'
          : d.category === this.ts.DiagnosticCategory.Warning
            ? 'warning'
            : 'info',
      code: d.code,
      source: 'typescript',
    }
  }
}
