import type { IVirtualFS } from '../../types/fs.types'
import type {
  DeployConfig,
  DeployFileMap,
  DeployProgressCallback,
  DeployResult,
  IDeployAdapter,
} from '../../types/deploy.types'

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'ico',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'wasm', 'pdf', 'zip', 'gz', 'br',
  'mp3', 'wav', 'ogg', 'mp4', 'webm', 'mov',
])

const TEXT_MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  map: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  svg: 'image/svg+xml',
  webmanifest: 'application/manifest+json',
}

const BINARY_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
  wasm: 'application/wasm',
  pdf: 'application/pdf',
  zip: 'application/zip',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
}

export function extensionOf(path: string): string {
  const i = path.lastIndexOf('.')
  if (i < 0 || i === path.length - 1) return ''
  return path.slice(i + 1).toLowerCase()
}

export function isBinaryExtension(ext: string): boolean {
  return BINARY_EXTENSIONS.has(ext)
}

export function mimeTypeFor(path: string): string {
  const ext = extensionOf(path)
  return BINARY_MIME[ext] ?? TEXT_MIME[ext] ?? 'application/octet-stream'
}

export function toUint8Array(content: Uint8Array | string): Uint8Array {
  if (typeof content === 'string') return new TextEncoder().encode(content)
  return content
}

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk as unknown as number[])
  }
  return btoa(binary)
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource)
  const arr = new Uint8Array(digest)
  let hex = ''
  for (const b of arr) hex += b.toString(16).padStart(2, '0')
  return hex
}

/**
 * Collect all files recursively under `distDir` as a path map rooted at `/`.
 * Binary files (by extension) are returned as Uint8Array; text as string.
 * Uses rawFs directly when the VFS is backed by OPFS to preserve binary bytes.
 */
export async function collectDistFiles(
  fs: IVirtualFS,
  distDir: string
): Promise<DeployFileMap> {
  const result: DeployFileMap = {}
  await walk(fs, distDir, distDir, result)
  return result
}

async function walk(
  fs: IVirtualFS,
  baseDir: string,
  currentDir: string,
  out: DeployFileMap
): Promise<void> {
  let entries
  try {
    entries = await fs.readDir(currentDir)
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.type === 'directory') {
      await walk(fs, baseDir, entry.path, out)
      continue
    }

    const relPath = '/' + entry.path.slice(baseDir.length).replace(/^\//, '')
    const ext = extensionOf(entry.path)
    const content = isBinaryExtension(ext)
      ? await readBinary(fs, entry.path)
      : await safeReadText(fs, entry.path)

    if (content !== null) out[relPath] = content
  }
}

async function safeReadText(fs: IVirtualFS, path: string): Promise<string | null> {
  try {
    return await fs.readFile(path)
  } catch {
    return null
  }
}

async function readBinary(fs: IVirtualFS, path: string): Promise<Uint8Array | null> {
  const raw = (fs as unknown as { rawFs?: { promises: { readFile(p: string): Promise<Uint8Array> } } }).rawFs
  if (raw && 'promises' in raw) {
    try {
      const bytes = await raw.promises.readFile(path)
      return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes as ArrayBuffer)
    } catch {
      return null
    }
  }
  try {
    const text = await fs.readFile(path)
    return new TextEncoder().encode(text)
  } catch {
    return null
  }
}

export abstract class BaseDeployAdapter implements IDeployAdapter {
  abstract deploy(
    files: DeployFileMap,
    config: DeployConfig,
    onProgress?: DeployProgressCallback
  ): Promise<DeployResult>

  protected report(
    cb: DeployProgressCallback | undefined,
    phase: 'preparing' | 'uploading' | 'deploying' | 'done',
    percent: number,
    message?: string
  ): void {
    if (cb) cb(phase, percent, message)
  }

  protected buildAuthHeaders(token: string): HeadersInit {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  protected async parseApiError(res: Response): Promise<string> {
    try {
      const body = await res.json() as { errors?: Array<{ code?: number; message?: string }>; error?: string }
      if (body?.errors?.length) {
        return body.errors.map((e) => `[${e.code ?? '?'}] ${e.message ?? 'unknown'}`).join('; ')
      }
      if (body?.error) return body.error
      return `HTTP ${res.status} ${res.statusText}`
    } catch {
      return `HTTP ${res.status} ${res.statusText}`
    }
  }
}
