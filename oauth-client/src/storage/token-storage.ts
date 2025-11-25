import { TokenResponse } from '../types';

export class TokenStorage {
  private readonly storageKey = 'lanonasis_mcp_tokens';
  private readonly webEncryptionKeyStorage = 'lanonasis_web_token_enc_key';
  private keytar: any;

  constructor() {
    // Lazy load keytar only in Node environment
    if (this.isNode()) {
      try {
        this.keytar = require('keytar');
      } catch (e) {
        console.warn('Keytar not available - falling back to file storage');
      }
    }
  }

  async store(tokens: TokenResponse): Promise<void> {
    // Persist an issued_at timestamp alongside tokens for reliable expiry checks
    const tokensWithTimestamp = {
      ...tokens,
      issued_at: Date.now()
    } as TokenResponse & { issued_at: number };

    const tokenString = JSON.stringify(tokensWithTimestamp);

    if (this.isNode()) {
      // Terminal: Use system keychain if available
      if (this.keytar) {
        await this.keytar.setPassword('lanonasis-mcp', 'tokens', tokenString);
      } else {
        // Fallback to encrypted file
        await this.storeToFile(tokenString);
      }
    } else if (this.isElectron()) {
      // Desktop: Use Electron secure storage
      await (window as any).electronAPI.secureStore.set(this.storageKey, tokensWithTimestamp);
    } else if (this.isMobile()) {
      // Mobile: Use secure storage plugin
      await (window as any).SecureStorage.set(this.storageKey, tokenString);
    } else {
      // Web: Use encrypted localStorage
      const encrypted = await this.encrypt(tokenString);
      localStorage.setItem(this.storageKey, encrypted);
    }
  }

  async retrieve(): Promise<TokenResponse | null> {
    let tokenString: string | null = null;

    try {
      if (this.isNode()) {
        // Terminal: Try keychain first
        if (this.keytar) {
          tokenString = await this.keytar.getPassword('lanonasis-mcp', 'tokens');
        }
        
        // Fallback to file if not in keychain
        if (!tokenString) {
          tokenString = await this.retrieveFromFile();
        }
      } else if (this.isElectron()) {
        // Desktop: Use Electron secure storage
        const tokens = await (window as any).electronAPI.secureStore.get(this.storageKey);
        return tokens || null;
      } else if (this.isMobile()) {
        // Mobile: Use secure storage plugin
        tokenString = await (window as any).SecureStorage.get(this.storageKey);
      } else {
        // Web: Use encrypted localStorage
        const encrypted = localStorage.getItem(this.storageKey);
        if (encrypted) {
          tokenString = await this.decrypt(encrypted);
        }
      }

      return tokenString ? JSON.parse(tokenString) : null;
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return null;
    }
  }

  async clear(): Promise<void> {
    if (this.isNode()) {
      if (this.keytar) {
        await this.keytar.deletePassword('lanonasis-mcp', 'tokens');
      }
      await this.deleteFile();
    } else if (this.isElectron()) {
      await (window as any).electronAPI.secureStore.delete(this.storageKey);
    } else if (this.isMobile()) {
      await (window as any).SecureStorage.remove(this.storageKey);
    } else {
      localStorage.removeItem(this.storageKey);
    }
  }

  isTokenExpired(tokens: TokenResponse & { issued_at?: number }): boolean {
    if (!tokens.expires_in) return false;

    if (!tokens.issued_at) {
      console.warn('Token missing issued_at timestamp, treating as expired');
      return true;
    }

    const expiresAt = tokens.issued_at + (tokens.expires_in * 1000);
    const now = Date.now();

    // Consider expired if less than 5 minutes remaining
    return (expiresAt - now) < 300000;
  }


  private async storeToFile(tokenString: string): Promise<void> {
    if (!this.isNode()) return;
    
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    const crypto = require('crypto');
    
      const configDir = path.join(os.homedir(), '.lanonasis');
      const tokenFile = path.join(configDir, 'mcp-tokens.enc');
      
      // Ensure directory exists
      await fs.mkdir(configDir, { recursive: true });
      
      // Encrypt tokens (AES-256-GCM)
      const key = this.getFileEncryptionKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      let encrypted = cipher.update(tokenString, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      
      // Store with IV and auth tag for integrity
      const data = [iv.toString('hex'), authTag, encrypted].join(':');
      await fs.writeFile(tokenFile, data, { mode: 0o600 });
    }

  private async retrieveFromFile(): Promise<string | null> {
    if (!this.isNode()) return null;
    
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    const crypto = require('crypto');
    
    const tokenFile = path.join(os.homedir(), '.lanonasis', 'mcp-tokens.enc');
    
    try {
      const data = await fs.readFile(tokenFile, 'utf8');
      const parts = data.split(':');
      const key = this.getFileEncryptionKey();

      // Preferred: AES-GCM (iv:auth:cipher)
      if (parts.length === 3) {
        const [ivHex, authTagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }

      // Legacy fallback: AES-CBC (iv:cipher)
      if (parts.length === 2) {
        const [ivHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }

      throw new Error('Invalid encrypted token format');
    } catch (error) {
      return null;
    }
  }

  private async deleteFile(): Promise<void> {
    if (!this.isNode()) return;
    
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    
    const tokenFile = path.join(os.homedir(), '.lanonasis', 'mcp-tokens.enc');
    
    try {
      await fs.unlink(tokenFile);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  private getFileEncryptionKey(): Buffer {
    const crypto = require('crypto');
    const os = require('os');
    
    // Derive key from machine ID + fixed salt
    const machineId = os.hostname() + os.userInfo().username;
    const salt = 'lanonasis-mcp-oauth-2024';
    
    return crypto.pbkdf2Sync(machineId, salt, 100000, 32, 'sha256');
  }

  private async encrypt(text: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      return btoa(String.fromCharCode(...data));
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
        salt: encoder.encode('lanonasis-token-salt'),
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

    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(encrypted: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      const binary = atob(encrypted);
      const bytes = new Uint8Array(binary.length);
      
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    }

    const binary = atob(encrypted);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

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
        salt: encoder.encode('lanonasis-token-salt'),
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

  private isNode(): boolean {
    return !!(typeof process !== 'undefined' && 
           process.versions && 
           process.versions.node &&
           !this.isElectron());
  }

  private isElectron(): boolean {
    return typeof window !== 'undefined' && 
           (window as any).electronAPI !== undefined;
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && 
           (window as any).SecureStorage !== undefined;
  }

  private async getWebEncryptionKey(): Promise<string> {
    const existing = typeof localStorage !== 'undefined'
      ? localStorage.getItem(this.webEncryptionKeyStorage)
      : null;

    if (existing) {
      return existing;
    }

    let raw = '';
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const buf = new Uint8Array(32);
      window.crypto.getRandomValues(buf);
      raw = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
    } else {
      raw = `${navigator.userAgent}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.webEncryptionKeyStorage, raw);
    }

    return raw;
  }
}
