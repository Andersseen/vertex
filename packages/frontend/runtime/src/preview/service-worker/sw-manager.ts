import type { SWMessage, SWResponse } from '../../types/preview.types'

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private controller: ServiceWorker | null = null

  async register(swUrl: string): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers are not supported in this browser')
    }

    this.registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
      type: 'classic',
    })

    await this.waitForActive()
    this.controller = navigator.serviceWorker.controller
  }

  send(message: SWMessage): void {
    if (!this.controller) throw new Error('Service Worker not active')
    this.controller.postMessage(message)
  }

  async sendAndWait(
    message: SWMessage,
    expectedResponse: SWResponse['type']
  ): Promise<void> {
    return new Promise((resolve) => {
      const channel = new MessageChannel()
      channel.port1.onmessage = (e) => {
        if (e.data?.type === expectedResponse) resolve()
      }
      this.controller!.postMessage(message, [channel.port2])
    })
  }

  async mountFiles(files: Record<string, string>): Promise<void> {
    return this.sendAndWait({ type: 'MOUNT_FILES', files }, 'READY')
  }

  updateFile(path: string, content: string): void {
    this.send({ type: 'UPDATE_FILE', path, content })
  }

  deleteFile(path: string): void {
    this.send({ type: 'DELETE_FILE', path })
  }

  clear(): void {
    this.send({ type: 'CLEAR' })
  }

  async unregister(): Promise<void> {
    if (this.registration) {
      await this.registration.unregister()
      this.registration = null
      this.controller = null
    }
  }

  private async waitForActive(): Promise<void> {
    const sw = this.registration!
    if (sw.active) return

    return new Promise((resolve) => {
      const worker = sw.installing ?? sw.waiting
      if (!worker) {
        resolve()
        return
      }
      worker.addEventListener('statechange', function onStateChange() {
        if (worker.state === 'activated') {
          worker.removeEventListener('statechange', onStateChange)
          resolve()
        }
      })
    })
  }
}
