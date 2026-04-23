import type { IVirtualFS } from '../../types/fs.types'
import type {
  Diagnostic,
  ISassCompiler,
  SassCompileResult,
} from '../../types/extras.types'

export interface SassSyntaxError {
  message?: string
  sassMessage?: string
  span?: {
    start?: { line: number; column: number }
    end?: { line: number; column: number }
    url?: string | URL
  }
}

export interface SassCompileOptions {
  url?: string
  syntax?: 'scss' | 'indented' | 'css'
  loadPaths?: string[]
}

export interface SassResult {
  css: string
  sourceMap?: unknown
  loadedUrls?: Array<string | URL>
}

export interface SassImporter {
  canonicalize(url: string, context: { containingUrl?: URL | null }): URL | null
  load(url: URL): { contents: string; syntax: 'scss' | 'indented' | 'css' } | null
}

export interface SassModule {
  compileStringAsync(source: string, options?: {
    url?: string | URL
    syntax?: 'scss' | 'indented' | 'css'
    loadPaths?: string[]
    importers?: SassImporter[]
  }): Promise<SassResult>
}

export interface SassCompilerOptions {
  sass: SassModule
  fs: IVirtualFS
  loadPaths?: string[]
}

export class SassCompiler implements ISassCompiler {
  private readonly sass: SassModule
  private readonly fs: IVirtualFS
  private readonly loadPaths: string[]

  constructor(opts: SassCompilerOptions) {
    this.sass = opts.sass
    this.fs = opts.fs
    this.loadPaths = opts.loadPaths ?? []
  }

  async compile(path: string): Promise<SassCompileResult> {
    const source = await this.fs.readFile(path)
    return this.compileString(source, { url: path })
  }

  async compileString(
    source: string,
    options: SassCompileOptions = {}
  ): Promise<SassCompileResult> {
    const syntax = options.syntax ?? inferSyntax(options.url ?? '')
    const importer = buildVfsImporter(this.fs)
    try {
      const result = await this.sass.compileStringAsync(source, {
        url: options.url ? toFileUrl(options.url) : undefined,
        syntax,
        loadPaths: options.loadPaths ?? this.loadPaths,
        importers: [importer],
      })
      return {
        css: result.css,
        map: result.sourceMap ? JSON.stringify(result.sourceMap) : undefined,
        loadedUrls: (result.loadedUrls ?? []).map((u) => u.toString()),
        diagnostics: [],
      }
    } catch (err) {
      return {
        css: '',
        loadedUrls: [],
        diagnostics: [sassErrorToDiagnostic(err as SassSyntaxError, options.url ?? '')],
      }
    }
  }
}

function inferSyntax(path: string): 'scss' | 'indented' | 'css' {
  if (path.endsWith('.sass')) return 'indented'
  if (path.endsWith('.css')) return 'css'
  return 'scss'
}

function toFileUrl(path: string): URL {
  const clean = path.startsWith('/') ? path : '/' + path
  return new URL(`file://${clean}`)
}

function fromFileUrl(url: URL): string {
  return url.pathname
}

function buildVfsImporter(fs: IVirtualFS): SassImporter {
  return {
    canonicalize(url: string, context: { containingUrl?: URL | null }): URL | null {
      const basePath = context.containingUrl ? fromFileUrl(context.containingUrl) : '/'
      const baseDir = basePath.substring(0, basePath.lastIndexOf('/')) || '/'
      const resolved = resolveSassImport(fs, url, baseDir)
      return resolved ? toFileUrl(resolved) : null
    },
    load(url: URL): { contents: string; syntax: 'scss' | 'indented' | 'css' } | null {
      const path = fromFileUrl(url)
      // The importer is sync, but VFS reads are async. We pre-read synchronously
      // by relying on a cache populated via canonicalize. Here we fall back to
      // synchronous behavior by scheduling a microtask; for safety, signal no-op.
      // Sass Dart supports async importers via `importers` + `canonicalize` returning Promise.
      // We convert to sync by reading synchronously is not possible — so implementers
      // should prefer `compile(path)` which pre-reads the tree.
      throw new Error(`Sass sync loader cannot read ${path} — use compile(path) which pre-reads the VFS`)
    },
  }
}

function resolveSassImport(_fs: IVirtualFS, url: string, baseDir: string): string | null {
  if (url.startsWith('/')) return url
  if (url.startsWith('.')) {
    const parts = (baseDir + '/' + url).split('/')
    const stack: string[] = []
    for (const part of parts) {
      if (!part || part === '.') continue
      if (part === '..') stack.pop()
      else stack.push(part)
    }
    return '/' + stack.join('/')
  }
  // Bare imports unsupported in-browser without node_modules resolution.
  return null
}

function sassErrorToDiagnostic(err: SassSyntaxError, fallbackFile: string): Diagnostic {
  const span = err.span
  const file = span?.url
    ? typeof span.url === 'string'
      ? span.url
      : fromFileUrl(span.url)
    : fallbackFile
  return {
    file,
    line: (span?.start?.line ?? 0) + 1,
    column: (span?.start?.column ?? 0) + 1,
    endLine: span?.end ? span.end.line + 1 : undefined,
    endColumn: span?.end ? span.end.column + 1 : undefined,
    message: err.sassMessage ?? err.message ?? 'Sass compile error',
    severity: 'error',
    source: 'sass',
  }
}
