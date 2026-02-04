import { createClient } from '@supabase/supabase-js'

type Action = 'health' | 'getServers' | 'executeCommand' | 'restartService' | 'fixSSH'

type MonitorConfig = {
  baseUrl: string
  token: string
  healthPath: string
  serversPath: string
  commandPath: string
  servicePath: string
  sshPath: string
}

function getMonitorConfig(): MonitorConfig | null {
  const baseUrl = process.env.VPS_MONITOR_URL
  const token = process.env.VPS_MONITOR_TOKEN

  if (!baseUrl || !token) {
    return null
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    token,
    healthPath: process.env.VPS_MONITOR_HEALTH_PATH || '/health',
    serversPath: process.env.VPS_MONITOR_SERVERS_PATH || '/servers',
    commandPath: process.env.VPS_MONITOR_COMMAND_PATH || '/command',
    servicePath: process.env.VPS_MONITOR_SERVICE_PATH || '/services',
    sshPath: process.env.VPS_MONITOR_SSH_PATH || '/ssh',
  }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  return { url, anonKey }
}

async function requireAdmin(req: any) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing authorization token' }
  }

  const token = authHeader.replace('Bearer ', '')
  const { url, anonKey } = getSupabaseConfig()

  if (!url || !anonKey) {
    return { ok: false, status: 500, error: 'Supabase configuration missing' }
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
    },
  })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return { ok: false, status: 401, error: 'Invalid or expired session' }
  }

  const role = data.user.user_metadata?.role || data.user.app_metadata?.role
  const isAdmin = role === 'admin'

  if (!isAdmin) {
    return { ok: false, status: 403, error: 'Admin access required' }
  }

  return { ok: true, user: data.user }
}

async function callMonitor(config: MonitorConfig, path: string, options: RequestInit = {}) {
  const url = `${config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.token}`,
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Monitor error: ${response.status}`
    throw new Error(message)
  }

  return payload
}

function normalizeServers(payload: any) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.servers)) {
    return payload.servers
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  return []
}

function normalizeOutput(payload: any): string {
  const output = payload?.output ?? payload?.result ?? payload?.data
  if (typeof output === 'string') {
    return output
  }

  if (Array.isArray(output)) {
    return output.join('\n')
  }

  if (output) {
    return JSON.stringify(output, null, 2)
  }

  if (payload && Object.keys(payload).length > 0) {
    return JSON.stringify(payload, null, 2)
  }

  return 'Command executed'
}

export default async function handler(req: any, res: any) {
  const auth = await requireAdmin(req)
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error })
  }

  const monitorConfig = getMonitorConfig()
  if (!monitorConfig) {
    return res.status(503).json({
      error: 'VPS monitoring service is not configured',
      configured: false,
    })
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      configured: true,
      monitor: monitorConfig.baseUrl,
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, payload } = req.body || {}

  if (!action) {
    return res.status(400).json({ error: 'Missing action' })
  }

  const typedAction = action as Action

  try {
    switch (typedAction) {
      case 'health': {
        const data = await callMonitor(monitorConfig, monitorConfig.healthPath)
        return res.status(200).json({ data })
      }
      case 'getServers': {
        const data = await callMonitor(monitorConfig, monitorConfig.serversPath)
        const servers = normalizeServers(data)
        return res.status(200).json({ data: { servers, lastUpdated: new Date().toISOString() } })
      }
      case 'executeCommand': {
        const { serverId, command } = payload || {}
        if (!serverId || !command) {
          return res.status(400).json({ error: 'Missing serverId or command' })
        }

        const data = await callMonitor(monitorConfig, monitorConfig.commandPath, {
          method: 'POST',
          body: JSON.stringify({ serverId, command }),
        })

        return res.status(200).json({ data: { output: normalizeOutput(data) } })
      }
      case 'restartService': {
        const { serverId, serviceName } = payload || {}
        if (!serverId || !serviceName) {
          return res.status(400).json({ error: 'Missing serverId or serviceName' })
        }

        const data = await callMonitor(monitorConfig, monitorConfig.servicePath, {
          method: 'POST',
          body: JSON.stringify({ serverId, serviceName, action: 'restart' }),
        })

        return res.status(200).json({ data })
      }
      case 'fixSSH': {
        const { serverId } = payload || {}
        if (!serverId) {
          return res.status(400).json({ error: 'Missing serverId' })
        }

        const data = await callMonitor(monitorConfig, monitorConfig.sshPath, {
          method: 'POST',
          body: JSON.stringify({ serverId, action: 'fix' }),
        })

        return res.status(200).json({ data })
      }
      default:
        return res.status(400).json({ error: `Unsupported action: ${action}` })
    }
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Failed to reach VPS monitoring service',
    })
  }
}
