import { Buffer } from 'buffer';
import { sha1 } from '@noble/hashes/legacy.js';

(globalThis as unknown as Record<string, unknown>)['Buffer'] = Buffer;
(globalThis as unknown as Record<string, unknown>)['global'] = globalThis;

// Provide Node.js-compatible crypto.createHash for isomorphic-git (SHA1 only)
const _crypto = (globalThis as unknown as Record<string, unknown>)['crypto'] as Record<string, unknown> | undefined;
if (_crypto && !_crypto['createHash']) {
  _crypto['createHash'] = (_algo: string) => {
    const instance = sha1.create();
    return {
      update(data: string | Uint8Array): unknown {
        instance.update(typeof data === 'string' ? new TextEncoder().encode(data) : data);
        return this;
      },
      digest(encoding?: string): string | Uint8Array {
        const bytes = instance.digest();
        if (encoding === 'hex') {
          return Array.from(bytes, (b: number) => b.toString(16).padStart(2, '0')).join('');
        }
        return Buffer.from(bytes);
      },
    };
  };
}
