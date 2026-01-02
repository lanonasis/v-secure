// Unit tests for SDK utilities

import {
  generateRequestId,
  generateSessionId,
  snakeToCamel,
  camelToSnake,
  maskSensitive,
  parseApiKey,
  detectPlatform,
} from '../utils';

describe('generateRequestId', () => {
  it('should generate a unique request ID with req_ prefix', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^req_[a-z0-9]+$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
    expect(ids.size).toBe(100);
  });
});

describe('generateSessionId', () => {
  it('should generate a session ID with sess_ prefix', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^sess_[a-z0-9]+$/);
  });
});

describe('snakeToCamel', () => {
  it('should convert snake_case keys to camelCase', () => {
    const input = {
      user_id: '123',
      api_key: 'abc',
      nested_object: {
        inner_value: 42
      }
    };

    const result = snakeToCamel(input);

    expect(result).toEqual({
      userId: '123',
      apiKey: 'abc',
      nestedObject: {
        innerValue: 42
      }
    });
  });

  it('should handle arrays', () => {
    const input = [
      { item_name: 'test1' },
      { item_name: 'test2' }
    ];

    const result = snakeToCamel(input);

    expect(result).toEqual([
      { itemName: 'test1' },
      { itemName: 'test2' }
    ]);
  });

  it('should handle null and undefined', () => {
    expect(snakeToCamel(null)).toBeNull();
    expect(snakeToCamel(undefined)).toBeUndefined();
  });
});

describe('camelToSnake', () => {
  it('should convert camelCase keys to snake_case', () => {
    const input = {
      userId: '123',
      apiKey: 'abc',
      nestedObject: {
        innerValue: 42
      }
    };

    const result = camelToSnake(input);

    expect(result).toEqual({
      user_id: '123',
      api_key: 'abc',
      nested_object: {
        inner_value: 42
      }
    });
  });
});

describe('maskSensitive', () => {
  it('should mask values longer than visible chars', () => {
    const result = maskSensitive('sk_live_abcdefghijklmnop', 4);
    expect(result).toBe('sk_l...mnop');
  });

  it('should fully mask short values', () => {
    const result = maskSensitive('abc', 4);
    expect(result).toBe('***');
  });

  it('should handle empty strings', () => {
    const result = maskSensitive('');
    expect(result).toBe('');
  });
});

describe('parseApiKey', () => {
  it('should parse lms_ format keys', () => {
    const result = parseApiKey('lms_prod_abc123xyz');
    expect(result).toEqual({
      prefix: 'lms_prod_',
      valid: true
    });
  });

  it('should parse lms_test keys', () => {
    const result = parseApiKey('lms_test_abc123xyz');
    expect(result).toEqual({
      prefix: 'lms_test_',
      valid: true
    });
  });

  it('should parse legacy vx_ format keys for backward compatibility', () => {
    const result = parseApiKey('vx_prod_abc123xyz');
    expect(result).toEqual({
      prefix: 'vx_prod_',
      valid: true
    });
  });

  it('should return invalid for unknown formats', () => {
    const result = parseApiKey('sk_live_abc123');
    expect(result).toEqual({
      prefix: '',
      valid: false
    });
  });
});

describe('detectPlatform', () => {
  it('should return a valid platform type', () => {
    const platform = detectPlatform();
    expect(['node', 'browser', 'cli', 'worker']).toContain(platform);
  });
});
