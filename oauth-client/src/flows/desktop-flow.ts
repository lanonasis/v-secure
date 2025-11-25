import { BaseOAuthFlow } from './base-flow';
import { TokenResponse, OAuthConfig, PKCEChallenge } from '../types';

export class DesktopOAuthFlow extends BaseOAuthFlow {
  private readonly redirectUri: string;
  private authWindow: Window | null = null;

  constructor(config: OAuthConfig) {
    super({
      ...config,
      clientId: config.clientId || 'lanonasis-mcp-desktop'
    });
    this.redirectUri = config.redirectUri || 'lanonasis://oauth/callback';
  }

  async authenticate(): Promise<TokenResponse> {
    // Step 1: Generate PKCE challenge
    const pkce = await this.generatePKCEChallenge();
    
    // Step 2: Generate state
    const state = this.generateState();
    
    // Step 3: Build authorization URL
    const authUrl = this.buildAuthorizationUrl(pkce.codeChallenge, state);
    
    // Step 4: Open auth window and wait for callback
    const authCode = await this.openAuthWindow(authUrl, state);
    
    // Step 5: Exchange code for token
    return await this.exchangeCodeForToken(authCode, pkce.codeVerifier);
  }

  private async generatePKCEChallenge(): Promise<PKCEChallenge> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    return { codeVerifier, codeChallenge };
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      const crypto = require('crypto');
      crypto.randomFillSync(array);
    }
    return this.base64URLEncode(array);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      // Browser environment
      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      const hash = await window.crypto.subtle.digest('SHA-256', data);
      return this.base64URLEncode(hash);
    } else {
      // Node.js environment
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(verifier).digest();
      return this.base64URLEncode(hash);
    }
  }

  private buildAuthorizationUrl(codeChallenge: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.scope,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state
    });

    return `${this.authBaseUrl}/oauth/authorize?${params}`;
  }

  private async openAuthWindow(authUrl: string, expectedState: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined') {
        // Browser/Electron environment
        this.openBrowserWindow(authUrl, expectedState, resolve, reject);
      } else {
        // Node.js environment (for Electron main process)
        this.openElectronWindow(authUrl, expectedState, resolve, reject);
      }
    });
  }

  private openBrowserWindow(
    authUrl: string, 
    expectedState: string,
    resolve: (code: string) => void,
    reject: (error: Error) => void
  ): void {
    // Calculate window position
    const width = 500;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    // Open popup window
    this.authWindow = window.open(
      authUrl,
      'Lan Onasis Login',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    if (!this.authWindow) {
      reject(new Error('Failed to open authentication window'));
      return;
    }

    // Listen for callback
    const checkInterval = setInterval(() => {
      try {
        if (!this.authWindow || this.authWindow.closed) {
          clearInterval(checkInterval);
          reject(new Error('Authentication window was closed'));
          return;
        }

        // Check if redirected to callback URL
        const currentUrl = this.authWindow.location.href;
        if (currentUrl.startsWith(this.redirectUri)) {
          clearInterval(checkInterval);
          this.authWindow.close();
          
          // Parse callback URL
          const url = new URL(currentUrl);
          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');
          const error = url.searchParams.get('error');

          if (error) {
            reject(new Error(url.searchParams.get('error_description') || error));
          } else if (state !== expectedState) {
            reject(new Error('State mismatch - possible CSRF attack'));
          } else if (code) {
            resolve(code);
          } else {
            reject(new Error('No authorization code received'));
          }
        }
      } catch (e) {
        // Cross-origin error - ignore and continue checking
      }
    }, 500);
  }

  private openElectronWindow(
    authUrl: string,
    expectedState: string,
    resolve: (code: string) => void,
    reject: (error: Error) => void
  ): void {
    // This would be implemented in Electron main process
    // Using IPC to communicate with renderer
    const { BrowserWindow } = require('electron');
    
    const authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    authWindow.loadURL(authUrl);

    authWindow.webContents.on('will-redirect', (event: any, url: string) => {
      if (url.startsWith(this.redirectUri)) {
        event.preventDefault();
        authWindow.close();
        
        const callbackUrl = new URL(url);
        const code = callbackUrl.searchParams.get('code');
        const state = callbackUrl.searchParams.get('state');
        const error = callbackUrl.searchParams.get('error');

        if (error) {
          reject(new Error(callbackUrl.searchParams.get('error_description') || error));
        } else if (state !== expectedState) {
          reject(new Error('State mismatch'));
        } else if (code) {
          resolve(code);
        }
      }
    });

    authWindow.on('closed', () => {
      reject(new Error('Authentication window was closed'));
    });
  }

  private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenResponse> {
    return this.makeTokenRequest({
      grant_type: 'authorization_code',
      code: code,
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier
    });
  }
}