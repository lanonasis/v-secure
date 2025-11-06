# Client Integration Guide: OAuth2 PKCE + Legacy JWT

**Last Updated**: 2025-11-02
**Purpose**: Comprehensive integration guide for all client types
**Strategy**: OAuth2 PKCE as PRIMARY, Legacy JWT as FALLBACK

---

## 🎯 **Integration Philosophy**

**Your existing database template is preserved.** OAuth2 PKCE extends it, doesn't replace it.

All clients fit seamlessly into the template:
- ✅ **CLI** - PKCE browser auth (primary) + JWT fallback
- ✅ **VSCode/Cursor** - PKCE with SecretStorage (primary) + JWT fallback
- ✅ **Windsurf IDE** - Same as VSCode pattern
- ✅ **Dashboard** - Session-based auth (web cookies)
- ✅ **SDK** - API keys (existing) + optional OAuth2
- ✅ **REST API** - OAuth2 tokens or API keys

---

## 1️⃣ **VSCode/Cursor Extension Integration**

### **Architecture: PKCE Primary, JWT Fallback**

```typescript
// File: src/auth/auth-provider.ts

import * as vscode from 'vscode';
import * as crypto from 'crypto';

export class AuthProvider {
  private secretStorage: vscode.SecretStorage;
  private baseUrl = 'https://mcp.lanonasis.com';

  constructor(context: vscode.ExtensionContext) {
    this.secretStorage = context.secrets;
  }

  /**
   * PRIMARY: OAuth2 PKCE Authentication Flow
   * User authenticates via browser, extension never sees password
   */
  async loginWithPKCE(): Promise<void> {
    try {
      // Step 1: Generate PKCE parameters
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = crypto.randomBytes(32).toString('hex');

      // Store verifier and state temporarily
      await this.secretStorage.store('pkce_verifier', codeVerifier);
      await this.secretStorage.store('pkce_state', state);

      // Step 2: Build authorization URL
      const authUrl = new URL(`${this.baseUrl}/oauth/authorize`);
      authUrl.searchParams.set('client_id', 'cursor-extension');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', 'http://localhost:8080/callback');
      authUrl.searchParams.set('scope', 'memories:read memories:write');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('state', state);

      // Step 3: Open browser for user authentication
      vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));

      // Step 4: Start local server to receive callback
      const authCode = await this.startCallbackServer(8080, state);

      // Step 5: Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(authCode, codeVerifier);

      // Step 6: Store tokens in SecretStorage (encrypted)
      await this.secretStorage.store('access_token', tokens.access_token);
      await this.secretStorage.store('refresh_token', tokens.refresh_token);
      await this.secretStorage.store('token_expires_at',
        (Date.now() + tokens.expires_in * 1000).toString()
      );

      vscode.window.showInformationMessage('Successfully authenticated with Lanonasis MCP!');

    } catch (error) {
      console.error('PKCE auth failed:', error);
      vscode.window.showWarningMessage(
        'Browser authentication failed. Would you like to try direct login?',
        'Yes', 'No'
      ).then(choice => {
        if (choice === 'Yes') {
          this.loginWithJWT(); // Fallback to legacy JWT
        }
      });
    }
  }

  /**
   * FALLBACK: Legacy JWT Authentication
   * Direct username/password (less secure, but works without browser)
   */
  async loginWithJWT(): Promise<void> {
    try {
      // Prompt user for credentials
      const email = await vscode.window.showInputBox({
        prompt: 'Enter your email',
        placeHolder: 'user@example.com',
        ignoreFocusOut: true
      });

      if (!email) return;

      const password = await vscode.window.showInputBox({
        prompt: 'Enter your password',
        password: true,
        ignoreFocusOut: true
      });

      if (!password) return;

      // Call legacy JWT endpoint
      const response = await fetch(`${this.baseUrl}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          client_id: 'vscode-extension'
        })
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Store JWT token in SecretStorage
      await this.secretStorage.store('access_token', data.access_token);
      await this.secretStorage.store('token_expires_at',
        (Date.now() + data.expires_in * 1000).toString()
      );

      vscode.window.showInformationMessage('Successfully logged in to Lanonasis MCP!');

    } catch (error) {
      vscode.window.showErrorMessage(`Login failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Token Refresh (works for both PKCE and JWT tokens)
   */
  async refreshToken(): Promise<void> {
    const refreshToken = await this.secretStorage.get('refresh_token');

    if (!refreshToken) {
      // No refresh token available - need to re-authenticate
      await this.loginWithPKCE(); // Try PKCE first
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: 'cursor-extension'
        })
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const tokens = await response.json();

      // Update tokens in SecretStorage
      await this.secretStorage.store('access_token', tokens.access_token);
      await this.secretStorage.store('refresh_token', tokens.refresh_token);
      await this.secretStorage.store('token_expires_at',
        (Date.now() + tokens.expires_in * 1000).toString()
      );

    } catch (error) {
      console.error('Token refresh failed:', error);
      // Refresh failed - re-authenticate
      await this.loginWithPKCE();
    }
  }

  /**
   * Get valid access token (auto-refresh if needed)
   */
  async getAccessToken(): Promise<string | undefined> {
    const token = await this.secretStorage.get('access_token');
    const expiresAt = await this.secretStorage.get('token_expires_at');

    if (!token) return undefined;

    // Check if token expires in next 5 minutes
    if (expiresAt && parseInt(expiresAt) < Date.now() + 5 * 60 * 1000) {
      await this.refreshToken();
      return this.secretStorage.get('access_token');
    }

    return token;
  }

  /**
   * Use token to call MCP API
   */
  async callMCPAPI(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const token = await this.getAccessToken();

    if (!token) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  }

  // PKCE Helper Functions
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return Buffer.from(hash).toString('base64url');
  }

  private async startCallbackServer(port: number, expectedState: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const http = require('http');
      const server = http.createServer((req: any, res: any) => {
        const url = new URL(req.url, `http://localhost:${port}`);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (state !== expectedState) {
          res.writeHead(400);
          res.end('Invalid state parameter');
          server.close();
          reject(new Error('CSRF validation failed'));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication successful!</h1><p>You can close this window.</p>');

        server.close();
        resolve(code!);
      });

      server.listen(port);

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('Authentication timeout'));
      }, 5 * 60 * 1000);
    });
  }

  private async exchangeCodeForTokens(code: string, verifier: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:8080/callback',
        client_id: 'cursor-extension',
        code_verifier: verifier
      })
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    return response.json();
  }
}
```

### **Usage in Extension**

```typescript
// File: src/extension.ts

import * as vscode from 'vscode';
import { AuthProvider } from './auth/auth-provider';

export async function activate(context: vscode.ExtensionContext) {
  const authProvider = new AuthProvider(context);

  // Register login command
  context.subscriptions.push(
    vscode.commands.registerCommand('lanonasis.login', async () => {
      await authProvider.loginWithPKCE(); // PKCE primary
    })
  );

  // Register logout command
  context.subscriptions.push(
    vscode.commands.registerCommand('lanonasis.logout', async () => {
      await context.secrets.delete('access_token');
      await context.secrets.delete('refresh_token');
      vscode.window.showInformationMessage('Logged out successfully');
    })
  );

  // Example: Create memory
  context.subscriptions.push(
    vscode.commands.registerCommand('lanonasis.createMemory', async () => {
      try {
        const content = await vscode.window.showInputBox({
          prompt: 'Enter memory content'
        });

        if (!content) return;

        const result = await authProvider.callMCPAPI('/tools/create_memory', 'POST', {
          content,
          title: 'From VSCode',
          type: 'note'
        });

        vscode.window.showInformationMessage(`Memory created: ${result.id}`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to create memory: ${error.message}`);
      }
    })
  );
}
```

---

## 2️⃣ **CLI Tool Integration**

### **Architecture: PKCE Primary, JWT Fallback**

```typescript
// File: src/commands/auth/login.ts

import * as http from 'http';
import * as crypto from 'crypto';
import open from 'open';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.onasis');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const BASE_URL = 'https://mcp.lanonasis.com';

interface Config {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  auth_method?: 'pkce' | 'jwt';
}

/**
 * PRIMARY: Login with OAuth2 PKCE (browser-based)
 */
export async function loginWithPKCE(): Promise<void> {
  console.log('🔐 Starting secure browser-based login...\n');

  try {
    // Step 1: Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(32).toString('hex');

    // Step 2: Build authorization URL
    const authUrl = new URL(`${BASE_URL}/oauth/authorize`);
    authUrl.searchParams.set('client_id', 'onasis-cli');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', 'http://localhost:3000/callback');
    authUrl.searchParams.set('scope', 'memories:read memories:write');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);

    // Step 3: Start local callback server
    console.log('Starting local server on port 3000...');
    const authCode = await startCallbackServer(3000, state);

    console.log('Opening browser for authentication...');
    await open(authUrl.toString());

    // Step 4: Wait for callback (authCode is already received from server)
    console.log('\n✅ Authorization received!');

    // Step 5: Exchange code for tokens
    console.log('Exchanging authorization code for tokens...');
    const tokens = await exchangeCodeForTokens(authCode, codeVerifier);

    // Step 6: Save tokens to config file
    await saveConfig({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      auth_method: 'pkce'
    });

    console.log('\n🎉 Successfully logged in via browser!');
    console.log('Your credentials are securely stored in:', CONFIG_FILE);

  } catch (error) {
    console.error('\n❌ Browser login failed:', error.message);
    console.log('\n💡 Tip: Try direct login with: onasis login --legacy');
    throw error;
  }
}

/**
 * FALLBACK: Login with Legacy JWT (direct credentials)
 */
export async function loginWithJWT(email: string, password: string): Promise<void> {
  console.log('🔐 Starting direct login...\n');

  try {
    const response = await fetch(`${BASE_URL}/auth/cli-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();

    // Save token to config file
    await saveConfig({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
      auth_method: 'jwt'
    });

    console.log('✅ Successfully logged in!');
    console.log('Your credentials are stored in:', CONFIG_FILE);

  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

/**
 * Refresh access token when expired
 */
export async function refreshToken(): Promise<void> {
  const config = await loadConfig();

  if (!config.refresh_token) {
    throw new Error('No refresh token available. Please login again.');
  }

  try {
    const response = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: config.refresh_token,
        client_id: 'onasis-cli'
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json();

    await saveConfig({
      ...config,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000
    });

  } catch (error) {
    console.error('Token refresh failed. Please login again.');
    throw error;
  }
}

/**
 * Get valid access token (auto-refresh if needed)
 */
export async function getAccessToken(): Promise<string> {
  const config = await loadConfig();

  if (!config.access_token) {
    throw new Error('Not logged in. Run: onasis login');
  }

  // Check if token expires in next 5 minutes
  if (config.expires_at && config.expires_at < Date.now() + 5 * 60 * 1000) {
    console.log('Token expiring soon, refreshing...');
    await refreshToken();
    return getAccessToken(); // Recursive call to get new token
  }

  return config.access_token;
}

/**
 * Make authenticated API call
 */
export async function callAPI(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API call failed');
  }

  return response.json();
}

// Helper Functions
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return Buffer.from(hash).toString('base64url');
}

async function startCallbackServer(port: number, expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: Invalid state parameter</h1>');
        server.close();
        reject(new Error('CSRF validation failed'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>Login Successful</title></head>
          <body style="font-family: sans-serif; text-align: center; padding-top: 100px;">
            <h1>✅ Login Successful!</h1>
            <p>You can close this window and return to your terminal.</p>
          </body>
        </html>
      `);

      server.close();
      resolve(code!);
    });

    server.listen(port);
    console.log(`Waiting for authentication callback on http://localhost:${port}/callback`);

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timeout (5 minutes)'));
    }, 5 * 60 * 1000);
  });
}

async function exchangeCodeForTokens(code: string, verifier: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:3000/callback',
      client_id: 'onasis-cli',
      code_verifier: verifier
    })
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  return response.json();
}

async function saveConfig(config: Config): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

async function loadConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}
```

### **CLI Command Structure**

```typescript
// File: src/index.ts

import { Command } from 'commander';
import * as readline from 'readline';
import { loginWithPKCE, loginWithJWT, callAPI } from './commands/auth/login';

const program = new Command();

program
  .name('onasis')
  .description('Lanonasis MCP CLI Tool')
  .version('1.0.0');

// Login command - PKCE primary
program
  .command('login')
  .description('Login with browser-based authentication (secure)')
  .option('--legacy', 'Use legacy direct login (less secure)')
  .action(async (options) => {
    if (options.legacy) {
      // Fallback: Legacy JWT
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const email = await new Promise<string>(resolve =>
        rl.question('Email: ', resolve)
      );

      const password = await new Promise<string>(resolve => {
        process.stdout.write('Password: ');
        process.stdin.setRawMode(true);
        let pwd = '';
        process.stdin.on('data', (char) => {
          if (char.toString() === '\r' || char.toString() === '\n') {
            process.stdin.setRawMode(false);
            console.log('');
            resolve(pwd);
          } else {
            pwd += char.toString();
          }
        });
      });

      rl.close();
      await loginWithJWT(email, password);

    } else {
      // Primary: OAuth2 PKCE
      await loginWithPKCE();
    }
  });

// Memory commands
program
  .command('memory:create')
  .description('Create a new memory')
  .argument('<content>', 'Memory content')
  .option('-t, --title <title>', 'Memory title')
  .action(async (content, options) => {
    try {
      const result = await callAPI('/tools/create_memory', 'POST', {
        content,
        title: options.title || 'CLI Memory',
        type: 'note'
      });
      console.log('✅ Memory created:', result.id);
    } catch (error) {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('memory:list')
  .description('List all memories')
  .action(async () => {
    try {
      const result = await callAPI('/tools/list_memories');
      console.log(`Found ${result.memories.length} memories:`);
      result.memories.forEach((m: any) => {
        console.log(`  ${m.id}: ${m.title}`);
      });
    } catch (error) {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    }
  });

program.parse();
```

---

## 3️⃣ **Dashboard (Web Application) Integration**

### **Architecture: Session-based Authentication**

```typescript
// File: src/lib/auth.ts (Next.js/React)

import { cookies } from 'next/headers';

const BASE_URL = 'https://mcp.lanonasis.com';

/**
 * Dashboard uses session-based auth (not PKCE)
 * Sessions stored in secure HttpOnly cookies
 */
export async function loginWithSession(email: string, password: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/web/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important: Send cookies
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  // Session cookie automatically set by server
  // Cookie format: session_id=xxx; HttpOnly; Secure; SameSite=Lax; Domain=.lanonasis.com
}

export async function logout(): Promise<void> {
  await fetch(`${BASE_URL}/web/logout`, {
    method: 'POST',
    credentials: 'include'
  });
}

export async function getSession(): Promise<any> {
  const response = await fetch(`${BASE_URL}/web/session`, {
    credentials: 'include'
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function callAPI(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
    method,
    credentials: 'include', // Send session cookie
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error('API call failed');
  }

  return response.json();
}
```

### **Login Component**

```typescript
// File: src/components/LoginForm.tsx

'use client';

import { useState } from 'react';
import { loginWithSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await loginWithSession(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {error && (
        <div className="text-red-600">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

---

## 4️⃣ **SDK Integration**

### **Architecture: API Keys (existing) + Optional OAuth2**

```typescript
// File: src/index.ts

export interface LanonasisConfig {
  apiKey?: string;
  accessToken?: string;
  baseUrl?: string;
}

export class LanonasisSDK {
  private config: LanonasisConfig;
  private baseUrl: string;

  constructor(config: LanonasisConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://mcp.lanonasis.com';
  }

  /**
   * PRIMARY: API Key Authentication (existing system)
   */
  async callWithAPIKey(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('API key not provided');
    }

    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      method,
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * ALTERNATIVE: OAuth2 Token Authentication (new system)
   */
  async callWithOAuth(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    if (!this.config.accessToken) {
      throw new Error('Access token not provided');
    }

    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Smart call - uses OAuth if available, falls back to API key
   */
  async call(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    if (this.config.accessToken) {
      return this.callWithOAuth(endpoint, method, body);
    } else if (this.config.apiKey) {
      return this.callWithAPIKey(endpoint, method, body);
    } else {
      throw new Error('No authentication method provided (apiKey or accessToken)');
    }
  }

  // Memory methods
  async createMemory(content: string, title?: string, type?: string) {
    return this.call('/tools/create_memory', 'POST', { content, title, type });
  }

  async listMemories() {
    return this.call('/tools/list_memories');
  }

  async getMemory(id: string) {
    return this.call(`/tools/get_memory`, 'POST', { id });
  }

  async updateMemory(id: string, updates: any) {
    return this.call('/tools/update_memory', 'POST', { id, ...updates });
  }

  async deleteMemory(id: string) {
    return this.call('/tools/delete_memory', 'POST', { id });
  }

  async searchMemories(query: string) {
    return this.call('/tools/search_memories', 'POST', { query });
  }
}

// Usage examples:

// With API Key (existing)
const sdk = new LanonasisSDK({
  apiKey: 'lano_your_api_key_here'
});

// With OAuth2 Token (new)
const sdk2 = new LanonasisSDK({
  accessToken: 'eyJhbGciOiJIUzI1NiIs...'
});

// SDK auto-detects which method to use
await sdk.createMemory('Hello from SDK', 'Test Memory');
```

---

## 5️⃣ **REST API Integration**

### **Architecture: OAuth2 Tokens or API Keys**

```bash
# METHOD 1: API Key (existing, simple)
curl https://mcp.lanonasis.com/api/v1/tools/list_memories \
  -H "x-api-key: lano_your_api_key_here"

# METHOD 2: OAuth2 Bearer Token (new, secure)
curl https://mcp.lanonasis.com/api/v1/tools/list_memories \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Get access token via OAuth2 PKCE (if using from server-side)
# Step 1: Get authorization code (requires browser)
# Step 2: Exchange code for token
curl -X POST https://mcp.lanonasis.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTH_CODE_FROM_STEP_1",
    "redirect_uri": "http://localhost:8080/callback",
    "client_id": "your-client-id",
    "code_verifier": "ORIGINAL_RANDOM_STRING"
  }'

# Get access token via Legacy JWT (if OAuth not available)
curl -X POST https://mcp.lanonasis.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password",
    "client_id": "rest-api-client"
  }'

# Response:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIs...",
#   "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
#   "expires_in": 3600
# }

# Use the token:
curl https://mcp.lanonasis.com/api/v1/tools/create_memory \
  -X POST \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Important note",
    "title": "API Memory",
    "type": "note"
  }'

# Refresh token when expired:
curl -X POST https://mcp.lanonasis.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "client_id": "your-client-id"
  }'
```

---

## 📊 **Authentication Method Decision Tree**

```
┌─────────────────────────────────────────────────────────────┐
│              WHICH AUTH METHOD SHOULD I USE?                 │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │   What type of client?    │
              └─────────────┬─────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ User-facing  │   │ Server-side  │   │ Web Browser  │
│ (CLI, VSCode)│   │ (SDK, API)   │   │ (Dashboard)  │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                    │
       ▼                  ▼                    ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ OAuth2 PKCE  │   │  API Keys    │   │  Session     │
│  (PRIMARY)   │   │  (PRIMARY)   │   │  Cookies     │
│              │   │              │   │  (PRIMARY)   │
│ Legacy JWT   │   │ OAuth2 Token │   │              │
│  (FALLBACK)  │   │  (OPTIONAL)  │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## ✅ **Summary: All Clients Fit Seamlessly**

| Client Type | Primary Auth | Fallback | Token Storage |
|-------------|-------------|----------|---------------|
| **VSCode/Cursor** | OAuth2 PKCE | Legacy JWT | SecretStorage (encrypted) |
| **CLI Tool** | OAuth2 PKCE (browser) | Legacy JWT (direct) | ~/.onasis/config.json (600) |
| **Windsurf IDE** | OAuth2 PKCE | Legacy JWT | IDE SecretStorage |
| **Dashboard** | Session Cookies | N/A | HttpOnly cookies |
| **SDK** | API Keys | OAuth2 Tokens | Application storage |
| **REST API** | API Keys or OAuth2 | Legacy JWT | Application-managed |

**Your existing database template is preserved.** All authentication methods work with the same backend tables. OAuth2 PKCE adds 4 new tables but doesn't change existing ones.

---

## 🔒 **Security Best Practices**

1. **Never log tokens or credentials** - use `[REDACTED]` in logs
2. **Always use HTTPS** in production
3. **Validate redirect URIs** against whitelist
4. **Implement CSRF protection** with state parameter
5. **Rotate refresh tokens** on each use
6. **Set appropriate token lifetimes**:
   - Access tokens: 1 hour
   - Refresh tokens: 30 days
   - Authorization codes: 5-10 minutes
7. **Use secure storage**:
   - VSCode: SecretStorage
   - CLI: File with 600 permissions
   - Web: HttpOnly cookies
8. **Implement rate limiting** on auth endpoints

---

**Your entire database template is preserved. All clients continue to work seamlessly!** 🎉
