import { describe, test, expect, afterEach } from 'bun:test'
import { CloudflarePagesAdapter } from '../cloudflare-pages'
import type { DeployConfig, DeployFileMap } from '../../../types/deploy.types'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const baseConfig: DeployConfig = {
  provider: 'cloudflare-pages',
  token: 'cf-token',
  accountId: 'acc123',
  projectName: 'my-site',
  branch: 'main',
  distDir: '/dist',
}

const files: DeployFileMap = {
  '/index.html': '<h1>hi</h1>',
  '/app.js': 'console.log(1)',
}

/**
 * Routes the adapter's Cloudflare API calls. `existingProject` toggles whether
 * the project GET returns 200 (exists) or 404 (must be created). `missing`
 * decides which asset hashes check-missing reports as needing upload; when
 * omitted, every hash sent is echoed back (all uploaded). Records every call.
 */
function installFetchRouter(opts: {
  existingProject?: boolean
  missing?: (hashes: string[]) => string[]
} = {}): { calls: Array<{ url: string; method: string }> } {
  const calls: Array<{ url: string; method: string }> = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = (init?.method ?? 'GET').toUpperCase()
    calls.push({ url, method })

    if (url.includes('/pages/assets/check-missing')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as { hashes: string[] }
      const miss = opts.missing ? opts.missing(body.hashes) : body.hashes
      return json({ success: true, errors: [], messages: [], result: miss })
    }
    if (url.includes('/pages/assets/upload')) {
      return json({ success: true, errors: [], messages: [], result: true })
    }
    if (url.includes('/upload-token')) {
      return json({ success: true, errors: [], messages: [], result: { jwt: 'jwt-abc' } })
    }
    if (url.endsWith('/deployments') && method === 'POST') {
      return json({
        success: true,
        errors: [],
        messages: [],
        result: { id: 'dep-1', url: 'https://my-site.pages.dev', project_name: 'my-site' },
      })
    }
    // Project GET / create
    if (url.includes('/pages/projects/my-site')) {
      return opts.existingProject === false
        ? json({ success: false, errors: [{ code: 8000007, message: 'not found' }] }, 404)
        : json({ success: true, errors: [], messages: [], result: { name: 'my-site' } })
    }
    if (url.endsWith('/pages/projects') && method === 'POST') {
      return json({ success: true, errors: [], messages: [], result: { name: 'my-site' } })
    }

    throw new Error(`Unexpected fetch: ${method} ${url}`)
  }) as typeof fetch

  return { calls }
}

describe('CloudflarePagesAdapter', () => {
  test('fails fast when projectName is missing', async () => {
    const adapter = new CloudflarePagesAdapter()
    const result = await adapter.deploy(files, { ...baseConfig, projectName: undefined })
    expect(result.success).toBe(false)
    expect(result.error).toContain('projectName is required')
    expect(result.filesUploaded).toBe(0)
  })

  test('deploys successfully, uploading all missing assets', async () => {
    const { calls } = installFetchRouter({ existingProject: true })
    const adapter = new CloudflarePagesAdapter()

    const result = await adapter.deploy(files, baseConfig)

    expect(result.success).toBe(true)
    expect(result.url).toBe('https://my-site.pages.dev')
    expect(result.deploymentId).toBe('dep-1')
    expect(result.filesUploaded).toBe(2)
    expect(calls.some((c) => c.url.includes('/pages/assets/upload'))).toBe(true)
    expect(calls.some((c) => c.url.endsWith('/deployments'))).toBe(true)
  })

  test('skips upload when every asset is already cached', async () => {
    const { calls } = installFetchRouter({ existingProject: true, missing: () => [] })
    const adapter = new CloudflarePagesAdapter()

    const result = await adapter.deploy(files, baseConfig)

    expect(result.success).toBe(true)
    expect(result.filesUploaded).toBe(0)
    expect(calls.some((c) => c.url.includes('/pages/assets/upload'))).toBe(false)
  })

  test('creates the project when it does not exist yet', async () => {
    const { calls } = installFetchRouter({ existingProject: false })
    const adapter = new CloudflarePagesAdapter()

    const result = await adapter.deploy(files, baseConfig)

    expect(result.success).toBe(true)
    expect(
      calls.some((c) => c.method === 'POST' && c.url.endsWith('/pages/projects')),
    ).toBe(true)
  })

  test('reports a failure when the deployment call errors', async () => {
    installFetchRouter({ existingProject: true })
    // Override deployments to fail.
    const router = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/deployments')) {
        return json({ success: false, errors: [{ code: 500, message: 'boom' }] }, 500)
      }
      return router(input, init)
    }) as typeof fetch

    const adapter = new CloudflarePagesAdapter()
    const result = await adapter.deploy(files, baseConfig)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Deployment create failed')
  })

  test('getProject returns null on 404', async () => {
    installFetchRouter({ existingProject: false })
    const adapter = new CloudflarePagesAdapter()
    const project = await adapter.getProject(baseConfig, 'my-site')
    expect(project).toBeNull()
  })
})
