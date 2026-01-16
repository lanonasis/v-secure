/**
 * @lanonasis/privacy-sdk - Test Suite
 *
 * Run with: bun test or vitest
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PrivacySDK,
  mask,
  detect,
  detectAndMask,
  scan,
  sanitize,
  DEFAULT_CONFIG
} from '../src/index';

describe('PrivacySDK', () => {
  let privacy: PrivacySDK;

  beforeEach(() => {
    privacy = new PrivacySDK();
  });

  // ========================================
  // MASKING TESTS
  // ========================================

  describe('Masking', () => {
    describe('Email', () => {
      it('should mask email with first and last character visible', () => {
        expect(mask('john@example.com', 'email')).toBe('j**n@example.com');
        expect(mask('alice.smith@company.org', 'email')).toBe('a*********h@company.org');
      });

      it('should handle short usernames', () => {
        expect(mask('ab@test.com', 'email')).toBe('**@test.com');
        expect(mask('a@test.com', 'email')).toBe('*@test.com');
      });

      it('should handle invalid emails gracefully', () => {
        expect(mask('notanemail', 'email')).toBe('notanemail');
      });
    });

    describe('Phone', () => {
      it('should mask phone showing last 4 digits', () => {
        expect(mask('555-123-4567', 'phone')).toBe('***-***-4567');
        expect(mask('(555) 123-4567', 'phone')).toBe('(***) ***-4567');
      });

      it('should handle international formats', () => {
        expect(mask('+1 555 123 4567', 'phone')).toBe('+* *** *** 4567');
      });
    });

    describe('SSN', () => {
      it('should mask SSN showing last 4 digits', () => {
        expect(mask('123-45-6789', 'ssn')).toBe('***-**-6789');
      });

      it('should handle SSN without dashes', () => {
        expect(mask('123 45 6789', 'ssn')).toBe('*** ** 6789');
      });
    });

    describe('Credit Card', () => {
      it('should mask card showing last 4 digits by default', () => {
        expect(mask('4111111111111111', 'credit-card')).toBe('************1111');
      });

      it('should respect showFirst and showLast options', () => {
        expect(mask('4111111111111111', 'credit-card', { showFirst: 4, showLast: 4 }))
          .toBe('4111********1111');
      });

      it('should handle formatted card numbers', () => {
        expect(mask('4111-1111-1111-1111', 'credit-card')).toBe('****-****-****-1111');
      });
    });

    describe('IBAN', () => {
      it('should mask IBAN showing country code and last 4', () => {
        const result = mask('DE89 3704 0044 0532 0130 00', 'iban');
        expect(result).toContain('DE');
        expect(result).toContain('3000'); // Last 4 characters
      });
    });

    describe('IP Address', () => {
      it('should mask IPv4 first two octets', () => {
        expect(mask('192.168.1.100', 'ip-address')).toBe('***.***.1.100');
      });
    });

    describe('UK NINO', () => {
      it('should mask UK NINO showing only suffix', () => {
        const result = mask('AB 12 34 56 C', 'uk-nino');
        expect(result.endsWith('C')).toBe(true);
        expect(result).toContain('*');
      });
    });

    describe('UK Postcode', () => {
      it('should mask outward code, show inward code', () => {
        expect(mask('SW1A 1AA', 'uk-postcode')).toBe('**** 1AA');
      });
    });

    describe('Name', () => {
      it('should mask names keeping first letter', () => {
        expect(mask('John Doe', 'name')).toBe('J*** D**');
        expect(mask('Alice', 'name')).toBe('A****');
      });
    });

    describe('Custom Patterns', () => {
      it('should mask using custom regex', () => {
        const result = mask('ABC123XYZ', 'custom', {
          pattern: /[A-Z]+/g,
          maskChar: '#'
        });
        expect(result).toBe('###123###');
      });
    });

    describe('Generic Masking', () => {
      it('should mask entire string by default', () => {
        expect(privacy.mask('sensitive', 'custom' as any)).toBe('*********');
      });
    });
  });

  // ========================================
  // DETECTION TESTS
  // ========================================

  describe('Detection', () => {
    it('should detect email addresses', () => {
      const results = detect('Contact john@example.com for help');
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('email');
      expect(results[0].value).toBe('john@example.com');
    });

    it('should detect phone numbers', () => {
      const results = detect('Call 555-123-4567 now');
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('phone');
    });

    it('should detect SSN', () => {
      const results = detect('SSN: 123-45-6789');
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('ssn');
      expect(results[0].sensitivity).toBe('critical');
    });

    it('should detect credit cards', () => {
      const results = detect('Card: 4111111111111111');
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('credit-card');
      expect(results[0].regulations).toContain('PCI-DSS');
    });

    it('should detect multiple PII types', () => {
      const text = 'Email: test@test.com, Phone: 555-111-2222, SSN: 111-22-3333';
      const results = detect(text);
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it('should include position information', () => {
      const text = 'Email: test@example.com';
      const results = detect(text);
      expect(results[0].position).toBe(7);
    });

    it('should include confidence scores', () => {
      const results = detect('Card: 4111111111111111');
      expect(results[0].confidence).toBeGreaterThan(0.5);
    });

    it('should validate credit cards with Luhn algorithm', () => {
      // Valid card
      const valid = detect('4111111111111111');
      expect(valid[0].confidence).toBeGreaterThan(0.9);
    });

    it('should detect IBAN', () => {
      const results = detect('IBAN: DE89370400440532013000');
      expect(results.some(r => r.type === 'iban')).toBe(true);
    });

    it('should detect IP addresses', () => {
      const results = detect('Server IP: 192.168.1.1');
      expect(results.some(r => r.type === 'ip-address')).toBe(true);
    });
  });

  // ========================================
  // DETECT AND MASK TESTS
  // ========================================

  describe('detectAndMask', () => {
    it('should detect and mask PII in text', () => {
      const text = 'Contact john@example.com for help';
      const result = detectAndMask(text);
      expect(result).not.toContain('john@example.com');
      expect(result).toContain('@example.com');
    });

    it('should mask multiple PII values', () => {
      const text = 'Email: a@b.com, Phone: 555-111-2222';
      const result = detectAndMask(text);
      expect(result).not.toContain('a@b.com');
      expect(result).not.toContain('555-111-2222');
      expect(result).toContain('2222'); // Last 4 visible
    });
  });

  // ========================================
  // OBJECT SCANNING TESTS
  // ========================================

  describe('scan', () => {
    it('should scan flat objects', () => {
      const obj = { email: 'test@example.com', name: 'John' };
      const result = scan(obj);
      expect(result.piiFound).toBe(true);
      expect(result.results.some(r => r.type === 'email')).toBe(true);
    });

    it('should scan nested objects', () => {
      const obj = {
        user: {
          contact: {
            email: 'test@test.com'
          }
        }
      };
      const result = scan(obj, { deep: true });
      expect(result.piiFound).toBe(true);
      expect(result.results[0].path).toBe('user.contact.email');
    });

    it('should scan arrays', () => {
      const obj = {
        emails: ['a@b.com', 'c@d.com']
      };
      const result = scan(obj);
      expect(result.piiFound).toBe(true);
      expect(result.results.length).toBeGreaterThanOrEqual(2);
    });

    it('should use field name hints', () => {
      const privacy = new PrivacySDK({ detectFieldNames: true });
      const obj = { phone_number: '5551234567' };
      const result = privacy.scan(obj);
      expect(result.results.some(r => r.type === 'phone')).toBe(true);
    });

    it('should return sanitized object when autoMask is true', () => {
      const obj = { email: 'test@example.com' };
      const result = scan(obj, { autoMask: true });
      expect(result.sanitized).toBeDefined();
      expect((result.sanitized as any).email).not.toBe('test@example.com');
    });
  });

  // ========================================
  // SANITIZE OBJECT TESTS
  // ========================================

  describe('sanitizeObject', () => {
    it('should sanitize specified fields', () => {
      const obj = { email: 'test@test.com', name: 'John' };
      const result = sanitize(obj, { email: 'email' });
      expect(result.email).not.toBe('test@test.com');
      expect(result.name).toBe('John');
    });

    it('should support masking options', () => {
      const obj = { card: '4111111111111111' };
      const result = sanitize(obj, {
        card: { type: 'credit-card', showFirst: 4, showLast: 4 }
      });
      expect(result.card).toBe('4111********1111');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: { email: 'test@test.com' }
      };
      const result = sanitize(obj, { email: 'email' });
      expect(result.user.email).not.toBe('test@test.com');
    });
  });

  // ========================================
  // CLASSIFICATION TESTS
  // ========================================

  describe('classify', () => {
    it('should classify email', () => {
      const result = privacy.classify('test@example.com');
      expect(result.type).toBe('email');
      expect(result.sensitivity).toBe('high');
    });

    it('should classify SSN as critical', () => {
      const result = privacy.classify('123-45-6789');
      expect(result.type).toBe('ssn');
      expect(result.sensitivity).toBe('critical');
    });

    it('should return unknown for non-PII', () => {
      const result = privacy.classify('Hello World');
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('should include regulations', () => {
      const result = privacy.classify('4111111111111111');
      expect(result.regulations).toContain('PCI-DSS');
    });
  });

  // ========================================
  // ANONYMIZATION TESTS
  // ========================================

  describe('Anonymization', () => {
    it('should generate deterministic anonymous IDs', () => {
      const id1 = privacy.generateAnonymousId('user123', 'salt');
      const id2 = privacy.generateAnonymousId('user123', 'salt');
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different inputs', () => {
      const id1 = privacy.generateAnonymousId('user123');
      const id2 = privacy.generateAnonymousId('user456');
      expect(id1).not.toBe(id2);
    });

    it('should prefix anonymous IDs with "anon_"', () => {
      const id = privacy.generateAnonymousId('test');
      expect(id.startsWith('anon_')).toBe(true);
    });

    it('should generate random tokens', () => {
      const token1 = privacy.generateToken(16);
      const token2 = privacy.generateToken(16);
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should hash data consistently', () => {
      const hash1 = privacy.hash('data', 'salt');
      const hash2 = privacy.hash('data', 'salt');
      expect(hash1).toBe(hash2);
    });
  });

  // ========================================
  // CUSTOM PATTERNS TESTS
  // ========================================

  describe('Custom Patterns', () => {
    it('should register custom patterns', () => {
      privacy.registerPattern({
        type: 'employee-id' as any,
        pattern: /EMP-\d{6}/gi,
        sensitivity: 'medium',
        regulations: ['Internal'],
      });

      const results = privacy.detect('Contact EMP-123456');
      expect(results.some(r => r.value === 'EMP-123456')).toBe(true);
    });

    it('should return all registered patterns', () => {
      const patterns = privacy.getPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  // ========================================
  // AUDIT LOGGING TESTS
  // ========================================

  describe('Audit Logging', () => {
    it('should log operations when enabled', () => {
      const audited = new PrivacySDK({ auditLog: true });
      audited.mask('test@test.com', 'email');
      audited.detect('555-123-4567');

      const log = audited.getAuditLog();
      // detect() internally calls mask() for each detected PII to populate masked field
      expect(log.length).toBeGreaterThanOrEqual(2);
      expect(log.some(e => e.operation === 'mask')).toBe(true);
      expect(log.some(e => e.operation === 'detect')).toBe(true);
    });

    it('should not log when disabled', () => {
      const privacy = new PrivacySDK({ auditLog: false });
      privacy.mask('test@test.com', 'email');

      const log = privacy.getAuditLog();
      expect(log.length).toBe(0);
    });

    it('should filter audit log by operation', () => {
      const audited = new PrivacySDK({ auditLog: true });
      audited.mask('test@test.com', 'email');
      audited.detect('555-123-4567');
      audited.mask('another@test.com', 'email');

      const maskLog = audited.getAuditLog({ operation: 'mask' });
      // detect() internally calls mask() for each detected PII, so we expect more than 2
      expect(maskLog.length).toBeGreaterThanOrEqual(2);
    });

    it('should clear audit log', () => {
      const audited = new PrivacySDK({ auditLog: true });
      audited.mask('test@test.com', 'email');
      audited.clearAuditLog();

      expect(audited.getAuditLog().length).toBe(0);
    });
  });

  // ========================================
  // CONFIGURATION TESTS
  // ========================================

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = privacy.getConfig();
      expect(config).toMatchObject(DEFAULT_CONFIG);
    });

    it('should allow configuration updates', () => {
      privacy.configure({ defaultMaskChar: '#' });
      const config = privacy.getConfig();
      expect(config.defaultMaskChar).toBe('#');
    });

    it('should respect custom mask character', () => {
      const custom = new PrivacySDK({ defaultMaskChar: '#' });
      const result = custom.mask('test@example.com', 'email');
      expect(result).toContain('#');
    });

    it('should respect enableMasking setting', () => {
      const disabled = new PrivacySDK({ enableMasking: false });
      const result = disabled.mask('test@example.com', 'email');
      expect(result).toBe('test@example.com');
    });
  });

  // ========================================
  // BATCH PROCESSING TESTS
  // ========================================

  describe('Batch Processing', () => {
    it('should mask multiple values', () => {
      const results = privacy.maskBatch([
        { value: 'a@b.com', type: 'email' },
        { value: '555-123-4567', type: 'phone' },
      ]);
      expect(results).toHaveLength(2);
      expect(results[0]).not.toBe('a@b.com');
      expect(results[1]).not.toBe('555-123-4567');
    });

    it('should support different options per item', () => {
      const results = privacy.maskBatch([
        { value: '4111111111111111', type: 'credit-card', options: { showFirst: 4 } },
        { value: '4111111111111111', type: 'credit-card', options: { showLast: 4 } },
      ]);
      expect(results[0]).toMatch(/^4111/);
      expect(results[1]).toMatch(/1111$/);
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      expect(mask('', 'email')).toBe('');
      expect(detect('')).toHaveLength(0);
    });

    it('should handle null/undefined in scan', () => {
      const result = scan({ value: null });
      expect(result.piiFound).toBe(false);
    });

    it('should handle deeply nested objects', () => {
      const deep = { a: { b: { c: { d: { email: 'test@test.com' } } } } };
      const result = scan(deep, { deep: true });
      expect(result.piiFound).toBe(true);
    });

    it('should handle special characters in data', () => {
      expect(mask('test+alias@example.com', 'email')).toContain('@example.com');
    });
  });
});
