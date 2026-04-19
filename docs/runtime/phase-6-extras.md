# Phase 6 — Extras (CSS, TypeScript Checker, ESLint)
> **Objetivo:** Completar el IDE con herramientas de calidad de código que corren en browser.
> **Prerrequisito:** Phases 1-5 completadas o según necesidad (cada extra es independiente).
> **Duración estimada:** Indefinida — añadir según necesidad del proyecto
> **Nota:** Esta fase NO es un bloqueante para las phases anteriores. Se construye en paralelo con la web app.

---

## Extras disponibles (independientes entre sí)

Cada extra se implementa de forma aislada. Puedes añadir solo los que necesites.

---

## Extra A — PostCSS + Tailwind en browser

### Cuándo añadirlo
Cuando los proyectos que buildeas usen Tailwind CSS.

### Dependencias
```bash
bun add postcss autoprefixer
# Tailwind v4 tiene su propio WASM, no necesita Node.js
bun add @tailwindcss/vite  # solo como referencia de la API
```

### Implementación

```typescript
// packages/frontend/runtime/src/css/postcss-runner.ts
import postcss from 'postcss'
import autoprefixer from 'autoprefixer'
import type { IVirtualFS } from '../types/fs.types'

export async function processCSS(
  css: string,
  options: {
    tailwind?: boolean
    autoprefixer?: boolean
    minify?: boolean
  } = {}
): Promise<string> {
  const plugins: postcss.Plugin[] = []

  if (options.autoprefixer) {
    plugins.push(autoprefixer())
  }

  // Tailwind v4 tiene una API directa para browser
  // Se añade aquí cuando esté estable
  if (options.tailwind) {
    // TODO: integrar @tailwindcss/browser cuando esté disponible
    console.warn('Tailwind en browser: pendiente de @tailwindcss/browser')
  }

  const result = await postcss(plugins).process(css, { from: undefined })
  return result.css
}
```

**Plugin de esbuild para CSS:**
```typescript
// Añadir al bundler (Phase 2) como plugin opcional
export function cssPlugin(fs: IVirtualFS): esbuild.Plugin {
  return {
    name: 'vertex-css',
    setup(build) {
      build.onLoad({ filter: /\.css$/, namespace: 'vfs' }, async (args) => {
        const raw = await fs.readFile(args.path)
        const processed = await processCSS(raw, { autoprefixer: true })
        return { contents: processed, loader: 'css' }
      })
    }
  }
}
```

---

## Extra B — TypeScript Type Checker

### Cuándo añadirlo
Cuando quieras mostrar errores de tipo reales en el editor (squiggly lines).

**Nota:** esbuild (Phase 2) ignora errores de tipo. Este extra añade type checking real vía TypeScript compiler API.

### Dependencias
```bash
bun add typescript
# TypeScript funciona en browser (ya es JS puro)
```

### Implementación

```typescript
// packages/frontend/runtime/src/types/ts-checker.ts
import ts from 'typescript'
import type { IVirtualFS } from '../types/fs.types'

export interface TypeCheckError {
  file: string
  line: number
  column: number
  message: string
  severity: 'error' | 'warning'
}

export class TypeScriptChecker {
  private languageService: ts.LanguageService | null = null
  private fileVersions = new Map<string, number>()
  private fileContents = new Map<string, string>()

  constructor(private fs: IVirtualFS) {}

  async initialize(rootFiles: string[]): Promise<void> {
    // Cargar todos los archivos al mapa
    for (const file of rootFiles) {
      const content = await this.fs.readFile(file)
      this.fileContents.set(file, content)
      this.fileVersions.set(file, 1)
    }

    const servicesHost: ts.LanguageServiceHost = {
      getScriptFileNames: () => rootFiles,
      getScriptVersion: (fileName) => String(this.fileVersions.get(fileName) ?? 0),
      getScriptSnapshot: (fileName) => {
        const content = this.fileContents.get(fileName)
        if (!content) return undefined
        return ts.ScriptSnapshot.fromString(content)
      },
      getCurrentDirectory: () => '/',
      getCompilationSettings: () => ({
        strict: true,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        jsx: ts.JsxEmit.ReactJSX,
        skipLibCheck: true,  // Evitar check de node_modules
        noEmit: true,
      }),
      getDefaultLibFileName: (opts) => ts.getDefaultLibFilePath(opts),
      fileExists: (path) => this.fileContents.has(path),
      readFile: (path) => this.fileContents.get(path),
      readDirectory: () => [],
    }

    this.languageService = ts.createLanguageService(servicesHost)
  }

  async checkFile(filePath: string): Promise<TypeCheckError[]> {
    if (!this.languageService) {
      throw new Error('TypeChecker no inicializado. Llama initialize() primero.')
    }

    const diagnostics = [
      ...this.languageService.getSyntacticDiagnostics(filePath),
      ...this.languageService.getSemanticDiagnostics(filePath),
    ]

    return diagnostics.map(d => {
      const { line, character } = d.file
        ? ts.getLineAndCharacterOfPosition(d.file, d.start ?? 0)
        : { line: 0, character: 0 }
      return {
        file: filePath,
        line: line + 1,
        column: character + 1,
        message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
        severity: d.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
      }
    })
  }

  updateFile(filePath: string, content: string): void {
    this.fileContents.set(filePath, content)
    this.fileVersions.set(filePath, (this.fileVersions.get(filePath) ?? 0) + 1)
  }

  async checkAll(): Promise<TypeCheckError[]> {
    if (!this.languageService) return []
    const allErrors: TypeCheckError[] = []
    for (const file of this.fileContents.keys()) {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        allErrors.push(...await this.checkFile(file))
      }
    }
    return allErrors
  }
}
```

### Integración con CodeMirror (editor)

```typescript
// apps/web - añadir decoraciones de error en el editor
import { TypeScriptChecker } from '@vertex/runtime/types'

// Cuando el usuario edita, checkear después de 500ms sin cambios
const checker = new TypeScriptChecker(virtualFs)
await checker.initialize(allTsFiles)

editor.on('change', debounce(async () => {
  checker.updateFile(currentFile, editor.getValue())
  const errors = await checker.checkFile(currentFile)
  // Mostrar errors como decoraciones en CodeMirror
  showDiagnostics(errors)
}, 500))
```

---

## Extra C — ESLint en browser

### Cuándo añadirlo
Cuando quieras mostrar linting en tiempo real en el editor.

### Dependencias
```bash
bun add eslint
# ESLint tiene un modo "browser-compatible" desde v9
```

### Implementación

```typescript
// packages/frontend/runtime/src/lint/eslint-runner.ts
import { Linter } from 'eslint'
import type { IVirtualFS } from '../types/fs.types'

export interface LintResult {
  file: string
  line: number
  column: number
  message: string
  ruleId: string | null
  severity: 'error' | 'warning'
}

export class ESLintRunner {
  private linter: Linter

  constructor() {
    // Linter es la API pura de ESLint, funciona en browser
    this.linter = new Linter({ configType: 'flat' })
  }

  lint(filePath: string, content: string): LintResult[] {
    const messages = this.linter.verify(content, [
      {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {
          'no-console': 'warn',
          'no-unused-vars': 'warn',
          'no-undef': 'error',
          // Añadir más reglas según necesidad
        },
        languageOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
        }
      }
    ], { filename: filePath })

    return messages.map(m => ({
      file: filePath,
      line: m.line,
      column: m.column,
      message: m.message,
      ruleId: m.ruleId,
      severity: m.severity === 2 ? 'error' : 'warning',
    }))
  }
}
```

---

## Extra D — Sass / SCSS

### Cuándo añadirlo
Cuando los proyectos usen SCSS.

### Dependencias
```bash
bun add sass  # dart-sass, tiene versión JS pura que funciona en browser
```

### Implementación

```typescript
// packages/frontend/runtime/src/css/sass-runner.ts
import * as sass from 'sass'
import type { IVirtualFS } from '../types/fs.types'

export async function compileSass(
  scssPath: string,
  fs: IVirtualFS
): Promise<string> {
  const content = await fs.readFile(scssPath)

  const result = sass.compileString(content, {
    syntax: scssPath.endsWith('.sass') ? 'indented' : 'scss',
    // Resolver @import desde VirtualFS
    importer: {
      canonicalize(url: string) {
        return new URL(url, 'file:///virtual/')
      },
      async load(canonicalUrl: URL) {
        const path = canonicalUrl.pathname
        const content = await fs.readFile(path)
        return { contents: content, syntax: 'scss' }
      }
    }
  })

  return result.css
}
```

**Plugin para esbuild (Phase 2):**
```typescript
export function sassPlugin(fs: IVirtualFS): esbuild.Plugin {
  return {
    name: 'vertex-sass',
    setup(build) {
      build.onLoad({ filter: /\.(scss|sass)$/, namespace: 'vfs' }, async (args) => {
        const css = await compileSass(args.path, fs)
        return { contents: css, loader: 'css' }
      })
    }
  }
}
```

---

## Extra E — Prettier (formateo en browser)

```typescript
// packages/frontend/runtime/src/format/prettier-runner.ts
import * as prettier from 'prettier/standalone'
import parserBabel from 'prettier/plugins/babel'
import parserTypeScript from 'prettier/plugins/typescript'
import parserCSS from 'prettier/plugins/postcss'
import parserHTML from 'prettier/plugins/html'
import estree from 'prettier/plugins/estree'

export async function formatCode(
  code: string,
  filepath: string
): Promise<string> {
  const ext = filepath.split('.').pop()?.toLowerCase()
  const parserMap: Record<string, string> = {
    ts: 'typescript', tsx: 'babel',
    js: 'babel', jsx: 'babel',
    css: 'css', scss: 'css',
    html: 'html', json: 'json',
  }

  return prettier.format(code, {
    parser: parserMap[ext ?? ''] ?? 'babel',
    plugins: [parserBabel, parserTypeScript, parserCSS, parserHTML, estree],
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    printWidth: 100,
  })
}
```

---

## Tabla de resumen — extras vs necesidad

| Extra | Cuando lo necesitas | Complejidad | npm packages |
|---|---|---|---|
| A — PostCSS/Tailwind | Proyectos con Tailwind | Baja | `postcss`, `autoprefixer` |
| B — TypeScript Checker | Type errors en editor | Media | `typescript` |
| C — ESLint | Linting en tiempo real | Baja | `eslint` |
| D — Sass/SCSS | Proyectos con SCSS | Baja | `sass` |
| E — Prettier | Formateo con Ctrl+S | Baja | `prettier` |

---

## Exports finales del package (`index.ts`)

```typescript
// Phase 1
export { VirtualFS, MemoryFS, OPFSFS } from './fs/virtual-fs'
export { GitClient } from './git/git-client'
export type { IVirtualFS, IVirtualFS, FileContent, DirEntry } from './types/fs.types'
export type { IGitClient, GitCloneOptions, GitStatus } from './types/git.types'

// Phase 2
export { Bundler } from './build/bundler'
export type { BuildConfig, BuildResult } from './types/build.types'

// Phase 3
export { PreviewManager } from './preview/iframe-manager'
export type { PreviewConfig, PreviewSession } from './types/preview.types'

// Phase 4
export { NodeboxRuntime } from './node/nodebox-runtime'
export { NpmManager } from './node/npm-manager'
export { TerminalBridge } from './node/terminal-bridge'
export type { INodeRuntime } from './types/node.types'

// Phase 5
export { DeployManager } from './deploy/deploy-manager'
export type { DeployConfig, DeployResult } from './types/deploy.types'

// Phase 6 (extras — importar por subruta)
// import { TypeScriptChecker } from '@vertex/runtime/types'
// import { ESLintRunner } from '@vertex/runtime/lint'
// import { formatCode } from '@vertex/runtime/format'
// import { compileSass } from '@vertex/runtime/css'
```

---

## Criterio de "Phase 6 completada" (por extra)

- [ ] **A** — PostCSS procesa CSS de un proyecto Tailwind correctamente
- [ ] **B** — TypeChecker detecta errores de tipo y los muestra en el editor
- [ ] **C** — ESLint muestra warnings en tiempo real al editar
- [ ] **D** — Sass compila archivos `.scss` correctamente
- [ ] **E** — Prettier formatea TypeScript con Ctrl+S
