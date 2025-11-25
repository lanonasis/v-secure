import { TokenStorage } from '../storage/token-storage';
import { TerminalOAuthFlow } from '../flows/terminal-flow';
import { DesktopOAuthFlow } from '../flows/desktop-flow';
import { BaseOAuthFlow } from '../flows/base-flow';
import { TokenResponse, OAuthConfig } from '../types';

export interface MCPClientConfig extends Partial<OAuthConfig> {
  mcpEndpoint?: string;
  autoRefresh?: boolean;
}

export class MCPClient {
  private tokenStorage: TokenStorage;
  private authFlow: BaseOAuthFlow;
  private config: MCPClientConfig;
  private ws: any = null;
  private eventSource: any = null;
  private accessToken: string | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(config: MCPClientConfig = {}) {
    this.config = {
      mcpEndpoint: 'wss://mcp.lanonasis.com',
      autoRefresh: true,
      ...config
    };

    this.tokenStorage = new TokenStorage();
    
    // Select appropriate auth flow based on environment
    if (this.isTerminal()) {
      this.authFlow = new TerminalOAuthFlow(config as OAuthConfig);
    } else {
      this.authFlow = new DesktopOAuthFlow(config as OAuthConfig);
    }
  }

  async connect(): Promise<void> {
    try {
      // Check for existing tokens
      let tokens = await this.tokenStorage.retrieve();
      
      // Validate and refresh if needed
      if (!tokens || this.tokenStorage.isTokenExpired(tokens)) {
        if (tokens?.refresh_token) {
          try {
            tokens = await this.authFlow.refreshToken(tokens.refresh_token);
            await this.tokenStorage.store(tokens);
          } catch (error) {
            // Refresh failed, need to re-authenticate
            tokens = await this.authenticate();
          }
        } else {
          tokens = await this.authenticate();
        }
      }
      
      this.accessToken = tokens.access_token;
      
      // Set up automatic token refresh
      if (this.config.autoRefresh && tokens.expires_in) {
        this.scheduleTokenRefresh(tokens);
      }
      
      // Establish MCP connection
      await this.establishConnection();
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  private async authenticate(): Promise<TokenResponse> {
    console.log('Authenticating with Lan Onasis...');
    const tokens = await this.authFlow.authenticate();
    await this.tokenStorage.store(tokens);
    return tokens;
  }

  private scheduleTokenRefresh(tokens: TokenResponse): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // Refresh 5 minutes before expiry
    const refreshIn = (tokens.expires_in - 300) * 1000;
    
    this.refreshTimer = setTimeout(async () => {
      try {
        if (tokens.refresh_token) {
          const newTokens = await this.authFlow.refreshToken(tokens.refresh_token);
          await this.tokenStorage.store(newTokens);
          this.accessToken = newTokens.access_token;
          
          // Schedule next refresh
          this.scheduleTokenRefresh(newTokens);
          
          // Reconnect with new token
          await this.reconnect();
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Will require re-authentication on next request
      }
    }, refreshIn);
  }

  private async establishConnection(): Promise<void> {
    const endpoint = this.config.mcpEndpoint!;
    
    if (endpoint.startsWith('wss://')) {
      await this.connectWebSocket(endpoint);
    } else if (endpoint.startsWith('https://')) {
      await this.connectSSE(endpoint);
    } else {
      throw new Error('Invalid MCP endpoint - must be wss:// or https://');
    }
  }

  private async connectWebSocket(endpoint: string): Promise<void> {
    const wsUrl = new URL(endpoint);
    wsUrl.pathname = '/ws';
    
    // Add auth to URL for environments that don't support headers
    if (this.accessToken) {
      wsUrl.searchParams.set('access_token', this.accessToken);
    }
    
    if (typeof WebSocket !== 'undefined') {
      // Browser environment
      this.ws = new WebSocket(wsUrl.toString());
    } else {
      // Node.js environment
      const { default: WS } = await import('ws');
      this.ws = new WS(wsUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
    }
    
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not initialized'));
        return;
      }
      
      this.ws.onopen = () => {
        console.log('MCP WebSocket connected');
        resolve();
      };
      
      this.ws.onerror = (error: any) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onclose = (event: any) => {
        console.log('WebSocket closed:', event.code, event.reason);
        
        // Attempt reconnection for non-auth errors
        if (event.code !== 1008 && event.code !== 4001) {
          setTimeout(() => this.reconnect(), 5000);
        }
      };
      
      this.ws.onmessage = (event: any) => {
        this.handleMessage(event.data);
      };
    });
  }

  private async connectSSE(endpoint: string): Promise<void> {
    const sseUrl = new URL(endpoint);
    sseUrl.pathname = '/sse';
    
    if (typeof EventSource !== 'undefined') {
      // Browser environment
      this.eventSource = new EventSource(sseUrl.toString());
    } else {
      // Node.js environment - use eventsource polyfill
      const EventSourceModule = await import('eventsource');
      const ES = (EventSourceModule as any).default || EventSourceModule;
      this.eventSource = new ES(sseUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
    }
    
    this.eventSource.onopen = () => {
      console.log('MCP SSE connected');
    };
    
    this.eventSource.onerror = (error: any) => {
      console.error('SSE error:', error);
      
      // Attempt reconnection
      setTimeout(() => this.reconnect(), 5000);
    };
    
    this.eventSource.onmessage = (event: any) => {
      this.handleMessage(event.data);
    };
  }

  private handleMessage<T = unknown>(data: string): void {
    try {
      const message = JSON.parse(data);
      // Handle MCP protocol messages
      console.log('MCP message:', message);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private async reconnect(): Promise<void> {
    this.disconnect();
    await this.establishConnection();
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(`${this.config.mcpEndpoint}/api`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.generateId(),
        method,
        params
      })
    });
    
    if (response.status === 401) {
      // Token expired, try to refresh
      const tokens = await this.tokenStorage.retrieve();
      if (tokens?.refresh_token) {
        const newTokens = await this.authFlow.refreshToken(tokens.refresh_token);
        await this.tokenStorage.store(newTokens);
        this.accessToken = newTokens.access_token;
        
        // Retry request
        return this.request(method, params);
      } else {
        // Need to re-authenticate
        await this.connect();
        return this.request(method, params);
      }
    }
    
    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message || 'Request failed');
    }
    
    return result.result;
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
  }

  async logout(): Promise<void> {
    // Revoke tokens
    const tokens = await this.tokenStorage.retrieve();
    if (tokens) {
      try {
        if (tokens.access_token) {
          await this.authFlow.revokeToken(tokens.access_token, 'access_token');
        }
        if (tokens.refresh_token) {
          await this.authFlow.revokeToken(tokens.refresh_token, 'refresh_token');
        }
      } catch (error) {
        console.error('Failed to revoke tokens:', error);
      }
    }
    
    // Clear stored tokens
    await this.tokenStorage.clear();
    
    // Disconnect
    this.disconnect();
    
    this.accessToken = null;
  }

  private isTerminal(): boolean {
    return !!(typeof process !== 'undefined' && 
           process.versions && 
           process.versions.node &&
           !this.isElectron());
  }

  private isElectron(): boolean {
    return typeof window !== 'undefined' && 
           (window as typeof window & { electronAPI?: unknown }).electronAPI !== undefined;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // MCP-specific methods
  async createMemory<T = unknown>(title: string, content: string, options?: unknown): Promise<T> {
    return this.request('memory/create', {
      title,
      content,
      ...(options as Record<string, unknown>)
    });
  }

  async searchMemories<T = unknown>(query: string, options?: unknown): Promise<T[]> {
    return this.request('memory/search', {
      query,
      ...(options as Record<string, unknown>)
    });
  }

  async getMemory<T = unknown>(id: string): Promise<T> {
    return this.request('memory/get', { id });
  }

  async updateMemory<T = unknown>(id: string, updates: Partial<T>): Promise<T> {
    return this.request('memory/update', {
      id,
      ...updates
    });
  }

  async deleteMemory(id: string): Promise<void> {
    return this.request('memory/delete', { id });
  }
}