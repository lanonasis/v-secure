import fetch from 'cross-fetch';
import { TokenStorageAdapter } from '../storage/token-storage';
import { TokenStorageWeb } from '../storage/token-storage-web';
import { DesktopOAuthFlow } from '../flows/desktop-flow';
import { APIKeyFlow } from '../flows/apikey-flow';
import { BaseOAuthFlow } from '../flows/base-flow';
import { TokenResponse, OAuthConfig } from '../types';

export interface MCPClientConfig extends Partial<OAuthConfig> {
  mcpEndpoint?: string;
  autoRefresh?: boolean;
  apiKey?: string;
  tokenStorage?: TokenStorageAdapter;
}

/**
 * Browser-optimized MCP Client
 * Only includes Desktop OAuth flow (for Electron/browser popups)
 * Does NOT include Terminal flow to avoid Node.js dependencies (open package, etc.)
 */
export class MCPClient {
  private tokenStorage: TokenStorageAdapter;
  private authFlow: BaseOAuthFlow;
  private config: MCPClientConfig;
  private authMode: 'oauth' | 'apikey';
  private ws: any = null;
  private eventSource: any = null;
  private accessToken: string | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: MCPClientConfig = {}) {
    this.config = {
      mcpEndpoint: 'wss://mcp.lanonasis.com',
      autoRefresh: true,
      ...config
    };

    // Browser always uses web storage
    this.tokenStorage = config.tokenStorage || new TokenStorageWeb();

    // Detect auth mode
    this.authMode = config.apiKey ? 'apikey' : 'oauth';

    // Select appropriate auth flow
    if (this.authMode === 'apikey') {
      // API Key mode
      this.authFlow = new APIKeyFlow(
        config.apiKey!,
        config.authBaseUrl || 'https://mcp.lanonasis.com'
      );
    } else {
      // OAuth mode - Desktop flow only (uses browser popups or Electron windows)
      this.authFlow = new DesktopOAuthFlow(config as OAuthConfig);
    }
  }

  async connect(): Promise<void> {
    try {
      let tokens = await this.tokenStorage.retrieve();

      if (this.authMode === 'apikey') {
        // API key mode - simpler flow
        if (!tokens) {
          tokens = await this.authenticate();
        }
        this.accessToken = tokens.access_token;  // This is the API key
      } else {
        // OAuth mode - existing refresh logic
        if (!tokens || this.tokenStorage.isTokenExpired(tokens)) {
          if (tokens?.refresh_token) {
            try {
              tokens = await this.authFlow.refreshToken(tokens.refresh_token);
              await this.tokenStorage.store(tokens);
            } catch (error) {
              tokens = await this.authenticate();
            }
          } else {
            tokens = await this.authenticate();
          }
        }

        this.accessToken = tokens.access_token;

        // Schedule token refresh
        if (this.config.autoRefresh && tokens.expires_in) {
          this.scheduleTokenRefresh(tokens.expires_in);
        }
      }

      await this.establishConnection();
    } catch (error) {
      console.error('MCP connection failed:', error);
      throw error;
    }
  }

  private async authenticate(): Promise<TokenResponse> {
    const tokens = await this.authFlow.authenticate();
    await this.tokenStorage.store(tokens);
    return tokens;
  }

  private async ensureAccessToken(): Promise<string> {
    if (!this.accessToken) {
      await this.connect();
    }
    return this.accessToken!;
  }

  private scheduleTokenRefresh(expiresIn: number): void {
    // Refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(async () => {
      try {
        const tokens = await this.tokenStorage.retrieve();
        if (tokens?.refresh_token) {
          const newTokens = await this.authFlow.refreshToken(tokens.refresh_token);
          await this.tokenStorage.store(newTokens);
          this.accessToken = newTokens.access_token;

          // Schedule next refresh
          if (newTokens.expires_in) {
            this.scheduleTokenRefresh(newTokens.expires_in);
          }
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Trigger re-authentication
        await this.connect();
      }
    }, refreshTime);
  }

  private async establishConnection(): Promise<void> {
    const endpoint = this.config.mcpEndpoint!;

    if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
      await this.connectWebSocket(endpoint);
    } else {
      await this.connectSSE(endpoint);
    }
  }

  private async connectWebSocket(endpoint: string): Promise<void> {
    // Browser WebSocket API
    if (typeof WebSocket !== 'undefined') {
      this.ws = new WebSocket(endpoint);

      this.ws.onopen = () => {
        console.log('MCP WebSocket connected');

        // Send authentication
        this.ws?.send(JSON.stringify({
          type: 'auth',
          token: this.accessToken
        }));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (error: Event) => {
        console.error('MCP WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('MCP WebSocket disconnected');
        setTimeout(() => this.reconnect(), 5000);
      };
    } else {
      throw new Error('WebSocket is not available in this environment');
    }
  }

  private async connectSSE(endpoint: string): Promise<void> {
    const sseUrl = new URL(endpoint);

    // Browser EventSource API
    if (typeof EventSource !== 'undefined') {
      // For browser environments with EventSource
      if (this.authMode === 'apikey') {
        sseUrl.searchParams.set('api_key', this.accessToken!);
      } else {
        sseUrl.searchParams.set('token', this.accessToken!);
      }

      this.eventSource = new EventSource(sseUrl.toString());

      this.eventSource.onopen = () => {
        console.log('MCP SSE connected');
      };

      this.eventSource.onmessage = (event: MessageEvent) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.eventSource.onerror = () => {
        console.error('MCP SSE error');
        this.eventSource?.close();
        setTimeout(() => this.reconnect(), 5000);
      };
    } else {
      throw new Error('EventSource is not available in this environment');
    }
  }

  private handleMessage(message: any): void {
    // Handle MCP messages
    console.log('MCP message:', message);
  }

  private async reconnect(): Promise<void> {
    try {
      await this.connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
      setTimeout(() => this.reconnect(), 10000);
    }
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    await this.ensureAccessToken();

    const endpoint = this.config.mcpEndpoint!.replace(/^ws/, 'http');

    const response = await fetch(`${endpoint}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.generateId(),
        method,
        params
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'MCP request failed');
    }

    return data.result;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.accessToken = null;
  }

  async logout(): Promise<void> {
    this.disconnect();
    await this.tokenStorage.clear();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Convenience methods for memory operations
  async createMemory<T = unknown>(title: string, content: string, options?: Record<string, unknown>): Promise<T> {
    return this.request('memories.create', { title, content, ...(options || {}) });
  }

  async searchMemories<T = unknown>(query: string, options?: Record<string, unknown>): Promise<T[]> {
    return this.request('memories.search', { query, ...(options || {}) });
  }

  async getMemory<T = unknown>(id: string): Promise<T> {
    return this.request('memories.get', { id });
  }

  async updateMemory<T = unknown>(id: string, updates: Partial<T>): Promise<T> {
    return this.request('memories.update', { id, updates });
  }

  async deleteMemory(id: string): Promise<void> {
    return this.request('memories.delete', { id });
  }
}
