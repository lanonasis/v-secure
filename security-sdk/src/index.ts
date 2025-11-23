/**
 * @onasis/security-sdk
 * Centralized Security and Encryption SDK for Onasis Ecosystem
 *
 * Used by: MCP Router, API Gateway, IDE Extensions, SDK, Dashboard
 * Provides: AES-256-GCM encryption, key derivation, secure storage
 */

import crypto from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  keyId: string;
  algorithm: string;
  version: string;
}

export interface EncryptionOptions {
  algorithm?: "aes-256-gcm" | "aes-256-cbc";
  keyDerivation?: "hkdf" | "pbkdf2";
  iterations?: number;
}

export interface KeyMetadata {
  keyId: string;
  createdAt: Date;
  purpose: string;
  algorithm: string;
}

// ============================================================================
// SECURITY SDK CLASS
// ============================================================================

export class SecuritySDK {
  private masterKey: Buffer;
  private readonly CURRENT_VERSION = "1.0";
  private readonly DEFAULT_ALGORITHM = "aes-256-gcm";

  constructor(masterKeyHex?: string) {
    const keyHex =
      masterKeyHex ||
      process.env.ONASIS_MASTER_KEY ||
      process.env.VSECURE_MASTER_KEY;

    if (!keyHex) {
      throw new Error(
        "Master key is required. Set ONASIS_MASTER_KEY or VSECURE_MASTER_KEY environment variable"
      );
    }

    // Validate key length (must be 32 bytes for AES-256)
    const keyBuffer = Buffer.from(keyHex, "hex");
    if (keyBuffer.length !== 32) {
      throw new Error(
        "Master key must be 32 bytes (64 hex characters) for AES-256"
      );
    }

    this.masterKey = keyBuffer;
  }

  // ==========================================================================
  // ENCRYPTION / DECRYPTION
  // ==========================================================================

  /**
   * Encrypt data with AES-256-GCM
   * @param data - Data to encrypt (string or object)
   * @param context - Context for key derivation (e.g., "user_123_stripe")
   * @param options - Encryption options
   */
  encrypt(
    data: string | object,
    context: string,
    options: EncryptionOptions = {}
  ): EncryptedData {
    try {
      const algorithm = options.algorithm || this.DEFAULT_ALGORITHM;
      const dataString = typeof data === "string" ? data : JSON.stringify(data);

      // Generate unique key ID
      const keyId = this.generateKeyId(context);

      // Derive encryption key from master key + context
      const encryptionKey = this.deriveKey(keyId, context, options);

      // Generate random IV (16 bytes for GCM)
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv) as crypto.CipherGCM;

      // Encrypt data
      let encrypted = cipher.update(dataString, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Get auth tag (for GCM mode)
      const authTag =
        algorithm === "aes-256-gcm" ? cipher.getAuthTag() : Buffer.alloc(0);

      return {
        encrypted,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
        keyId,
        algorithm,
        version: this.CURRENT_VERSION,
      };
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypt data
   * @param encryptedData - Encrypted data object
   * @param context - Context for key derivation
   */
  decrypt(encryptedData: EncryptedData, context: string): string {
    try {
      // Derive decryption key
      const decryptionKey = this.deriveKey(encryptedData.keyId, context);

      // Create decipher
      const decipher = crypto.createDecipheriv(
        encryptedData.algorithm as any,
        decryptionKey,
        Buffer.from(encryptedData.iv, "hex")
      ) as crypto.DecipherGCM;

      // Set auth tag (for GCM mode)
      if (encryptedData.algorithm === "aes-256-gcm" && encryptedData.authTag) {
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));
      }

      // Decrypt
      let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt data");
    }
  }

  /**
   * Decrypt and parse as JSON
   */
  decryptJSON<T = any>(encryptedData: EncryptedData, context: string): T {
    const decrypted = this.decrypt(encryptedData, context);
    return JSON.parse(decrypted);
  }

  // ==========================================================================
  // KEY DERIVATION
  // ==========================================================================

  /**
   * Derive encryption key using HKDF
   */
  private deriveKey(
    keyId: string,
    context: string,
    options: EncryptionOptions = {}
  ): Buffer {
    const method = options.keyDerivation || "hkdf";

    if (method === "hkdf") {
      return this.deriveKeyHKDF(keyId, context);
    } else {
      return this.deriveKeyPBKDF2(keyId, context, options.iterations || 100000);
    }
  }

  /**
   * Derive key using HKDF (recommended)
   */
  private deriveKeyHKDF(keyId: string, context: string): Buffer {
    const salt = Buffer.from(keyId, "utf8");
    const info = Buffer.from(`onasis-security-${context}`, "utf8");

    const key = crypto.hkdfSync(
      "sha256",
      this.masterKey,
      salt,
      info,
      32 // 256 bits for AES-256
    );
    return Buffer.from(key);
  }

  /**
   * Derive key using PBKDF2 (legacy support)
   */
  private deriveKeyPBKDF2(
    keyId: string,
    context: string,
    iterations: number
  ): Buffer {
    const salt = `${keyId}-${context}`;
    return crypto.pbkdf2Sync(this.masterKey, salt, iterations, 32, "sha256");
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(context: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    const contextHash = crypto
      .createHash("sha256")
      .update(context)
      .digest("hex")
      .substring(0, 8);
    return `onasis_${contextHash}_${timestamp}_${random}`;
  }

  // ==========================================================================
  // KEY ROTATION
  // ==========================================================================

  /**
   * Rotate encryption (decrypt with old key, encrypt with new key)
   */
  rotate(
    oldEncrypted: EncryptedData,
    context: string,
    newData?: string | object
  ): EncryptedData {
    // Decrypt with old key
    const decrypted = newData || this.decrypt(oldEncrypted, context);

    // Re-encrypt with new key
    return this.encrypt(decrypted, context);
  }

  // ==========================================================================
  // HASHING & VALIDATION
  // ==========================================================================

  /**
   * Create secure hash (for passwords, tokens, etc.)
   */
  hash(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, "sha512");
    return `${actualSalt}:${hash.toString("hex")}`;
  }

  /**
   * Verify hash
   */
  verifyHash(data: string, hashedData: string): boolean {
    const [salt, originalHash] = hashedData.split(":");
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, "sha512");
    return hash.toString("hex") === originalHash;
  }

  /**
   * Generate secure random token
   */
  generateToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString("hex");
  }

  /**
   * Generate API key with prefix
   */
  generateAPIKey(prefix: string = "onasis"): string {
    const random = crypto.randomBytes(32).toString("hex");
    return `${prefix}_${random}`;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Sanitize sensitive data for logging
   */
  sanitize(data: string, showChars: number = 4): string {
    if (data.length <= showChars * 2) {
      return "***";
    }
    return `${data.substring(0, showChars)}...${data.substring(data.length - showChars)}`;
  }

  /**
   * Validate encrypted data structure
   */
  isValidEncryptedData(data: any): data is EncryptedData {
    return (
      data &&
      typeof data.encrypted === "string" &&
      typeof data.iv === "string" &&
      typeof data.keyId === "string" &&
      typeof data.algorithm === "string"
    );
  }

  /**
   * Generate master key (for initial setup)
   */
  static generateMasterKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let securitySDK: SecuritySDK | null = null;

export function getSecuritySDK(masterKey?: string): SecuritySDK {
  if (!securitySDK) {
    securitySDK = new SecuritySDK(masterKey);
  }
  return securitySDK;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default SecuritySDK;
