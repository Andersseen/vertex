export interface BuildConfig {
  entryPoint: string
  outDir: string
  format: 'esm' | 'cjs' | 'iife'
  target: 'browser' | 'node' | 'worker'
  minify: boolean
  sourcemap: boolean
  npmResolution: 'cdn'
  cdnUrl: string
  tsconfig?: string
  /**
   * When true, Tailwind directives (@tailwind, @apply, @import "tailwindcss")
   * are stripped from CSS so the preview can rely on the Tailwind CDN.
   */
  tailwindStrip?: boolean
}

export interface BuildOutputFile {
  path: string
  content: string
  size: number
}

export interface BuildError {
  file: string
  line: number
  column: number
  message: string
}

export interface BuildWarning extends BuildError {}

export interface BuildResult {
  success: boolean
  files: BuildOutputFile[]
  errors: BuildError[]
  warnings: BuildWarning[]
  duration: number
  stats: {
    inputFiles: number
    outputSize: number
  }
}

export type BuildProgressCallback = (
  phase: 'init' | 'resolve' | 'bundle' | 'write',
  percent: number
) => void

export interface IBundler {
  build(config: BuildConfig, onProgress?: BuildProgressCallback): Promise<BuildResult>
  transform(code: string, loader: 'ts' | 'tsx' | 'js' | 'jsx'): Promise<string>
  dispose(): void
}
