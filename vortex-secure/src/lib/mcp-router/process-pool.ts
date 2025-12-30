// MCP Router - Process Pool Manager
// Manages MCP server processes with pooling and lifecycle management

import { supabase } from '../supabase';
import type {
  MCPServiceCatalog,
  MCPProcess,
  ProcessStatus,
} from '../../types/mcp-router';

interface PooledProcess {
  id: string;
  userId: string;
  serviceKey: string;
  status: ProcessStatus;
  startedAt: Date;
  lastActivityAt: Date;
  idleTimeoutMs: number;
  pendingRequests: number;
  totalRequests: number;

  // Simulated MCP connection state
  credentials: Record<string, string>;
  envMapping: Record<string, string>;
  command: string;
  args: string[];
}

interface ExecutionResult {
  data: any;
  status: number;
  response_time_ms: number;
}

export class MCPProcessPool {
  private pool: Map<string, PooledProcess> = new Map();
  private idleCheckInterval: NodeJS.Timeout | null = null;
  private masterPassword: string;

  // Configuration
  private readonly DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly IDLE_CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
  private readonly MAX_PROCESSES_PER_USER = 10;
  private readonly MAX_TOTAL_PROCESSES = 100;

  constructor(masterPassword: string) {
    this.masterPassword = masterPassword;
    this.startIdleCheck();
  }

  /**
   * Execute an action on an MCP service
   */
  async execute(
    userId: string,
    serviceKey: string,
    catalogService: MCPServiceCatalog,
    credentials: Record<string, string>,
    action: string,
    params: Record<string, any>
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Get or create process for this user/service combination
    const process = await this.getOrCreateProcess(
      userId,
      serviceKey,
      catalogService,
      credentials
    );

    if (!process) {
      throw new Error('Failed to acquire MCP process');
    }

    try {
      // Mark process as active
      process.pendingRequests++;
      process.lastActivityAt = new Date();
      await this.updateProcessInDB(process);

      // Execute the MCP call
      // In a real implementation, this would communicate with an actual MCP server
      // For now, we simulate the external API call
      const result = await this.executeExternalCall(
        process,
        catalogService,
        action,
        params
      );

      process.totalRequests++;
      process.pendingRequests = Math.max(0, process.pendingRequests - 1);
      process.status = process.pendingRequests > 0 ? 'running' : 'idle';
      await this.updateProcessInDB(process);

      return {
        data: result,
        status: 200,
        response_time_ms: Date.now() - startTime,
      };
    } catch (error: any) {
      process.pendingRequests = Math.max(0, process.pendingRequests - 1);
      process.status = 'error';
      await this.updateProcessInDB(process);
      throw error;
    }
  }

  /**
   * Get an existing process or create a new one
   */
  private async getOrCreateProcess(
    userId: string,
    serviceKey: string,
    catalogService: MCPServiceCatalog,
    credentials: Record<string, string>
  ): Promise<PooledProcess | null> {
    const poolKey = `${userId}:${serviceKey}`;

    // Check if we already have a process in the pool
    let process = this.pool.get(poolKey);

    if (process && process.status !== 'error' && process.status !== 'terminated') {
      // Reuse existing process
      return process;
    }

    // Check limits
    const userProcessCount = Array.from(this.pool.values()).filter(
      p => p.userId === userId && p.status !== 'terminated'
    ).length;

    if (userProcessCount >= this.MAX_PROCESSES_PER_USER) {
      // Terminate the oldest idle process for this user
      await this.terminateOldestIdleProcess(userId);
    }

    if (this.pool.size >= this.MAX_TOTAL_PROCESSES) {
      // Terminate the oldest idle process globally
      await this.terminateOldestIdleProcess();
    }

    // Create new process
    process = await this.createProcess(
      userId,
      serviceKey,
      catalogService,
      credentials
    );

    if (process) {
      this.pool.set(poolKey, process);
    }

    return process;
  }

  /**
   * Create a new MCP process
   */
  private async createProcess(
    userId: string,
    serviceKey: string,
    catalogService: MCPServiceCatalog,
    credentials: Record<string, string>
  ): Promise<PooledProcess> {
    const processId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const process: PooledProcess = {
      id: processId,
      userId,
      serviceKey,
      status: 'starting',
      startedAt: new Date(),
      lastActivityAt: new Date(),
      idleTimeoutMs: this.DEFAULT_IDLE_TIMEOUT_MS,
      pendingRequests: 0,
      totalRequests: 0,
      credentials,
      envMapping: catalogService.mcp_env_mapping || {},
      command: catalogService.mcp_command || '',
      args: catalogService.mcp_args || [],
    };

    // Insert into database
    const { error: insertError } = await supabase.from('mcp_process_pool').insert([
      {
        process_id: processId,
        user_id: userId,
        service_key: serviceKey,
        status: 'starting',
        started_at: process.startedAt.toISOString(),
        last_activity_at: process.lastActivityAt.toISOString(),
        idle_timeout_seconds: Math.floor(this.DEFAULT_IDLE_TIMEOUT_MS / 1000),
        total_requests: 0,
        active_requests: 0,
      },
    ]);

    if (insertError) {
      console.error('Failed to insert process into database:', insertError.message);
    }

    // Simulate process startup
    // In a real implementation, this would spawn an actual MCP server process
    await this.simulateProcessStartup(process);

    process.status = 'running';
    await this.updateProcessInDB(process);

    return process;
  }

  /**
   * Simulate MCP process startup
   */
  private async simulateProcessStartup(process: PooledProcess): Promise<void> {
    // In a real implementation:
    // 1. Spawn the MCP server process: npx @stripe/mcp-server
    // 2. Set up environment variables with credentials
    // 3. Establish communication channel (stdio, websocket, etc.)
    // 4. Wait for ready signal

    // For now, just simulate a short delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Execute external API call through MCP
   */
  private async executeExternalCall(
    process: PooledProcess,
    catalogService: MCPServiceCatalog,
    action: string,
    params: Record<string, any>
  ): Promise<any> {
    // In a real implementation:
    // 1. Send action request to the MCP server process
    // 2. Wait for response
    // 3. Parse and return the result

    // For simulation, we'll make a direct API call or return mock data
    const credentials = process.credentials;

    // Build headers using credentials
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Map credentials to headers based on service type
    for (const [credKey, envVar] of Object.entries(process.envMapping)) {
      if (credentials[credKey]) {
        // Common header mapping patterns
        if (envVar.includes('API_KEY') || envVar.includes('SECRET_KEY')) {
          headers['Authorization'] = `Bearer ${credentials[credKey]}`;
        } else if (envVar.includes('TOKEN')) {
          headers['Authorization'] = `Bearer ${credentials[credKey]}`;
        }
      }
    }

    // If the service has a base URL, we could make a real call
    // For now, return simulated response based on service/action
    return this.simulateServiceResponse(
      process.serviceKey,
      action,
      params,
      credentials
    );
  }

  /**
   * Simulate service response
   */
  private simulateServiceResponse(
    serviceKey: string,
    action: string,
    params: Record<string, any>,
    credentials: Record<string, string>
  ): any {
    // Simulate responses for different services
    switch (serviceKey) {
      case 'stripe':
        return this.simulateStripeResponse(action, params);
      case 'github':
        return this.simulateGitHubResponse(action, params);
      case 'openai':
        return this.simulateOpenAIResponse(action, params);
      case 'slack':
        return this.simulateSlackResponse(action, params);
      default:
        return {
          success: true,
          service: serviceKey,
          action,
          params,
          message: 'Action executed successfully (simulated)',
          timestamp: new Date().toISOString(),
        };
    }
  }

  private simulateStripeResponse(action: string, params: any): any {
    switch (action) {
      case 'create-charge':
        return {
          id: `ch_${Math.random().toString(36).substr(2, 14)}`,
          object: 'charge',
          amount: params.amount || 0,
          currency: params.currency || 'usd',
          status: 'succeeded',
          created: Math.floor(Date.now() / 1000),
        };
      case 'create-customer':
        return {
          id: `cus_${Math.random().toString(36).substr(2, 14)}`,
          object: 'customer',
          email: params.email,
          created: Math.floor(Date.now() / 1000),
        };
      case 'list-customers':
        return {
          object: 'list',
          data: [],
          has_more: false,
        };
      default:
        return { success: true, action };
    }
  }

  private simulateGitHubResponse(action: string, params: any): any {
    switch (action) {
      case 'create-issue':
        return {
          id: Math.floor(Math.random() * 1000000),
          number: Math.floor(Math.random() * 1000),
          title: params.title,
          state: 'open',
          html_url: `https://github.com/${params.repo}/issues/${Math.floor(Math.random() * 1000)}`,
          created_at: new Date().toISOString(),
        };
      case 'create-pr':
        return {
          id: Math.floor(Math.random() * 1000000),
          number: Math.floor(Math.random() * 1000),
          title: params.title,
          state: 'open',
          html_url: `https://github.com/${params.repo}/pull/${Math.floor(Math.random() * 1000)}`,
          created_at: new Date().toISOString(),
        };
      default:
        return { success: true, action };
    }
  }

  private simulateOpenAIResponse(action: string, params: any): any {
    switch (action) {
      case 'chat':
      case 'completions':
        return {
          id: `chatcmpl-${Math.random().toString(36).substr(2, 24)}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: params.model || 'gpt-4',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'This is a simulated response from OpenAI.',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 15,
            total_tokens: 25,
          },
        };
      case 'embeddings':
        return {
          object: 'list',
          data: [
            {
              object: 'embedding',
              embedding: Array(1536).fill(0).map(() => Math.random()),
              index: 0,
            },
          ],
          model: params.model || 'text-embedding-ada-002',
          usage: { prompt_tokens: 8, total_tokens: 8 },
        };
      default:
        return { success: true, action };
    }
  }

  private simulateSlackResponse(action: string, params: any): any {
    switch (action) {
      case 'post-message':
        return {
          ok: true,
          channel: params.channel,
          ts: `${Math.floor(Date.now() / 1000)}.${Math.floor(Math.random() * 1000000)}`,
          message: {
            text: params.text,
            user: 'U12345678',
            ts: `${Math.floor(Date.now() / 1000)}.${Math.floor(Math.random() * 1000000)}`,
          },
        };
      case 'list-channels':
        return {
          ok: true,
          channels: [],
        };
      default:
        return { ok: true, action };
    }
  }

  /**
   * Update process status in database
   */
  private async updateProcessInDB(process: PooledProcess): Promise<void> {
    await supabase
      .from('mcp_process_pool')
      .update({
        status: process.status,
        last_activity_at: process.lastActivityAt.toISOString(),
        total_requests: process.totalRequests,
        active_requests: process.pendingRequests,
      })
      .eq('process_id', process.id);
  }

  /**
   * Terminate a process
   */
  private async terminateProcess(process: PooledProcess): Promise<void> {
    process.status = 'terminated';

    await supabase
      .from('mcp_process_pool')
      .update({
        status: 'terminated',
        terminated_at: new Date().toISOString(),
        termination_reason: 'idle_timeout',
      })
      .eq('process_id', process.id);

    const poolKey = `${process.userId}:${process.serviceKey}`;
    this.pool.delete(poolKey);
  }

  /**
   * Terminate the oldest idle process
   */
  private async terminateOldestIdleProcess(userId?: string): Promise<void> {
    let oldestIdle: PooledProcess | null = null;
    let oldestIdleTime = Date.now();

    for (const process of this.pool.values()) {
      if (userId && process.userId !== userId) continue;
      if (process.status !== 'idle') continue;

      const idleTime = process.lastActivityAt.getTime();
      if (idleTime < oldestIdleTime) {
        oldestIdleTime = idleTime;
        oldestIdle = process;
      }
    }

    if (oldestIdle) {
      await this.terminateProcess(oldestIdle);
    }
  }

  /**
   * Start idle check interval
   */
  private startIdleCheck(): void {
    this.idleCheckInterval = setInterval(async () => {
      await this.checkIdleProcesses();
    }, this.IDLE_CHECK_INTERVAL_MS);
  }

  /**
   * Check and terminate idle processes
   */
  private async checkIdleProcesses(): Promise<void> {
    const now = Date.now();

    for (const process of this.pool.values()) {
      if (process.status !== 'idle') continue;

      const idleTime = now - process.lastActivityAt.getTime();
      if (idleTime >= process.idleTimeoutMs) {
        await this.terminateProcess(process);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    total_processes: number;
    running: number;
    idle: number;
    starting: number;
    error: number;
    by_service: Record<string, number>;
  } {
    const stats = {
      total_processes: this.pool.size,
      running: 0,
      idle: 0,
      starting: 0,
      error: 0,
      by_service: {} as Record<string, number>,
    };

    for (const process of this.pool.values()) {
      switch (process.status) {
        case 'running':
          stats.running++;
          break;
        case 'idle':
          stats.idle++;
          break;
        case 'starting':
          stats.starting++;
          break;
        case 'error':
          stats.error++;
          break;
      }

      stats.by_service[process.serviceKey] =
        (stats.by_service[process.serviceKey] || 0) + 1;
    }

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    // Basic health check - can we create a simple process?
    return true;
  }

  /**
   * Shutdown the pool
   */
  async shutdown(): Promise<void> {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }

    // Terminate all processes
    for (const process of this.pool.values()) {
      await this.terminateProcess(process);
    }

    this.pool.clear();
  }

  /**
   * Force terminate a specific process
   */
  async forceTerminate(processId: string): Promise<void> {
    for (const process of this.pool.values()) {
      if (process.id === processId) {
        await this.terminateProcess(process);
        return;
      }
    }
  }

  /**
   * Get processes for a user
   */
  getProcessesForUser(userId: string): PooledProcess[] {
    return Array.from(this.pool.values()).filter(p => p.userId === userId);
  }
}

export default MCPProcessPool;
