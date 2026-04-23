import type { FormatResult, IFormatter } from '../../types/extras.types'

export interface PrettierModule {
  format(source: string, options?: Record<string, unknown>): Promise<string>
}

export interface PrettierFormatterOptions {
  prettier: PrettierModule
  plugins?: unknown[]
  prettierOptions?: Record<string, unknown>
}

const PARSER_BY_EXT: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'babel',
  jsx: 'babel',
  mjs: 'babel',
  cjs: 'babel',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  md: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
}

export function parserForPath(filepath: string): string | null {
  const dot = filepath.lastIndexOf('.')
  if (dot < 0) return null
  const ext = filepath.slice(dot + 1).toLowerCase()
  return PARSER_BY_EXT[ext] ?? null
}

export class PrettierFormatter implements IFormatter {
  private readonly prettier: PrettierModule
  private readonly plugins: unknown[]
  private readonly baseOptions: Record<string, unknown>

  constructor(opts: PrettierFormatterOptions) {
    this.prettier = opts.prettier
    this.plugins = opts.plugins ?? []
    this.baseOptions = opts.prettierOptions ?? {}
  }

  canFormat(filepath: string): boolean {
    return parserForPath(filepath) !== null
  }

  async format(
    source: string,
    options: { filepath: string; parser?: string }
  ): Promise<FormatResult> {
    const parser = options.parser ?? parserForPath(options.filepath)
    if (!parser) {
      throw new Error(`No Prettier parser for ${options.filepath}`)
    }
    const formatted = await this.prettier.format(source, {
      ...this.baseOptions,
      filepath: options.filepath,
      parser,
      plugins: this.plugins,
    })
    return { formatted, changed: formatted !== source }
  }
}

/**
 * Convenience wrapper for one-off formatting. Prefer instantiating PrettierFormatter
 * once when formatting repeatedly.
 */
export async function formatCode(
  prettier: PrettierModule,
  source: string,
  filepath: string,
  plugins: unknown[] = [],
  prettierOptions: Record<string, unknown> = {}
): Promise<FormatResult> {
  return new PrettierFormatter({ prettier, plugins, prettierOptions }).format(source, {
    filepath,
  })
}
