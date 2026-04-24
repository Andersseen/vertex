import { describe, expect, it } from 'bun:test'
import { detectPackageManager } from '../package-manager-detect'
import type { WebContainer } from '@webcontainer/api'

function fakeContainer(lockfiles: string[]): WebContainer {
  return {
    fs: {
      readFile: async (path: string) => {
        if (lockfiles.includes(path)) return new Uint8Array()
        throw new Error('not found')
      },
    },
  } as unknown as WebContainer
}

describe('detectPackageManager', () => {
  it('returns pnpm when pnpm-lock.yaml exists', async () => {
    const pm = await detectPackageManager(fakeContainer(['pnpm-lock.yaml']))
    expect(pm).toBe('pnpm')
  })

  it('returns bun when bun.lockb exists', async () => {
    const pm = await detectPackageManager(fakeContainer(['bun.lockb']))
    expect(pm).toBe('bun')
  })

  it('returns bun when bun.lock exists', async () => {
    const pm = await detectPackageManager(fakeContainer(['bun.lock']))
    expect(pm).toBe('bun')
  })

  it('returns yarn when yarn.lock exists', async () => {
    const pm = await detectPackageManager(fakeContainer(['yarn.lock']))
    expect(pm).toBe('yarn')
  })

  it('returns npm when package-lock.json exists', async () => {
    const pm = await detectPackageManager(fakeContainer(['package-lock.json']))
    expect(pm).toBe('npm')
  })

  it('returns npm when no lockfile is found', async () => {
    const pm = await detectPackageManager(fakeContainer([]))
    expect(pm).toBe('npm')
  })

  it('prefers pnpm over yarn when both exist', async () => {
    const pm = await detectPackageManager(fakeContainer(['pnpm-lock.yaml', 'yarn.lock']))
    expect(pm).toBe('pnpm')
  })
})
