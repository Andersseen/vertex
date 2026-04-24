import type { WebContainer } from '@webcontainer/api'
import type { ExtractedFiles } from './types'

export async function extractDir(
  container: WebContainer,
  dirPath: string,
  base = dirPath,
): Promise<ExtractedFiles> {
  const result: ExtractedFiles = {}
  const entries = await container.fs.readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = `${dirPath}/${entry.name}`
    if (entry.isDirectory()) {
      const sub = await extractDir(container, fullPath, base)
      Object.assign(result, sub)
    } else {
      const data = await container.fs.readFile(fullPath)
      const relative = fullPath.slice(base.length).replace(/^\//, '')
      result[relative] = data
    }
  }

  return result
}
