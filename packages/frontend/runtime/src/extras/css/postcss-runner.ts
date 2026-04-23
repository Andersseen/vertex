import type {
  CssTransformResult,
  Diagnostic,
  ICssProcessor,
} from '../../types/extras.types'

export interface PostcssWarning {
  line?: number
  column?: number
  text: string
}

export interface PostcssSourceMap {
  toString(): string
}

export interface PostcssResult {
  css: string
  map?: PostcssSourceMap
  warnings(): PostcssWarning[]
}

export interface PostcssProcessor {
  process(css: string, options?: {
    from?: string
    map?: boolean | { inline?: boolean }
  }): Promise<PostcssResult>
}

export interface PostcssModule {
  (plugins?: unknown[]): PostcssProcessor
}

export interface PostcssRunnerOptions {
  postcss: PostcssModule
  plugins?: unknown[]
}

export class PostcssRunner implements ICssProcessor {
  private readonly processor: PostcssProcessor

  constructor(opts: PostcssRunnerOptions) {
    this.processor = opts.postcss(opts.plugins ?? [])
  }

  async process(css: string, options: { from: string }): Promise<CssTransformResult> {
    try {
      const result = await this.processor.process(css, {
        from: options.from,
        map: { inline: false },
      })
      const diagnostics: Diagnostic[] = result.warnings().map((w) => ({
        file: options.from,
        line: w.line ?? 1,
        column: w.column ?? 1,
        message: w.text,
        severity: 'warning',
        source: 'postcss',
      }))
      return {
        css: result.css,
        map: result.map?.toString(),
        diagnostics,
      }
    } catch (err) {
      const cssErr = err as {
        line?: number
        column?: number
        reason?: string
        message?: string
        name?: string
      }
      return {
        css,
        diagnostics: [
          {
            file: options.from,
            line: cssErr.line ?? 1,
            column: cssErr.column ?? 1,
            message: cssErr.reason ?? cssErr.message ?? 'PostCSS error',
            severity: 'error',
            source: 'postcss',
            code: cssErr.name,
          },
        ],
      }
    }
  }
}
