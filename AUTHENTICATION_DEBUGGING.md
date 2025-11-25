# 🔍 IDE Extension Authentication Debugging Guide

**Issue:** "Failed to load memories: Token introspection failed" & "No token provided"

---

## 🎯 Root Cause Analysis

### Problem 1: Token Expiration Logic is Broken ❌

**Location:** `oauth-client/src/storage/token-storage.ts:94-112`

**The Bug:**
```typescript
isTokenExpired(tokens: TokenResponse): boolean {
  // ...
  const storedAt = this.getStoredAt(tokens);  // ← ALWAYS returns null or estimate
  if (!storedAt) return true;  // ← Treats all tokens as expired!
  // ...
}

private getStoredAt(tokens: TokenResponse): number | null {
  // FIXME: In production, store this with the tokens
  return Date.now() - 3600000; // ← Always returns 1 hour ago!
}
```

**Impact:**
- ✅ Authentication succeeds and stores tokens
- ❌ On next request, `isTokenExpired()` returns `true` (even for fresh tokens)
- ❌ Attempts to refresh with expired/invalid refresh token
- ❌ Refresh fails → "Token introspection failed"

---

### Problem 2: Access Token Not Persisted Across Sessions ❌

**Location:** `oauth-client/src/client/mcp-client.ts:18-70`

**The Bug:**
```typescript
export class MCPClient {
  private accessToken: string | null = null;  // ← Instance variable!

  async connect(): Promise<void> {
    let tokens = await this.tokenStorage.retrieve();
    // ...
    this.accessToken = tokens.access_token;  // ← Set but not saved
  }

  async request(method: string, params?: unknown): Promise<T> {
    if (!this.accessToken) {  // ← Lost on IDE restart!
      throw new Error('Not authenticated');
    }
    // ...
  }
}
```

**Impact:**
- ✅ Master API key auth works initially
- ❌ IDE extension restarts/reloads
- ❌ `this.accessToken` is `null` (instance variable lost)
- ❌ Next API call → "No token provided"

---

### Problem 3: Missing Token Reload on Startup ❌

**Location:** `oauth-client/src/client/mcp-client.ts:222-264`

**What's Missing:**
```typescript
async request(method: string, params?: unknown): Promise<T> {
  if (!this.accessToken) {  // ← Should load from storage first!
    throw new Error('Not authenticated');
  }
  // ...
}
```

**Should Be:**
```typescript
async request(method: string, params?: unknown): Promise<T> {
  // Try to load token if not in memory
  if (!this.accessToken) {
    const tokens = await this.tokenStorage.retrieve();
    if (tokens && !this.tokenStorage.isTokenExpired(tokens)) {
      this.accessToken = tokens.access_token;
    } else {
      throw new Error('Not authenticated');
    }
  }
  // ...
}
```

---

## 🛠️ Fixes Required

### Fix 1: Store and Validate Token Timestamps

**File:** `oauth-client/src/storage/token-storage.ts`

**Current Code (Lines 19-40):**
```typescript
async store(tokens: TokenResponse): Promise<void> {
  const tokenString = JSON.stringify(tokens);
  // ...
}
```

**Fixed Code:**
```typescript
async store(tokens: TokenResponse): Promise<void> {
  // Add issued_at timestamp
  const tokensWithTimestamp = {
    ...tokens,
    issued_at: Date.now()  // ← Add this!
  };

  const tokenString = JSON.stringify(tokensWithTimestamp);
  // ... rest of storage logic
}
```

**Lines 94-106:**
```typescript
isTokenExpired(tokens: TokenResponse): boolean {
  if (!tokens.expires_in) return false;

  const storedAt = this.getStoredAt(tokens);  // ← Uses broken method
  if (!storedAt) return true;

  const expiresAt = storedAt + (tokens.expires_in * 1000);
  const now = Date.now();

  // Consider expired if less than 5 minutes remaining
  return (expiresAt - now) < 300000;
}
```

**Fixed Code:**
```typescript
isTokenExpired(tokens: TokenResponse & { issued_at?: number }): boolean {
  if (!tokens.expires_in) return false;

  // Use stored timestamp
  if (!tokens.issued_at) {
    console.warn('Token missing issued_at timestamp, treating as expired');
    return true;
  }

  const expiresAt = tokens.issued_at + (tokens.expires_in * 1000);
  const now = Date.now();

  // Consider expired if less than 5 minutes remaining
  return (expiresAt - now) < 300000;
}
```

**Remove broken method (Lines 109-113):**
```typescript
// DELETE THIS METHOD - no longer needed
private getStoredAt(tokens: TokenResponse): number | null {
  return Date.now() - 3600000;
}
```

---

### Fix 2: Reload Access Token from Storage

**File:** `oauth-client/src/client/mcp-client.ts`

**Add method at line 78 (after `authenticate()`):**
```typescript
private async ensureAccessToken(): Promise<void> {
  // If already in memory, use it
  if (this.accessToken) return;

  // Try to load from storage
  const tokens = await this.tokenStorage.retrieve();
  if (!tokens) {
    throw new Error('Not authenticated');
  }

  // Check if expired
  if (this.tokenStorage.isTokenExpired(tokens)) {
    // Try to refresh
    if (tokens.refresh_token) {
      try {
        const newTokens = await this.authFlow.refreshToken(tokens.refresh_token);
        await this.tokenStorage.store(newTokens);
        this.accessToken = newTokens.access_token;
        return;
      } catch (error) {
        console.error('Token refresh failed:', error);
        throw new Error('Token expired and refresh failed');
      }
    } else {
      throw new Error('Token expired and no refresh token available');
    }
  }

  // Token is valid, use it
  this.accessToken = tokens.access_token;
}
```

**Update `request()` method (Lines 222-264):**
```typescript
async request<T = unknown>(method: string, params?: unknown): Promise<T> {
  // ← ADD THIS LINE
  await this.ensureAccessToken();

  if (!this.accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${this.config.mcpEndpoint}/api`, {
    // ... rest of code unchanged
  });

  // ... rest of method unchanged
}
```

---

### Fix 3: Add Types for Extended Token Response

**File:** `oauth-client/src/types.ts`

**Add to existing types:**
```typescript
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  issued_at?: number;  // ← Add this field
}
```

---

## 🧪 Testing the Fixes

### Test 1: Fresh Authentication
```typescript
const client = new MCPClient({
  clientId: 'test-client',
  authBaseUrl: 'https://auth.lanonasis.com'
});

await client.connect();  // Authenticate
const memories = await client.searchMemories('test');  // Should work
```

**Expected:**
- ✅ Authentication succeeds
- ✅ Token stored with `issued_at` timestamp
- ✅ Search memories works

---

### Test 2: IDE Restart (Simulated)
```typescript
// First session
const client1 = new MCPClient({ /* config */ });
await client1.connect();
console.log('✅ Authenticated');

// Simulate IDE restart - create new instance
const client2 = new MCPClient({ /* same config */ });
// DON'T call connect() - should reload from storage
const memories = await client2.searchMemories('test');

console.log('✅ Loaded from storage');
```

**Expected:**
- ✅ First client authenticates and stores tokens
- ✅ Second client loads tokens from storage automatically
- ✅ Search works without re-authentication

---

### Test 3: Token Expiration Handling
```typescript
const client = new MCPClient({ /* config */ });
await client.connect();

// Manually expire token (for testing)
const tokens = await client['tokenStorage'].retrieve();
tokens.issued_at = Date.now() - (3600 * 1000 + 1);  // 1 hour + 1 second ago
tokens.expires_in = 3600;  // 1 hour expiry
await client['tokenStorage'].store(tokens);

// Should refresh automatically
const memories = await client.searchMemories('test');
console.log('✅ Auto-refreshed expired token');
```

**Expected:**
- ✅ Detects expired token
- ✅ Refreshes using refresh_token
- ✅ Stores new tokens with new issued_at
- ✅ Search works with refreshed token

---

## 🔧 Deployment Steps

### Step 1: Update oauth-client Package

```bash
cd /Users/seyederick/DevOps/_project_folders/v-secure/oauth-client

# Apply fixes to:
# - src/storage/token-storage.ts
# - src/client/mcp-client.ts
# - src/types.ts

# Rebuild
npm run build

# Bump version
npm version patch  # 1.0.1 → 1.0.2

# Publish
npm publish
```

---

### Step 2: Update IDE Extension

```bash
# In your IDE extension repo
npm update @lanonasis/oauth-client@latest

# Or update package.json
{
  "dependencies": {
    "@lanonasis/oauth-client": "^1.0.2"
  }
}

npm install
```

---

### Step 3: Test in IDE

1. **Uninstall old extension:**
   - VSCode: Extensions → Lanonasis → Uninstall
   - Cursor: Same process

2. **Clear stored tokens:**
   ```bash
   # Remove token files
   rm -f ~/.lanonasis/mcp-tokens.enc

   # Clear keychain (macOS)
   security delete-generic-password -s "lanonasis-mcp" -a "tokens"

   # Clear localStorage (if web-based)
   localStorage.clear()
   ```

3. **Install updated extension:**
   - Rebuild with new oauth-client
   - Install .vsix package

4. **Test authentication flow:**
   ```
   1. Authenticate with Master API Key
      → Should show: "✅ Successfully authenticated"

   2. Load memories
      → Should work: "Loaded 10 memories"

   3. Reload VS Code window (Cmd+R)

   4. Load memories again (no re-auth needed)
      → Should work: "Loaded 10 memories"
   ```

---

## 📊 Error Messages Explained

### Error 1: "Token introspection failed"

**Cause:** Backend server validates tokens and rejects them

**Root Causes:**
1. ❌ Token expired (due to broken `isTokenExpired` logic)
2. ❌ Invalid token signature
3. ❌ Wrong audience/scope
4. ❌ Backend can't verify JWT

**Fix Applied:**
- ✅ Proper token expiration checking with `issued_at` timestamps
- ✅ Auto-refresh before expiry (5 min buffer)

---

### Error 2: "No token provided"

**Cause:** `this.accessToken` is `null` when making API request

**Root Causes:**
1. ❌ IDE extension restarted → instance variable lost
2. ❌ No reload from TokenStorage on startup
3. ❌ Direct API call before `connect()` called

**Fix Applied:**
- ✅ `ensureAccessToken()` method loads from storage
- ✅ Called automatically in `request()` method
- ✅ Handles refresh if expired

---

### Error 3: "✅ Successfully authenticated" then "Failed to load memories"

**Timeline:**
```
1. User authenticates → Success (tokens stored)
2. `this.accessToken` set in memory
3. `loadMemories()` calls `client.request()`
4. But `request()` checks wrong condition
5. Or token already expired due to broken logic
6. Error thrown
```

**Fix Applied:**
- ✅ Token expiration logic fixed
- ✅ Proper timestamp tracking
- ✅ Auto-reload from storage

---

## 🎯 Quick Workaround (Before Fixes Applied)

### Temporary Solution 1: Disable Token Expiry Check

**File:** `oauth-client/src/storage/token-storage.ts`

```typescript
isTokenExpired(tokens: TokenResponse): boolean {
  // TEMPORARY: Always return false
  return false;
}
```

**Pros:** Immediate fix, authentication works
**Cons:** Tokens never refresh (will fail when actually expired)

---

### Temporary Solution 2: Always Reconnect on Request

**File:** `oauth-client/src/client/mcp-client.ts`

```typescript
async request<T = unknown>(method: string, params?: unknown): Promise<T> {
  // TEMPORARY: Force reconnect if no token
  if (!this.accessToken) {
    await this.connect();
  }

  // ... rest of method
}
```

**Pros:** Works after IDE restart
**Cons:** Slow (re-authenticates every time), not ideal UX

---

## 📋 Checklist for IDE Extension Developers

### Before Release:
- [ ] Apply all 3 fixes to oauth-client package
- [ ] Add `issued_at` field to TokenResponse type
- [ ] Update `isTokenExpired()` to use `issued_at`
- [ ] Add `ensureAccessToken()` method to MCPClient
- [ ] Call `ensureAccessToken()` in `request()` method
- [ ] Remove broken `getStoredAt()` method
- [ ] Write unit tests for token expiration logic
- [ ] Write integration tests for IDE restart scenario
- [ ] Test with both Master API Key and Web OAuth flows
- [ ] Update oauth-client package version
- [ ] Rebuild IDE extension with new oauth-client
- [ ] Test in clean environment (no cached tokens)
- [ ] Test IDE restart/reload scenario
- [ ] Test token refresh after expiry
- [ ] Document breaking changes (if any)
- [ ] Publish updated oauth-client to npm
- [ ] Release updated IDE extension

---

## 🔍 Debugging Tools

### Check Stored Tokens (Terminal)

```bash
# macOS Keychain
security find-generic-password -s "lanonasis-mcp" -a "tokens" -w

# File-based storage
cat ~/.lanonasis/mcp-tokens.enc | base64 -d

# Decrypt file-based storage (Node.js)
node -e "
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

const data = fs.readFileSync(os.homedir() + '/.lanonasis/mcp-tokens.enc', 'utf8');
const [ivHex, authTagHex, encrypted] = data.split(':');

// Derive key
const machineId = os.hostname() + os.userInfo().username;
const key = crypto.pbkdf2Sync(machineId, 'lanonasis-mcp-oauth-2024', 100000, 32, 'sha256');

// Decrypt
const iv = Buffer.from(ivHex, 'hex');
const authTag = Buffer.from(authTagHex, 'hex');
const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(authTag);

let decrypted = decipher.update(encrypted, 'hex', 'utf8');
decrypted += decipher.final('utf8');

console.log(JSON.parse(decrypted));
"
```

---

### Check Token Expiration

```bash
node -e "
const tokens = require('./.lanonasis/tokens.json');  // If you export it
const issuedAt = tokens.issued_at || Date.now();
const expiresAt = issuedAt + (tokens.expires_in * 1000);
const now = Date.now();
const remaining = (expiresAt - now) / 1000;

console.log('Issued:', new Date(issuedAt));
console.log('Expires:', new Date(expiresAt));
console.log('Remaining:', remaining, 'seconds');
console.log('Expired:', remaining < 0);
"
```

---

### Enable Debug Logging

**File:** `oauth-client/src/client/mcp-client.ts`

```typescript
// Add at top of connect() method
async connect(): Promise<void> {
  console.log('[DEBUG] MCPClient.connect() called');

  try {
    let tokens = await this.tokenStorage.retrieve();
    console.log('[DEBUG] Retrieved tokens:', {
      has_access: !!tokens?.access_token,
      has_refresh: !!tokens?.refresh_token,
      expires_in: tokens?.expires_in,
      issued_at: tokens?.issued_at,
      is_expired: tokens ? this.tokenStorage.isTokenExpired(tokens) : null
    });

    // ... rest of method
  }
}
```

---

## 🎓 Learning Points

### Key Lessons:

1. **Always Store Timestamps with Tokens**
   - Don't rely on estimates or calculations
   - Store `issued_at` when tokens are created
   - Calculate expiration from stored timestamp

2. **Instance Variables Don't Persist**
   - IDE extensions reload/restart frequently
   - Always store critical data (tokens, config)
   - Reload from storage on each request if needed

3. **Implement Graceful Token Refresh**
   - Check expiration before making requests
   - Auto-refresh 5-10 minutes before expiry
   - Have fallback to re-authentication

4. **Test Restart Scenarios**
   - Simulate IDE restarts in tests
   - Test with no in-memory state
   - Verify storage/retrieval works

5. **Add Comprehensive Logging**
   - Log authentication steps
   - Log token lifecycle (store, retrieve, refresh, expire)
   - Makes debugging much easier

---

## 📞 Need Help?

### Get Support:
- **Discord:** https://discord.gg/lanonasis (ask in #ide-extensions)
- **GitHub Issues:** https://github.com/lanonasis/oauth-client/issues
- **Email:** developers@lanonasis.com

### Report Bugs:
Include:
1. IDE type and version (VSCode 1.85, Cursor 0.12, etc.)
2. oauth-client version
3. Operating system
4. Steps to reproduce
5. Error messages (full stack trace)
6. Debug logs (if enabled)

---

**Last Updated:** January 2025
**Affects:** @lanonasis/oauth-client v1.0.0 - v1.0.1
**Fixed In:** @lanonasis/oauth-client v1.0.2 (pending)
