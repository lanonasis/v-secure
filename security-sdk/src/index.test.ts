import { describe, it, expect } from "vitest";
import SecuritySDK from "./index";

describe("SecuritySDK", () => {
  it("encrypts and decrypts data roundtrip", () => {
    const masterKey = SecuritySDK.generateMasterKey();
    const sdk = new SecuritySDK(masterKey);

    const original = { foo: "bar", count: 42 };
    const context = "test_context";

    const encrypted = sdk.encrypt(original, context);
    const decrypted = sdk.decryptJSON<typeof original>(encrypted, context);

    expect(decrypted).toEqual(original);
  });

  it("creates hashes that verify correctly", () => {
    const masterKey = SecuritySDK.generateMasterKey();
    const sdk = new SecuritySDK(masterKey);

    const value = "super-secret-value";
    const hashed = sdk.hash(value);

    expect(sdk.verifyHash(value, hashed)).toBe(true);
    expect(sdk.verifyHash("wrong-value", hashed)).toBe(false);
  });

  it("generates API keys with the expected prefix", () => {
    const masterKey = SecuritySDK.generateMasterKey();
    const sdk = new SecuritySDK(masterKey);

    const prefix = "onasis";
    const apiKey = sdk.generateAPIKey(prefix);

    expect(apiKey.startsWith(`${prefix}_`)).toBe(true);
    expect(apiKey.length).toBeGreaterThan(prefix.length + 1);
  });
});
