import type { IVirtualFS } from '../types/fs.types'

interface TsConfig {
  compilerOptions?: {
    target?: string
    module?: string
    jsx?: 'react' | 'react-jsx' | 'preserve'
    strict?: boolean
    paths?: Record<string, string[]>
    baseUrl?: string
  }
}

export async function readTsConfig(fs: IVirtualFS, dir = '/'): Promise<TsConfig> {
  const path = `${dir}/tsconfig.json`.replace('//', '/')
  try {
    const content = await fs.readFile(path)
    const clean = content.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
    return JSON.parse(clean)
  } catch {
    return {}
  }
}

export function tsConfigToEsbuildTarget(tsConfig: TsConfig): string {
  const target = tsConfig.compilerOptions?.target?.toLowerCase()
  const map: Record<string, string> = {
    es2020: 'es2020',
    es2021: 'es2021',
    es2022: 'es2022',
    esnext: 'esnext',
    es6: 'es6',
    es5: 'es5',
  }
  return map[target ?? ''] ?? 'es2020'
}
