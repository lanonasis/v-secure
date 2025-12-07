import fetch from 'cross-fetch';
import { BaseOAuthFlow } from './base-flow';
import { TokenResponse, DeviceCodeResponse, OAuthConfig } from '../types';

export class TerminalOAuthFlow extends BaseOAuthFlow {
  private pollInterval: number = 5;

  constructor(config: OAuthConfig) {
    super({
      ...config,
      clientId: config.clientId || 'lanonasis-mcp-cli'
    });
  }

  async authenticate(): Promise<TokenResponse> {
    try {
      // Step 1: Request device code
      const deviceResponse = await this.requestDeviceCode();
      
      // Step 2: Display verification instructions
      this.displayInstructions(deviceResponse);
      
      // Step 3: Open browser automatically (if possible)
      if (deviceResponse.verification_uri_complete) {
        await this.openBrowser(deviceResponse.verification_uri_complete);
      }
      
      // Step 4: Poll for token
      return await this.pollForToken(deviceResponse);
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  private async requestDeviceCode(): Promise<DeviceCodeResponse> {
    const response = await fetch(`${this.authBaseUrl}/oauth/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        scope: this.scope
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Failed to request device code');
    }

    const data = await response.json();
    this.pollInterval = data.interval || 5;
    return data;
  }

  private displayInstructions(response: DeviceCodeResponse): void {
    console.log('\n🔐 Lan Onasis Authentication Required\n');
    console.log(`Please visit: ${response.verification_uri}`);
    console.log(`Enter code: ${response.user_code}\n`);
    console.log('Or press Enter to open your browser automatically...');
  }

  private async openBrowser(url: string): Promise<void> {
    try {
      const { default: open } = await import('open');
      // Wait for user to press Enter or timeout after 2 seconds
      await Promise.race([
        this.waitForEnter(),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
      
      console.log('Opening browser...');
      await open(url);
    } catch (error) {
      console.log('Please open the URL manually in your browser.');
    }
  }

  private waitForEnter(): Promise<void> {
    return new Promise(resolve => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', () => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async pollForToken(deviceResponse: DeviceCodeResponse): Promise<TokenResponse> {
    const startTime = Date.now();
    const expiresAt = startTime + (deviceResponse.expires_in * 1000);
    
    console.log('Waiting for authorization...');
    
    while (Date.now() < expiresAt) {
      await new Promise(resolve => setTimeout(resolve, this.pollInterval * 1000));
      
      try {
        const token = await this.checkDeviceCode(deviceResponse.device_code);
        console.log('✅ Authorization successful!\n');
        return token;
      } catch (error: any) {
        if (error.message === 'authorization_pending') {
          // Continue polling
          process.stdout.write('.');
        } else if (error.message === 'slow_down') {
          // Increase polling interval
          this.pollInterval += 5;
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('Authorization timeout - please try again');
  }

  private async checkDeviceCode(deviceCode: string): Promise<TokenResponse> {
    const response = await fetch(`${this.authBaseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode,
        client_id: this.clientId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Token request failed');
    }

    return data;
  }
}
