/**
 * API Key Storage Service
 * Secure multi-platform API key storage with encryption
 * Supports Node.js, Electron, Web, and Mobile environments
 */

// Lazy-loaded Node.js modules (only imported when running in Node.js)
let _fs: typeof import('fs') | null = null;
let _path: typeof import('path') | null = null;
let _os: typeof import('os') | null = null;
let _crypto: typeof import('crypto') | null = null;

async function getNodeModules() {
  if (_fs && _path && _os && _crypto) {
    return { fs: _fs, path: _path, os: _os, crypto: _crypto };
  }
  // Dynamic imports - only executed in Node.js environment
  const [fs, path, os, crypto] = await Promise.all([
    import('fs'),
    import('path'),
    import('os'),
    import('crypto')
  ]);
  _fs = fs;
  _path = path;
  _os = os;
  _crypto = crypto;
  return { fs, path, os, crypto };
}

export interface ApiKeyData {
  apiKey: string;
  organizationId?: string;
  userId?: string;
  environment?: 'development' | 'staging' | 'production';
  createdAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export class ApiKeyStorage {
  private readonly storageKey = 'lanonasis_api_key';
  private readonly legacyConfigKey = 'lanonasis_legacy_api_key';
  private readonly webEncryptionKeyStorage = 'lanonasis_web_enc_key';
  private keytar: any;
  private migrationCompleted = false;

  constructor() {
    // Lazy load keytar only in Node environment
    if (this.isNode()) {
      try {
        this.keytar = require('keytar');
      } catch (e) {
        console.warn('Keytar not available - falling back to encrypted file storage');
      }
    }
  }

  /**
   * Initialize and migrate from legacy storage if needed
   */
  async initialize(): Promise<void> {
    await this.migrateFromLegacyIfNeeded();
  }

  /**
   * Store API key securely
   */
  async store(data: ApiKeyData): Promise<void> {
    const normalizedKey = await this.normalizeApiKey(data.apiKey);

    const dataWithTimestamp = {
      ...data,
      apiKey: normalizedKey,
      createdAt: data.createdAt || new Date().toISOString()
    };
    
    const keyString = JSON.stringify(dataWithTimestamp);

    if (this.isNode()) {
      // Terminal: Use system keychain if available
      if (this.keytar) {
        try {
          await this.keytar.setPassword('lanonasis-mcp', this.storageKey, keyString);
          return;
        } catch (error) {
          console.warn('Keytar storage failed, falling back to file:', error);
        }
      }
      
      // Fallback to encrypted file
      await this.storeToFile(keyString);
      
    } else if (this.isElectron()) {
      // Desktop: Use Electron secure storage (SecretStorage API)
      await (window as any).electronAPI.secureStore.set(this.storageKey, dataWithTimestamp);
      
    } else if (this.isMobile()) {
      // Mobile: Use secure storage plugin
      await (window as any).SecureStorage.set(this.storageKey, keyString);
      
    } else {
      // Web: Use encrypted localStorage
      const encrypted = await this.encrypt(keyString);
      localStorage.setItem(this.storageKey, encrypted);
    }
  }

  /**
   * Retrieve API key from secure storage
   */
  async retrieve(): Promise<ApiKeyData | null> {
    let keyString: string | null = null;

    try {
      if (this.isNode()) {
        // Terminal: Try keychain first
        if (this.keytar) {
          try {
            keyString = await this.keytar.getPassword('lanonasis-mcp', this.storageKey);
          } catch (error) {
            console.warn('Keytar retrieval failed, trying file:', error);
          }
        }
        
        // Fallback to file if not in keychain
        if (!keyString) {
          keyString = await this.retrieveFromFile();
        }
        
      } else if (this.isElectron()) {
        // Desktop: Use Electron secure storage
        const data = await (window as any).electronAPI.secureStore.get(this.storageKey);
        return data || null;
        
      } else if (this.isMobile()) {
        // Mobile: Use secure storage plugin
        keyString = await (window as any).SecureStorage.get(this.storageKey);
        
      } else {
        // Web: Use encrypted localStorage
        const encrypted = localStorage.getItem(this.storageKey);
        if (encrypted) {
          keyString = await this.decrypt(encrypted);
        }
      }

      if (!keyString) {
        return null;
      }

      const parsed: ApiKeyData = JSON.parse(keyString);
      const normalizedKey = await this.normalizeApiKey(parsed.apiKey);

      // If we converted a legacy plaintext key, persist the hardened version
      if (normalizedKey !== parsed.apiKey) {
        await this.store({
          ...parsed,
          apiKey: normalizedKey
        });
      }

      return {
        ...parsed,
        apiKey: normalizedKey
      };
    } catch (error) {
      console.error('Error retrieving API key:', error);
      return null;
    }
  }

  /**
   * Get just the API key string (convenience method)
   */
  async getApiKey(): Promise<string | null> {
    const data = await this.retrieve();
    return data?.apiKey || null;
  }

  /**
   * Check if API key exists
   */
  async hasApiKey(): Promise<boolean> {
    const data = await this.retrieve();
    return data !== null && !!data.apiKey;
  }

  /**
   * Clear API key from storage
   */
  async clear(): Promise<void> {
    if (this.isNode()) {
      if (this.keytar) {
        try {
          await this.keytar.deletePassword('lanonasis-mcp', this.storageKey);
        } catch (error) {
          console.warn('Keytar deletion failed:', error);
        }
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

  /**
   * Check if API key is expired
   */
  isExpired(data: ApiKeyData): boolean {
    if (!data.expiresAt) return false;
    
    try {
      const expiresAt = new Date(data.expiresAt).getTime();
      const now = Date.now();
      
      // Consider expired if less than 1 hour remaining
      return (expiresAt - now) < 3600000;
    } catch {
      return false;
    }
  }

  /**
   * Update API key metadata without changing the key itself
   */
  async updateMetadata(metadata: Record<string, unknown>): Promise<void> {
    const existing = await this.retrieve();
    if (!existing) {
      throw new Error('No API key found to update');
    }

    await this.store({
      ...existing,
      metadata: {
        ...existing.metadata,
        ...metadata
      }
    });
  }

  /**
   * Migrate from legacy configuration storage
   */
  private async migrateFromLegacyIfNeeded(): Promise<void> {
    if (this.migrationCompleted) {
      return;
    }

    // Check if already in secure storage
    const hasSecureKey = await this.hasApiKey();
    if (hasSecureKey) {
      this.migrationCompleted = true;
      return;
    }

    // Check for legacy storage
    let legacyKey: string | null = null;

    if (this.isNode()) {
      // Check legacy file location
      legacyKey = await this.retrieveLegacyFromFile();
    } else if (!this.isElectron() && !this.isMobile()) {
      // Check unencrypted localStorage
      legacyKey = localStorage.getItem(this.legacyConfigKey);
    }

    if (legacyKey) {
      // Migrate to secure storage
      try {
        const keyData: ApiKeyData = typeof legacyKey === 'string' 
          ? { apiKey: await this.normalizeApiKey(legacyKey) } 
          : JSON.parse(legacyKey);
        
        await this.store(keyData);
        console.log('API key migrated to secure storage');

        // Clear legacy storage
        if (this.isNode()) {
          await this.deleteLegacyFile();
        } else {
          localStorage.removeItem(this.legacyConfigKey);
        }
      } catch (error) {
        console.error('Failed to migrate API key:', error);
      }
    }

    this.migrationCompleted = true;
  }

  // ==================== Node.js File Storage ====================

  private async storeToFile(keyString: string): Promise<void> {
    if (!this.isNode()) return;
    
    const { fs, path, os, crypto } = await getNodeModules();
    const configDir = path.join(os.homedir(), '.lanonasis');
    const keyFile = path.join(configDir, 'api-key.enc');
    
    // Ensure directory exists with secure permissions
    await fs.promises.mkdir(configDir, { recursive: true, mode: 0o700 });
    
    // Encrypt API key with AES-256-GCM (more secure than CBC)
    const key = await this.getFileEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(keyString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag for GCM
    const authTag = cipher.getAuthTag();
    
    // Store with IV and auth tag
    const data = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    await fs.promises.writeFile(keyFile, data, { mode: 0o600 });
  }

  private async retrieveFromFile(): Promise<string | null> {
    if (!this.isNode()) return null;
    
    const { fs, path, os, crypto } = await getNodeModules();
    const keyFile = path.join(os.homedir(), '.lanonasis', 'api-key.enc');
    
    try {
      const data = await fs.promises.readFile(keyFile, 'utf8');
      const [ivHex, authTagHex, encrypted] = data.split(':');
      
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Invalid encrypted file format');
      }
      
      const key = await this.getFileEncryptionKey();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      // File doesn't exist or decryption failed
      return null;
    }
  }

  private async deleteFile(): Promise<void> {
    if (!this.isNode()) return;
    
    const { fs, path, os } = await getNodeModules();
    const keyFile = path.join(os.homedir(), '.lanonasis', 'api-key.enc');
    
    try {
      await fs.promises.unlink(keyFile);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  private async retrieveLegacyFromFile(): Promise<string | null> {
    if (!this.isNode()) return null;
    
    const { fs, path, os } = await getNodeModules();
    // Check old unencrypted location
    const legacyFile = path.join(os.homedir(), '.lanonasis', 'api-key.txt');
    
    try {
      return await fs.promises.readFile(legacyFile, 'utf8');
    } catch {
      return null;
    }
  }

  private async deleteLegacyFile(): Promise<void> {
    if (!this.isNode()) return;
    
    const { fs, path, os } = await getNodeModules();
    const legacyFile = path.join(os.homedir(), '.lanonasis', 'api-key.txt');
    
    try {
      await fs.promises.unlink(legacyFile);
    } catch {
      // Ignore errors
    }
  }

  private async getFileEncryptionKey(): Promise<Buffer> {
    const { os, crypto } = await getNodeModules();
    // Derive key from machine ID + user + fixed salt
    const machineId = os.hostname() + os.userInfo().username;
    const salt = 'lanonasis-mcp-api-key-2024';
    
    return crypto.pbkdf2Sync(machineId, salt, 100000, 32, 'sha256');
  }

  // ==================== Web Encryption ====================

  private async encrypt(text: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      // Fallback to base64 (not secure, but better than nothing)
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      return this.base64Encode(data);
    }

    try {
      // Use Web Crypto API for proper encryption
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      
      // Generate a key from a passphrase (in production, use a better key management)
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
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Web encryption failed:', error);
      // Fallback to base64
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      return this.base64Encode(data);
    }
  }

  private async decrypt(encrypted: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      // Fallback from base64
      const bytes = this.base64Decode(encrypted);
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    }

    try {
      // Use Web Crypto API for proper decryption
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Decode from base64
      const binary = atob(encrypted);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // Extract IV and encrypted data
      const iv = bytes.slice(0, 12);
      const data = bytes.slice(12);
      
      // Generate the same key
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
    } catch (error) {
      console.error('Web decryption failed:', error);
      // Fallback from base64
      const bytes = this.base64Decode(encrypted);
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    }
  }

  private async getWebEncryptionKey(): Promise<string> {
    // Persist a device-specific key to keep encryption/decryption stable
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
      // Fallback: pseudo-random seed
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'node';
      raw = `${ua}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.webEncryptionKeyStorage, raw);
    }
    return raw;
  }

  // ==================== Platform Detection ====================

  private isNode(): boolean {
    return typeof process !== 'undefined' &&
           !!process.versions &&
           !!process.versions.node &&
           !this.isElectron();
  }

  private isElectron(): boolean {
    return typeof window !== 'undefined' && 
           (window as any).electronAPI !== undefined;
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && 
           (window as any).SecureStorage !== undefined;
  }

  private base64Encode(bytes: Uint8Array): string {
    if (typeof btoa !== 'undefined') {
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      return btoa(binary);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }
    throw new Error('No base64 encoder available');
  }

  private base64Decode(value: string): Uint8Array {
    if (typeof atob !== 'undefined') {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(value, 'base64'));
    }
    throw new Error('No base64 decoder available');
  }

  /**
   * Normalize API keys to a SHA-256 hex digest.
   * Accepts pre-hashed input and lowercases it to prevent double hashing.
   */
  private async normalizeApiKey(apiKey: string): Promise<string> {
    const value = apiKey?.trim();
    if (!value) {
      throw new Error('API key must be a non-empty string');
    }

    if (/^[a-f0-9]{64}$/i.test(value)) {
      return value.toLowerCase();
    }

    // Use Web Crypto when available, fallback to Node crypto
    if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(value);
      const hashBuffer = await (globalThis as any).crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(value).digest('hex');
  }
}
