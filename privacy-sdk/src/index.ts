// Privacy SDK for Onasis ecosystem - Data masking and anonymization utilities

import * as crypto from 'crypto';
import type { MaskingOptions, PrivacyConfig } from '@onasis/shared-types';

// Default privacy configuration
const DEFAULT_CONFIG: PrivacyConfig = {
  enableMasking: true,
  defaultMaskChar: '*',
  preserveFormat: true,
  logLevel: 'basic'
};

/**
 * Privacy SDK class for data masking and anonymization
 */
export class PrivacySDK {
  private config: PrivacyConfig;

  constructor(config: Partial<PrivacyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Mask sensitive data based on type
   */
  maskData(data: string, options: MaskingOptions): string {
    if (!this.config.enableMasking) {
      return data;
    }

    const maskChar = options.maskChar || this.config.defaultMaskChar;

    switch (options.type) {
      case 'email':
        return this.maskEmail(data, maskChar);
      case 'phone':
        return this.maskPhone(data, maskChar);
      case 'ssn':
        return this.maskSSN(data, maskChar);
      case 'credit-card':
        return this.maskCreditCard(data, maskChar);
      case 'custom':
        return this.maskCustom(data, options);
      default:
        return this.maskGeneric(data, maskChar, options.preserveLength);
    }
  }

  /**
   * Mask email addresses
   */
  private maskEmail(email: string, maskChar: string = '*'): string {
    const [username, domain] = email.split('@');
    if (!domain) return email; // Invalid email

    const maskedUsername = username.length > 2 
      ? username[0] + maskChar.repeat(username.length - 2) + username[username.length - 1]
      : maskChar.repeat(username.length);

    return `${maskedUsername}@${domain}`;
  }

  /**
   * Mask phone numbers
   */
  private maskPhone(phone: string, maskChar: string = '*'): string {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 4) return maskChar.repeat(phone.length);

    const masked = cleanPhone.slice(0, -4).replace(/\d/g, maskChar) + cleanPhone.slice(-4);
    return phone.replace(/\d/g, (match, index) => {
      const cleanIndex = cleanPhone.indexOf(match);
      return masked[cleanIndex] || match;
    });
  }

  /**
   * Mask SSN
   */
  private maskSSN(ssn: string, maskChar: string = '*'): string {
    return ssn.replace(/(\d{3})-(\d{2})-(\d{4})/, `${maskChar.repeat(3)}-${maskChar.repeat(2)}-$3`);
  }

  /**
   * Mask credit card numbers
   */
  private maskCreditCard(cardNumber: string, maskChar: string = '*'): string {
    const cleanCard = cardNumber.replace(/\D/g, '');
    if (cleanCard.length < 8) return maskChar.repeat(cardNumber.length);

    const masked = maskChar.repeat(cleanCard.length - 4) + cleanCard.slice(-4);
    return cardNumber.replace(/\d/g, (match, index) => {
      const cleanIndex = cleanCard.indexOf(match);
      return masked[cleanIndex] || match;
    });
  }

  /**
   * Mask with custom pattern
   */
  private maskCustom(data: string, options: MaskingOptions): string {
    if (!options.pattern) return this.maskGeneric(data, options.maskChar);

    const regex = new RegExp(options.pattern, 'g');
    return data.replace(regex, (match) => {
      return options.maskChar?.repeat(match.length) || '*'.repeat(match.length);
    });
  }

  /**
   * Generic masking function
   */
  private maskGeneric(data: string, maskChar: string = '*', preserveLength: boolean = true): string {
    if (!preserveLength) {
      return maskChar.repeat(3);
    }
    return maskChar.repeat(data.length);
  }

  /**
   * Generate anonymous ID
   */
  generateAnonymousId(originalId: string, salt: string = ''): string {
    const hash = crypto.createHash('sha256');
    hash.update(originalId + salt);
    return hash.digest('hex').substring(0, 16);
  }

  /**
   * Detect PII in text
   */
  detectPII(text: string): Array<{ type: string; value: string; position: number }> {
    const patterns = [
      { type: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
      { type: 'phone', pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
      { type: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
      { type: 'credit-card', pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g }
    ];

    const detected: Array<{ type: string; value: string; position: number }> = [];

    patterns.forEach(({ type, pattern }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        detected.push({
          type,
          value: match[0],
          position: match.index
        });
      }
    });

    return detected;
  }

  /**
   * Sanitize object by masking PII
   */
  sanitizeObject(obj: any, fieldMappings: Record<string, MaskingOptions> = {}): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, fieldMappings));
    }

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && fieldMappings[key]) {
        sanitized[key] = this.maskData(value, fieldMappings[key]);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value, fieldMappings);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

// Export default instance
export const privacy = new PrivacySDK();

// Export types and utilities
export type { MaskingOptions, PrivacyConfig } from '@onasis/shared-types';
export { DEFAULT_CONFIG };