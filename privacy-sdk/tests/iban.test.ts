import { describe, it, expect } from 'vitest';
import { detect } from '../src/index';

const hasIban = (s: string): boolean => detect(s).some(d => d.type === 'iban');

describe('IBAN detector — ISO 13616 mod-97 validated', () => {
  it('detects real, checksum-valid IBANs', () => {
    for (const iban of [
      'GB82WEST12345698765432', // UK
      'DE89370400440532013000', // Germany
      'FR1420041010050500013M02606', // France
      'NL91ABNA0417164300', // Netherlands
    ]) {
      expect(hasIban(iban), iban).toBe(true);
    }
  });

  it('detects an IBAN embedded in prose', () => {
    expect(hasIban('Please wire funds to GB82WEST12345698765432 by Friday.')).toBe(true);
  });

  it('rejects IBAN-shaped strings that fail the mod-97 checksum', () => {
    for (const fp of [
      'GB00WEST12345698765432', // right shape, wrong check digits
      'DE00370400440532013000',
      'AB12CD34EF56GH78IJ90', // random uppercase alnum in IBAN shape
    ]) {
      expect(hasIban(fp), fp).toBe(false);
    }
  });

  it('rejects transcript noise that the old detector flagged (the ~11.7k FP class)', () => {
    for (const fp of [
      '550e8400-e29b-41d4-a716-446655440000', // UUID
      'c85d0f0a-f5ef-4477-a208-0799e39584f8', // Claude/Codex session id
      'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6', // lowercase hex hash
      'dGhpcyBpcyBhIGJhc2U2NCBibG9i', // base64 blob
      'claude-opus-4-8-20260101', // model id
    ]) {
      expect(hasIban(fp), fp).toBe(false);
    }
  });

  it('is case-sensitive after dropping the /i flag (canonical IBANs are uppercase)', () => {
    expect(hasIban('de89370400440532013000')).toBe(false);
  });
});
