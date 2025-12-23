// Vortex Secure - Client-Side Encryption Library

export class VortexEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 16;
  private static readonly ITERATIONS = 100000;

  /**
   * Generate a cryptographic key from password using PBKDF2
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt a secret value using AES-GCM
   */
  static async encrypt(plaintext: string, masterPassword: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);

      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Derive encryption key
      const key = await this.deriveKey(masterPassword, salt);

      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        data
      );

      // Combine salt + iv + encrypted data
      const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      result.set(salt, 0);
      result.set(iv, salt.length);
      result.set(new Uint8Array(encrypted), salt.length + iv.length);

      // Return base64 encoded result
      return btoa(String.fromCharCode(...result));
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a secret value using AES-GCM
   */
  static async decrypt(encryptedData: string, masterPassword: string): Promise<string> {
    try {
      // Decode from base64
      const data = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract salt, IV, and encrypted data
      const salt = data.slice(0, this.SALT_LENGTH);
      const iv = data.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const encrypted = data.slice(this.SALT_LENGTH + this.IV_LENGTH);

      // Derive decryption key
      const key = await this.deriveKey(masterPassword, salt);

      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        encrypted
      );

      // Return decrypted string
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate a secure random password/API key
   */
  static generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  }

  /**
   * Generate a secure API key with specific format
   */
  static generateAPIKey(prefix: string = 'vx'): string {
    const randomPart = this.generateSecurePassword(40);
    const timestamp = Date.now().toString(36);
    return `${prefix}_${timestamp}_${randomPart}`;
  }

  /**
   * Hash a password using PBKDF2 for storage (not encryption)
   */
  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const hashArray = new Uint8Array(hashBuffer);
    const result = new Uint8Array(salt.length + hashArray.length);
    result.set(salt, 0);
    result.set(hashArray, salt.length);

    return btoa(String.fromCharCode(...result));
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const data = new Uint8Array(
        atob(hash).split('').map(char => char.charCodeAt(0))
      );

      const salt = data.slice(0, 16);
      const storedHash = data.slice(16);

      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
      );

      const hashBuffer = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt,
          iterations: this.ITERATIONS,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );

      const hashArray = new Uint8Array(hashBuffer);
      
      // Compare hashes
      if (hashArray.length !== storedHash.length) return false;
      
      let result = 0;
      for (let i = 0; i < hashArray.length; i++) {
        result |= hashArray[i] ^ storedHash[i];
      }
      
      return result === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a secure encryption key for master password
   */
  static async generateMasterKey(): Promise<string> {
    const key = await crypto.subtle.generateKey(
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );

    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const keyArray = new Uint8Array(exportedKey);
    return btoa(String.fromCharCode(...keyArray));
  }

  /**
   * Validate encryption strength
   */
  static validateEncryptionStrength(data: string): {
    isValid: boolean;
    entropy: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let entropy = 0;

    // Calculate entropy
    const charCounts = new Map<string, number>();
    for (const char of data) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }

    for (const count of charCounts.values()) {
      const probability = count / data.length;
      entropy -= probability * Math.log2(probability);
    }

    const isValid = entropy >= 4; // Minimum entropy threshold

    if (data.length < 20) recommendations.push('Increase length to at least 20 characters');
    if (entropy < 4) recommendations.push('Increase character diversity for better entropy');
    if (!/[A-Z]/.test(data)) recommendations.push('Include uppercase letters');
    if (!/[a-z]/.test(data)) recommendations.push('Include lowercase letters');
    if (!/[0-9]/.test(data)) recommendations.push('Include numbers');
    if (!/[^A-Za-z0-9]/.test(data)) recommendations.push('Include special characters');

    return { isValid, entropy, recommendations };
  }
}