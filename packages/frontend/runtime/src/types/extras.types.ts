export type DiagnosticSeverity = 'error' | 'warning' | 'info'

export interface Diagnostic {
  file: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  message: string
  severity: DiagnosticSeverity
  code?: string | number
  source?: 'typescript' | 'eslint' | 'postcss' | 'sass' | 'prettier'
}

export interface TypeCheckError extends Diagnostic {
  source?: 'typescript'
}

export interface LintResult {
  diagnostics: Diagnostic[]
  fixed?: string
}

export interface FormatResult {
  formatted: string
  changed: boolean
}

export interface CssTransformResult {
  css: string
  map?: string
  diagnostics: Diagnostic[]
}

export interface SassCompileResult {
  css: string
  map?: string
  loadedUrls: string[]
  diagnostics: Diagnostic[]
}

export interface ITypeScriptChecker {
  updateFile(path: string, content: string): void
  deleteFile(path: string): void
  getDiagnostics(path: string): Promise<Diagnostic[]>
  getAllDiagnostics(): Promise<Diagnostic[]>
  dispose(): void
}

export interface IESLintRunner {
  lint(path: string, source: string): Promise<LintResult>
  fix(path: string, source: string): Promise<LintResult>
}

export interface IFormatter {
  format(source: string, options: { filepath: string; parser?: string }): Promise<FormatResult>
  canFormat(filepath: string): boolean
}

export interface ICssProcessor {
  process(css: string, options: { from: string }): Promise<CssTransformResult>
}

export interface ISassCompiler {
  compile(path: string): Promise<SassCompileResult>
  compileString(source: string, options?: { url?: string }): Promise<SassCompileResult>
}
