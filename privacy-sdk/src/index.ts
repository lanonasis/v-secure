/**
 * @lanonasis/privacy-sdk
 *
 * Enterprise-grade privacy utilities for data masking, PII detection,
 * tokenization, and GDPR compliance.
 *
 * Part of the LanOnasis Security Suite.
 */

// ============================================
// TYPES
// ============================================

export type PIIType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit-card'
  | 'name'
  | 'address'
  | 'dob'
  | 'ip-address'
  | 'iban'
  | 'passport'
  | 'driver-license'
  | 'uk-nino'
  | 'uk-postcode'
  | 'custom';

export type Locale = 'US' | 'UK' | 'DE' | 'FR' | 'EU' | 'JP' | 'AU' | 'CA';

export type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface MaskingOptions {
  type: PIIType;
  maskChar?: string;
  showFirst?: number;
  showLast?: number;
  preserveFormat?: boolean;
  preserveLength?: boolean;
  locale?: Locale;
  pattern?: string | RegExp;
}

export interface DetectionResult {
  type: PIIType;
  value: string;
  masked: string;
  position: number;
  length: number;
  confidence: number;
  sensitivity: SensitivityLevel;
  regulations: string[];
}

export interface ScanOptions {
  deep?: boolean;
  includeFieldNames?: boolean;
  confidenceThreshold?: number;
  autoMask?: boolean;
}

export interface PrivacyConfig {
  // Masking
  enableMasking: boolean;
  defaultMaskChar: string;
  preserveFormat: boolean;

  // Detection
  enableAutoDetect: boolean;
  confidenceThreshold: number;
  detectFieldNames: boolean;

  // Compliance
  gdprMode: boolean;
  auditLog: boolean;

  // Logging
  logLevel: 'none' | 'basic' | 'verbose';
}

export interface AuditEntry {
  timestamp: Date;
  operation: 'mask' | 'detect' | 'tokenize' | 'detokenize' | 'scan';
  dataType?: PIIType;
  field?: string;
  actor?: string;
  reason?: string;
  success: boolean;
}

// ============================================
// PATTERN REGISTRY
// ============================================

interface PatternDefinition {
  type: PIIType;
  pattern: RegExp;
  sensitivity: SensitivityLevel;
  regulations: string[];
  validate?: (value: string) => boolean;
  locale?: Locale[];
}

const PATTERNS: PatternDefinition[] = [
  // Email
  {
    type: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    sensitivity: 'high',
    regulations: ['GDPR', 'CCPA'],
  },

  // US Phone
  {
    type: 'phone',
    pattern: /\b(?:\+1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    sensitivity: 'medium',
    regulations: ['CCPA'],
    locale: ['US', 'CA'],
  },

  // UK Phone
  {
    type: 'phone',
    pattern: /\b(?:\+44[-.\s]?|0)(?:7\d{3}[-.\s]?\d{6}|[1-9]\d{2,4}[-.\s]?\d{3,6})\b/g,
    sensitivity: 'medium',
    regulations: ['GDPR'],
    locale: ['UK'],
  },

  // International Phone (E.164)
  {
    type: 'phone',
    pattern: /\b\+[1-9]\d{6,14}\b/g,
    sensitivity: 'medium',
    regulations: ['GDPR', 'CCPA'],
  },

  // US SSN
  {
    type: 'ssn',
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    sensitivity: 'critical',
    regulations: ['HIPAA', 'CCPA'],
    locale: ['US'],
    validate: (ssn: string) => {
      const clean = ssn.replace(/\D/g, '');
      if (clean.length !== 9) return false;
      // Basic SSN validation rules
      const area = parseInt(clean.substring(0, 3));
      if (area === 0 || area === 666 || area >= 900) return false;
      return true;
    },
  },

  // UK National Insurance Number
  {
    type: 'uk-nino',
    pattern: /\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi,
    sensitivity: 'critical',
    regulations: ['GDPR'],
    locale: ['UK'],
  },

  // Credit Card (with Luhn validation)
  {
    type: 'credit-card',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    sensitivity: 'critical',
    regulations: ['PCI-DSS', 'GDPR', 'CCPA'],
    validate: (num: string) => {
      const clean = num.replace(/\D/g, '');
      if (clean.length < 13 || clean.length > 19) return false;
      // Luhn algorithm
      let sum = 0;
      let isEven = false;
      for (let i = clean.length - 1; i >= 0; i--) {
        let digit = parseInt(clean[i]);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
      return sum % 10 === 0;
    },
  },

  // Credit Card with separators
  {
    type: 'credit-card',
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    sensitivity: 'critical',
    regulations: ['PCI-DSS', 'GDPR', 'CCPA'],
  },

  // IBAN
  {
    type: 'iban',
    pattern: /\b[A-Z]{2}\d{2}[-\s]?[A-Z0-9]{4}[-\s]?[A-Z0-9]{4}[-\s]?[A-Z0-9]{4}[-\s]?[A-Z0-9]{0,14}\b/gi,
    sensitivity: 'high',
    regulations: ['GDPR', 'PCI-DSS'],
    locale: ['EU', 'UK'],
  },

  // IPv4
  {
    type: 'ip-address',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    sensitivity: 'medium',
    regulations: ['GDPR'],
    validate: (ip: string) => {
      const parts = ip.split('.');
      return parts.every(p => parseInt(p) >= 0 && parseInt(p) <= 255);
    },
  },

  // IPv6
  {
    type: 'ip-address',
    pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/gi,
    sensitivity: 'medium',
    regulations: ['GDPR'],
  },

  // Date of Birth (various formats)
  {
    type: 'dob',
    pattern: /\b(?:0?[1-9]|1[0-2])[-\/](?:0?[1-9]|[12]\d|3[01])[-\/](?:19|20)\d{2}\b/g, // MM/DD/YYYY
    sensitivity: 'high',
    regulations: ['GDPR', 'HIPAA'],
    locale: ['US'],
  },
  {
    type: 'dob',
    pattern: /\b(?:0?[1-9]|[12]\d|3[01])[-\/](?:0?[1-9]|1[0-2])[-\/](?:19|20)\d{2}\b/g, // DD/MM/YYYY
    sensitivity: 'high',
    regulations: ['GDPR'],
    locale: ['UK', 'EU'],
  },

  // UK Postcode
  {
    type: 'uk-postcode',
    pattern: /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi,
    sensitivity: 'medium',
    regulations: ['GDPR'],
    locale: ['UK'],
  },

  // US Passport
  {
    type: 'passport',
    pattern: /\b[A-Z]\d{8}\b/gi,
    sensitivity: 'critical',
    regulations: ['GDPR'],
    locale: ['US'],
  },
];

// Field name hints for context-aware detection
const FIELD_NAME_HINTS: Record<string, PIIType> = {
  email: 'email',
  email_address: 'email',
  emailAddress: 'email',
  mail: 'email',
  phone: 'phone',
  phone_number: 'phone',
  phoneNumber: 'phone',
  mobile: 'phone',
  cell: 'phone',
  telephone: 'phone',
  ssn: 'ssn',
  social_security: 'ssn',
  socialSecurity: 'ssn',
  tax_id: 'ssn',
  credit_card: 'credit-card',
  creditCard: 'credit-card',
  card_number: 'credit-card',
  cardNumber: 'credit-card',
  pan: 'credit-card',
  dob: 'dob',
  date_of_birth: 'dob',
  dateOfBirth: 'dob',
  birthday: 'dob',
  birthdate: 'dob',
  ip: 'ip-address',
  ip_address: 'ip-address',
  ipAddress: 'ip-address',
  iban: 'iban',
  bank_account: 'iban',
  passport: 'passport',
  passport_number: 'passport',
  nino: 'uk-nino',
  national_insurance: 'uk-nino',
  postcode: 'uk-postcode',
  postal_code: 'uk-postcode',
  zip: 'uk-postcode',
};

// ============================================
// CRYPTO ABSTRACTION
// ============================================

interface CryptoProvider {
  hash(data: string): string;
  randomBytes(length: number): string;
}

// Node.js crypto provider
const nodeCrypto: CryptoProvider = {
  hash: (data: string): string => {
    // Dynamic import for Node.js
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  },
  randomBytes: (length: number): string => {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  },
};

// Browser crypto provider (fallback)
const browserCrypto: CryptoProvider = {
  hash: (data: string): string => {
    // Simple hash for browser (use Web Crypto API in production)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  },
  randomBytes: (length: number): string => {
    const array = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  },
};

// Auto-detect environment
const getCrypto = (): CryptoProvider => {
  if (typeof window === 'undefined') {
    try {
      require('crypto');
      return nodeCrypto;
    } catch {
      return browserCrypto;
    }
  }
  return browserCrypto;
};

// ============================================
// MAIN SDK CLASS
// ============================================

const DEFAULT_CONFIG: PrivacyConfig = {
  enableMasking: true,
  defaultMaskChar: '*',
  preserveFormat: true,
  enableAutoDetect: true,
  confidenceThreshold: 0.7,
  detectFieldNames: true,
  gdprMode: false,
  auditLog: false,
  logLevel: 'basic',
};

export class PrivacySDK {
  private config: PrivacyConfig;
  private crypto: CryptoProvider;
  private customPatterns: PatternDefinition[] = [];
  private auditLog: AuditEntry[] = [];

  constructor(config: Partial<PrivacyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.crypto = getCrypto();
  }

  // ========================================
  // MASKING
  // ========================================

  /**
   * Mask sensitive data based on type
   */
  mask(data: string, type: PIIType, options: Partial<MaskingOptions> = {}): string {
    if (!this.config.enableMasking || !data) {
      return data;
    }

    const maskChar = options.maskChar || this.config.defaultMaskChar;
    const fullOptions: MaskingOptions = { type, maskChar, ...options };

    let result: string;

    switch (type) {
      case 'email':
        result = this.maskEmail(data, maskChar);
        break;
      case 'phone':
        result = this.maskPhone(data, maskChar, options.showLast ?? 4);
        break;
      case 'ssn':
        result = this.maskSSN(data, maskChar);
        break;
      case 'credit-card':
        result = this.maskCreditCard(data, maskChar, options.showFirst ?? 0, options.showLast ?? 4);
        break;
      case 'iban':
        result = this.maskIBAN(data, maskChar);
        break;
      case 'ip-address':
        result = this.maskIP(data, maskChar);
        break;
      case 'uk-nino':
        result = this.maskUKNINO(data, maskChar);
        break;
      case 'uk-postcode':
        result = this.maskUKPostcode(data, maskChar);
        break;
      case 'name':
        result = this.maskName(data, maskChar);
        break;
      case 'custom':
        result = this.maskCustom(data, fullOptions);
        break;
      default:
        result = this.maskGeneric(data, maskChar, options.preserveLength ?? true);
    }

    this.log('mask', type, true);
    return result;
  }

  /**
   * Batch mask multiple values
   */
  maskBatch(items: Array<{ value: string; type: PIIType; options?: Partial<MaskingOptions> }>): string[] {
    return items.map(item => this.mask(item.value, item.type, item.options));
  }

  private maskEmail(email: string, maskChar: string): string {
    const atIndex = email.indexOf('@');
    if (atIndex === -1) return email;

    const [username, domain] = email.split('@');

    if (username.length <= 2) {
      return maskChar.repeat(username.length) + '@' + domain;
    }

    const maskedUsername = username[0] +
      maskChar.repeat(Math.max(username.length - 2, 1)) +
      username[username.length - 1];

    return `${maskedUsername}@${domain}`;
  }

  private maskPhone(phone: string, maskChar: string, showLast: number = 4): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < showLast) return maskChar.repeat(phone.length);

    let digitIndex = 0;
    return phone.replace(/\d/g, () => {
      const shouldMask = digitIndex < digits.length - showLast;
      digitIndex++;
      return shouldMask ? maskChar : digits[digitIndex - 1];
    });
  }

  private maskSSN(ssn: string, maskChar: string): string {
    // Show only last 4 digits
    return ssn.replace(/^(\d{3})([-\s]?)(\d{2})([-\s]?)(\d{4})$/,
      `${maskChar.repeat(3)}$2${maskChar.repeat(2)}$4$5`);
  }

  private maskCreditCard(card: string, maskChar: string, showFirst: number = 0, showLast: number = 4): string {
    const digits = card.replace(/\D/g, '');
    if (digits.length < showFirst + showLast) return maskChar.repeat(card.length);

    let digitIndex = 0;
    return card.replace(/\d/g, () => {
      const pos = digitIndex++;
      if (pos < showFirst) return digits[pos];
      if (pos >= digits.length - showLast) return digits[pos];
      return maskChar;
    });
  }

  private maskIBAN(iban: string, maskChar: string): string {
    // Show country code and last 4
    const clean = iban.replace(/\s/g, '');
    if (clean.length < 6) return maskChar.repeat(iban.length);

    const country = clean.substring(0, 2);
    const last4 = clean.substring(clean.length - 4);
    const middleLength = clean.length - 6;

    return country + maskChar.repeat(2) + ' ' + maskChar.repeat(middleLength) + last4;
  }

  private maskIP(ip: string, maskChar: string): string {
    if (ip.includes(':')) {
      // IPv6 - mask middle sections
      const parts = ip.split(':');
      return parts.map((p, i) => (i === 0 || i === parts.length - 1) ? p : maskChar.repeat(4)).join(':');
    }
    // IPv4 - mask first two octets
    const parts = ip.split('.');
    return [maskChar.repeat(3), maskChar.repeat(3), parts[2], parts[3]].join('.');
  }

  private maskUKNINO(nino: string, maskChar: string): string {
    // Show only last character (suffix)
    const clean = nino.replace(/\s/g, '');
    return maskChar.repeat(clean.length - 1) + clean[clean.length - 1];
  }

  private maskUKPostcode(postcode: string, maskChar: string): string {
    // Mask outward code, show inward code
    const parts = postcode.trim().split(/\s+/);
    if (parts.length === 2) {
      return maskChar.repeat(parts[0].length) + ' ' + parts[1];
    }
    return maskChar.repeat(Math.max(postcode.length - 3, 0)) + postcode.slice(-3);
  }

  private maskName(name: string, maskChar: string): string {
    const parts = name.split(/\s+/);
    return parts.map(part => {
      if (part.length <= 1) return part;
      return part[0] + maskChar.repeat(part.length - 1);
    }).join(' ');
  }

  private maskCustom(data: string, options: MaskingOptions): string {
    if (!options.pattern) return this.maskGeneric(data, options.maskChar);

    const regex = typeof options.pattern === 'string'
      ? new RegExp(options.pattern, 'g')
      : options.pattern;

    return data.replace(regex, (match) => {
      return (options.maskChar || '*').repeat(match.length);
    });
  }

  private maskGeneric(data: string, maskChar: string = '*', preserveLength: boolean = true): string {
    if (!preserveLength) {
      return maskChar.repeat(Math.min(8, data.length));
    }
    return maskChar.repeat(data.length);
  }

  // ========================================
  // DETECTION
  // ========================================

  /**
   * Detect PII in text
   */
  detect(text: string, options: { locale?: Locale } = {}): DetectionResult[] {
    const results: DetectionResult[] = [];
    const allPatterns = [...PATTERNS, ...this.customPatterns];

    for (const patternDef of allPatterns) {
      // Filter by locale if specified
      if (options.locale && patternDef.locale && !patternDef.locale.includes(options.locale)) {
        continue;
      }

      // Reset regex lastIndex
      const pattern = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const value = match[0];

        // Validate if validator exists
        let confidence = 0.85;
        if (patternDef.validate) {
          if (!patternDef.validate(value)) {
            confidence = 0.3; // Low confidence if validation fails
            continue; // Skip invalid matches
          }
          confidence = 0.98; // High confidence if validation passes
        }

        // Check for duplicates
        const isDuplicate = results.some(r =>
          r.position === match!.index && r.type === patternDef.type
        );
        if (isDuplicate) continue;

        results.push({
          type: patternDef.type,
          value,
          masked: this.mask(value, patternDef.type),
          position: match.index,
          length: value.length,
          confidence,
          sensitivity: patternDef.sensitivity,
          regulations: patternDef.regulations,
        });
      }
    }

    // Sort by position
    results.sort((a, b) => a.position - b.position);

    this.log('detect', undefined, true);
    return results;
  }

  /**
   * Detect PII and return masked text
   */
  detectAndMask(text: string, options: { locale?: Locale } = {}): string {
    const results = this.detect(text, options);
    let maskedText = text;

    // Process in reverse order to maintain positions
    for (let i = results.length - 1; i >= 0; i--) {
      const { position, length, masked } = results[i];
      maskedText = maskedText.substring(0, position) + masked + maskedText.substring(position + length);
    }

    return maskedText;
  }

  /**
   * Scan an object recursively for PII
   */
  scan(obj: unknown, options: ScanOptions = {}): {
    piiFound: boolean;
    results: Array<{ path: string; type: PIIType; value: string; masked: string }>;
    sanitized?: unknown;
  } {
    const results: Array<{ path: string; type: PIIType; value: string; masked: string }> = [];

    const scanValue = (value: unknown, path: string): unknown => {
      if (value === null || value === undefined) {
        return value;
      }

      if (typeof value === 'string') {
        // Check field name hint
        const fieldName = path.split('.').pop()?.toLowerCase() || '';
        const hintedType = FIELD_NAME_HINTS[fieldName];

        if (hintedType && this.config.detectFieldNames) {
          results.push({
            path,
            type: hintedType,
            value: value,
            masked: this.mask(value, hintedType),
          });
          return options.autoMask ? this.mask(value, hintedType) : value;
        }

        // Detect PII in string
        const detected = this.detect(value);
        for (const d of detected) {
          if (d.confidence >= (options.confidenceThreshold ?? this.config.confidenceThreshold)) {
            results.push({
              path,
              type: d.type,
              value: d.value,
              masked: d.masked,
            });
          }
        }
        return options.autoMask ? this.detectAndMask(value) : value;
      }

      if (Array.isArray(value)) {
        return value.map((item, index) => scanValue(item, `${path}[${index}]`));
      }

      if (typeof value === 'object') {
        const scanned: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
          scanned[key] = scanValue(val, path ? `${path}.${key}` : key);
        }
        return scanned;
      }

      return value;
    };

    const sanitized = options.deep !== false ? scanValue(obj, '') : obj;

    this.log('scan', undefined, true);

    return {
      piiFound: results.length > 0,
      results,
      ...(options.autoMask && { sanitized }),
    };
  }

  /**
   * Classify a single value
   */
  classify(value: string): {
    type: PIIType | 'unknown';
    sensitivity: SensitivityLevel;
    confidence: number;
    regulations: string[];
  } {
    const results = this.detect(value);

    if (results.length === 0) {
      return {
        type: 'unknown',
        sensitivity: 'low',
        confidence: 0,
        regulations: [],
      };
    }

    // Return highest confidence match
    const best = results.reduce((a, b) => a.confidence > b.confidence ? a : b);
    return {
      type: best.type,
      sensitivity: best.sensitivity,
      confidence: best.confidence,
      regulations: best.regulations,
    };
  }

  // ========================================
  // SANITIZATION
  // ========================================

  /**
   * Sanitize object by masking specified fields
   */
  sanitizeObject<T extends Record<string, unknown>>(
    obj: T,
    fieldMappings: Record<string, PIIType | MaskingOptions>
  ): T {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized = { ...obj } as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      if (fieldMappings[key] && typeof value === 'string') {
        const mapping = fieldMappings[key];
        const options: MaskingOptions = typeof mapping === 'string'
          ? { type: mapping }
          : mapping;
        sanitized[key] = this.mask(value, options.type, options);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(
          value as Record<string, unknown>,
          fieldMappings
        );
      }
    }

    return sanitized as T;
  }

  // ========================================
  // ANONYMIZATION
  // ========================================

  /**
   * Generate deterministic anonymous ID
   */
  generateAnonymousId(originalId: string, salt: string = ''): string {
    const hash = this.crypto.hash(originalId + salt);
    return 'anon_' + hash.substring(0, 16);
  }

  /**
   * Generate random token
   */
  generateToken(length: number = 32): string {
    return this.crypto.randomBytes(length);
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string, salt?: string): string {
    return this.crypto.hash(data + (salt || ''));
  }

  // ========================================
  // PATTERN MANAGEMENT
  // ========================================

  /**
   * Register custom PII pattern
   */
  registerPattern(definition: Omit<PatternDefinition, 'type'> & { type: string }): void {
    this.customPatterns.push(definition as PatternDefinition);
  }

  /**
   * Get all registered patterns
   */
  getPatterns(): PatternDefinition[] {
    return [...PATTERNS, ...this.customPatterns];
  }

  // ========================================
  // AUDIT LOGGING
  // ========================================

  private log(operation: AuditEntry['operation'], dataType?: PIIType, success: boolean = true): void {
    if (!this.config.auditLog) return;

    this.auditLog.push({
      timestamp: new Date(),
      operation,
      dataType,
      success,
    });

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(filter?: Partial<Pick<AuditEntry, 'operation' | 'dataType'>>): AuditEntry[] {
    let log = [...this.auditLog];

    if (filter?.operation) {
      log = log.filter(e => e.operation === filter.operation);
    }
    if (filter?.dataType) {
      log = log.filter(e => e.dataType === filter.dataType);
    }

    return log;
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  // ========================================
  // CONFIGURATION
  // ========================================

  /**
   * Update configuration
   */
  configure(config: Partial<PrivacyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PrivacyConfig {
    return { ...this.config };
  }
}

// ============================================
// EXPORTS
// ============================================

// Default instance
export const privacy = new PrivacySDK();

// Convenience functions
export const mask = (data: string, type: PIIType, options?: Partial<MaskingOptions>) =>
  privacy.mask(data, type, options);

export const detect = (text: string, options?: { locale?: Locale }) =>
  privacy.detect(text, options);

export const detectAndMask = (text: string, options?: { locale?: Locale }) =>
  privacy.detectAndMask(text, options);

export const scan = (obj: unknown, options?: ScanOptions) =>
  privacy.scan(obj, options);

export const sanitize = <T extends Record<string, unknown>>(
  obj: T,
  fieldMappings: Record<string, PIIType | MaskingOptions>
) => privacy.sanitizeObject(obj, fieldMappings);

// Re-export config
export { DEFAULT_CONFIG };
