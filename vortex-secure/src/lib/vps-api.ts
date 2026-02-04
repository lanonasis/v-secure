import { supabase } from './supabase'

export type VPSServer = {
  id: string
  name: string
  ip: string
  location: string
  status: 'online' | 'offline' | 'error' | 'maintenance'
  sshStatus: 'connected' | 'timeout' | 'refused' | 'unknown'
  uptime: string
  load: number
  memory: { used: number; total: number }
  disk: { used: number; total: number }
  network: { in: number; out: number }
  services: Array<{
    name: string
    status: 'running' | 'stopped' | 'error'
    port?: number
    pid?: number
    memory?: number
    restart_count?: number
  }>
  lastCheck: string
}

const API_BASE = '/api/vps'

type VPSAction = 'health' | 'getServers' | 'executeCommand' | 'restartService' | 'fixSSH'

async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    return null
  }
  return data.session?.access_token ?? null
}

async function request<T>(action: VPSAction, payload?: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('You must be logged in to access VPS data')
  }

  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, payload }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `VPS API error: ${response.status}`)
  }

  return (data.data ?? data) as T
}

async function getStatus() {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('You must be logged in to access VPS data')
  }

  const response = await fetch(API_BASE, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `VPS status error: ${response.status}`)
  }

  return data as { configured: boolean; monitor?: string }
}

export const vpsAPI = {
  getStatus,
  async getServers(): Promise<{ servers: VPSServer[]; lastUpdated?: string }> {
    return request<{ servers: VPSServer[]; lastUpdated?: string }>('getServers')
  },
  async executeCommand(serverId: string, command: string): Promise<{ output: string }> {
    return request<{ output: string }>('executeCommand', { serverId, command })
  },
  async restartService(serverId: string, serviceName: string) {
    return request('restartService', { serverId, serviceName })
  },
  async fixSSH(serverId: string) {
    return request('fixSSH', { serverId })
  },
  async health() {
    return request('health')
  },
}
