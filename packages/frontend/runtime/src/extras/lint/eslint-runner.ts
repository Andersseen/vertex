import type { Diagnostic, IESLintRunner, LintResult } from '../../types/extras.types'

export interface ESLintMessage {
  ruleId?: string | null
  severity: 0 | 1 | 2
  message: string
  line?: number
  column?: number
  endLine?: number
  endColumn?: number
}

export interface ESLintFixReport {
  fixed: boolean
  output: string
  messages: ESLintMessage[]
}

export interface ESLintLinterLike {
  verify(source: string, config: unknown, options?: { filename?: string }): ESLintMessage[]
  verifyAndFix(source: string, config: unknown, options?: { filename?: string }): ESLintFixReport
}

export interface ESLintRunnerOptions {
  linter: ESLintLinterLike
  config?: unknown
}

export class ESLintRunner implements IESLintRunner {
  private readonly linter: ESLintLinterLike
  private readonly config: unknown

  constructor(opts: ESLintRunnerOptions) {
    this.linter = opts.linter
    this.config = opts.config ?? defaultFlatConfig()
  }

  async lint(path: string, source: string): Promise<LintResult> {
    const messages = this.linter.verify(source, this.config, { filename: path })
    return { diagnostics: messages.map((m) => toDiagnostic(path, m)) }
  }

  async fix(path: string, source: string): Promise<LintResult> {
    const result = this.linter.verifyAndFix(source, this.config, { filename: path })
    return {
      diagnostics: result.messages.map((m) => toDiagnostic(path, m)),
      fixed: result.fixed ? result.output : undefined,
    }
  }
}

function defaultFlatConfig(): unknown {
  return {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'warn',
      'no-empty': 'warn',
      'no-debugger': 'error',
    },
  }
}

function toDiagnostic(file: string, m: ESLintMessage): Diagnostic {
  return {
    file,
    line: m.line ?? 1,
    column: m.column ?? 1,
    endLine: m.endLine,
    endColumn: m.endColumn,
    message: m.message,
    severity: m.severity === 2 ? 'error' : 'warning',
    code: m.ruleId ?? undefined,
    source: 'eslint',
  }
}
