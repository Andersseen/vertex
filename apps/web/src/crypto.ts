import { Buffer } from 'buffer';
import { sha1 } from '@noble/hashes/legacy.js';

export function createHash(algo: string) {
  if (!/^sha-?1$/i.test(algo)) throw new Error(`Unsupported algorithm: ${algo}`);
  const instance = sha1.create();
  return {
    update(data: string | Uint8Array): typeof this {
      instance.update(typeof data === 'string' ? new TextEncoder().encode(data) : data);
      return this;
    },
    digest(encoding?: string): string | Buffer {
      const bytes = instance.digest();
      if (encoding === 'hex')
        return Array.from(bytes, (b: number) => b.toString(16).padStart(2, '0')).join('');
      return Buffer.from(bytes);
    },
  };
}

export function randomBytes(size: number): Buffer {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return Buffer.from(bytes);
}

export function getHashes(): string[] {
  return ['sha1'];
}
