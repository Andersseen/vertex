import { describe, expect, it } from 'bun:test'
import { bindUrl } from '../iframe-binder'

describe('bindUrl', () => {
  it('sets src on the iframe-like object', () => {
    const iframe = { src: '' }
    bindUrl(iframe, 'https://example.webcontainer.io')
    expect(iframe.src).toBe('https://example.webcontainer.io')
  })

  it('returned cleanup resets src to about:blank', () => {
    const iframe = { src: '' }
    const cleanup = bindUrl(iframe, 'https://example.webcontainer.io')
    cleanup()
    expect(iframe.src).toBe('about:blank')
  })

  it('handles empty url', () => {
    const iframe = { src: 'https://old.url' }
    bindUrl(iframe, '')
    expect(iframe.src).toBe('')
  })
})
