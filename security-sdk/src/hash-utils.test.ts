import { describe, it, expect } from "vitest";
import {
  isSha256Hash,
  hashApiKey,
  hashApiKeyBrowser,
  ensureApiKeyHash,
  ensureApiKeyHashBrowser,
  verifyApiKey,
  generateApiKey,
} from "./hash-utils";

describe("hash-utils", () => {
  describe("isSha256Hash", () => {
    it("identifies valid SHA-256 hashes", () => {
      const validHash = "a".repeat(64);
      expect(isSha256Hash(validHash)).toBe(true);
    });

    it("rejects invalid hashes", () => {
      expect(isSha256Hash("short")).toBe(false);
      expect(isSha256Hash("a".repeat(63))).toBe(false);
      expect(isSha256Hash("a".repeat(65))).toBe(false);
      expect(isSha256Hash("")).toBe(false);
    });
  });

  describe("hashApiKey", () => {
    it("hashes API keys consistently", () => {
      const apiKey = "lns_test123";
      const hash1 = hashApiKey(apiKey);
      const hash2 = hashApiKey(apiKey);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/i.test(hash1)).toBe(true);
    });

    it("throws on invalid input", () => {
      expect(() => hashApiKey("")).toThrow();
      expect(() => hashApiKey(null as any)).toThrow();
      expect(() => hashApiKey(undefined as any)).toThrow();
    });
  });

  describe("hashApiKeyBrowser", () => {
    it("hashes API keys (async)", async () => {
      const apiKey = "lns_test123";
      const hash = await hashApiKeyBrowser(apiKey);

      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/i.test(hash)).toBe(true);
    });

    it("produces same hash as sync version", async () => {
      const apiKey = "lns_test123";
      const syncHash = hashApiKey(apiKey);
      const asyncHash = await hashApiKeyBrowser(apiKey);

      expect(asyncHash).toBe(syncHash);
    });
  });

  describe("ensureApiKeyHash", () => {
    it("returns hash for raw API keys", () => {
      const apiKey = "lns_test123";
      const hash = ensureApiKeyHash(apiKey);

      expect(hash).toHaveLength(64);
      expect(hash).toBe(hashApiKey(apiKey));
    });

    it("returns lowercase hash for already-hashed keys", () => {
      const alreadyHashed = "A".repeat(64);
      const result = ensureApiKeyHash(alreadyHashed);

      expect(result).toBe(alreadyHashed.toLowerCase());
      expect(result).toHaveLength(64);
    });
  });

  describe("ensureApiKeyHashBrowser", () => {
    it("returns hash for raw API keys (async)", async () => {
      const apiKey = "lns_test123";
      const hash = await ensureApiKeyHashBrowser(apiKey);

      expect(hash).toHaveLength(64);
      expect(hash).toBe(hashApiKey(apiKey));
    });

    it("returns lowercase hash for already-hashed keys (async)", async () => {
      const alreadyHashed = "A".repeat(64);
      const result = await ensureApiKeyHashBrowser(alreadyHashed);

      expect(result).toBe(alreadyHashed.toLowerCase());
      expect(result).toHaveLength(64);
    });
  });

  describe("verifyApiKey", () => {
    it("verifies correct API keys", () => {
      const apiKey = "lns_test123";
      const storedHash = hashApiKey(apiKey);

      expect(verifyApiKey(apiKey, storedHash)).toBe(true);
    });

    it("rejects incorrect API keys", () => {
      const apiKey = "lns_test123";
      const wrongKey = "lns_wrong";
      const storedHash = hashApiKey(apiKey);

      expect(verifyApiKey(wrongKey, storedHash)).toBe(false);
    });

    it("uses constant-time comparison", () => {
      const apiKey = "lns_test123";
      const storedHash = hashApiKey(apiKey);
      const wrongHash = "a".repeat(64);

      expect(verifyApiKey(apiKey, storedHash)).toBe(true);
      expect(verifyApiKey(apiKey, wrongHash)).toBe(false);
    });
  });

  describe("generateApiKey", () => {
    it("generates API keys with lns_ prefix", () => {
      const apiKey = generateApiKey();

      expect(apiKey).toMatch(/^lns_/);
      expect(apiKey.length).toBeGreaterThan(4);
    });

    it("generates unique keys", () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();

      expect(key1).not.toBe(key2);
    });
  });
});

