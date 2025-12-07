import { ApiKeyData } from './api-key-storage';

/**
 * Browser-only API key storage using Web Crypto + localStorage.
 */
export class ApiKeyStorageWeb {
  private readonly storageKey = 'lanonasis_api_key';
  private readonly webEncryptionKeyStorage = 'lanonasis_web_enc_key';

  async store(data: ApiKeyData): Promise<void> {
    const payload = JSON.stringify({
      ...data,
      createdAt: data.createdAt || new Date().toISOString()
    });

    const encrypted = await this.encrypt(payload);
    localStorage.setItem(this.storageKey, encrypted);
  }

  async retrieve(): Promise<ApiKeyData | null> {
    const encrypted = localStorage.getItem(this.storageKey);
    if (!encrypted) return null;

    try {
      const decrypted = await this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }

  private async encrypt(text: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      const encoder = new TextEncoder();
      return this.base64Encode(encoder.encode(text));
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const passphrase = await this.getWebEncryptionKey();

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('lanonasis-api-key-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return this.base64Encode(combined);
  }

  private async decrypt(encrypted: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      const decoder = new TextDecoder();
      return decoder.decode(this.base64Decode(encrypted));
    }

    const bytes = this.base64Decode(encrypted);
    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const passphrase = await this.getWebEncryptionKey();

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('lanonasis-api-key-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return decoder.decode(decrypted);
  }

  private async getWebEncryptionKey(): Promise<string> {
    const existing = localStorage.getItem(this.webEncryptionKeyStorage);
    if (existing) return existing;

    const buf = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(buf);
    }

    const raw = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(this.webEncryptionKeyStorage, raw);
    return raw;
  }

  private base64Encode(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  private base64Decode(value: string): Uint8Array {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
