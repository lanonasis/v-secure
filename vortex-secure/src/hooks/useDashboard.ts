// Hook for dashboard data with real Supabase data
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalSecrets: number;
  activeSecrets: number;
  rotationsDue: number;
  mcpSessions: number;
  secretsAccessed24h: number;
  averageResponseTime: number;
}

interface UsageDataPoint {
  name: string;
  secrets: number;
  mcp: number;
}

interface SecretSummary {
  name: string;
  environment: string;
  status: string;
  lastRotated: string;
  usage: number;
}

interface MCPSession {
  toolName: string;
  secretsAccessed: string[];
  timeRemaining: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface UseDashboardReturn {
  stats: DashboardStats;
  usageData: UsageDataPoint[];
  recentSecrets: SecretSummary[];
  activeSessions: MCPSession[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<DashboardStats>({
    totalSecrets: 0,
    activeSecrets: 0,
    rotationsDue: 0,
    mcpSessions: 0,
    secretsAccessed24h: 0,
    averageResponseTime: 0,
  });
  const [usageData, setUsageData] = useState<UsageDataPoint[]>([]);
  const [recentSecrets, setRecentSecrets] = useState<SecretSummary[]>([]);
  const [activeSessions, setActiveSessions] = useState<MCPSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch secrets count
      const { data: secrets, error: secretsError } = await supabase
        .from('secrets')
        .select('id, status, last_rotated, name, environment, usage_count', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .limit(10);

      if (secretsError) throw new Error(secretsError.message);

      const totalSecrets = secrets?.length || 0;
      const activeSecrets = secrets?.filter(s => s.status === 'active').length || 0;

      // Calculate rotations due (last_rotated > 90 days ago)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const rotationsDue = secrets?.filter(s =>
        s.last_rotated && new Date(s.last_rotated) < ninetyDaysAgo
      ).length || 0;

      // Fetch MCP usage logs for the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: recentLogs } = await supabase
        .from('mcp_usage_logs')
        .select('id, response_time_ms')
        .gte('timestamp', yesterday.toISOString());

      const secretsAccessed24h = recentLogs?.length || 0;
      const avgResponseTime = recentLogs?.length
        ? Math.round(recentLogs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / recentLogs.length)
        : 0;

      // Fetch active MCP sessions
      const { data: userServices } = await supabase
        .from('user_mcp_services')
        .select('service_key, is_enabled')
        .eq('user_id', user.id)
        .eq('is_enabled', true);

      const mcpSessions = userServices?.length || 0;

      setStats({
        totalSecrets,
        activeSecrets,
        rotationsDue,
        mcpSessions,
        secretsAccessed24h,
        averageResponseTime: avgResponseTime,
      });

      // Map recent secrets
      setRecentSecrets(
        (secrets || []).slice(0, 4).map(s => ({
          name: s.name,
          environment: s.environment || 'production',
          status: s.status || 'active',
          lastRotated: s.last_rotated
            ? new Date(s.last_rotated).toLocaleDateString()
            : 'Never',
          usage: s.usage_count || 0,
        }))
      );

      // Fetch usage data for last 7 days from mcp_usage_logs
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const usageDataPoints: UsageDataPoint[] = [];

      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const { count: mcpCount } = await supabase
          .from('mcp_usage_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('timestamp', dayStart.toISOString())
          .lte('timestamp', dayEnd.toISOString());

        const { count: secretsCount } = await supabase
          .from('usage_metrics')
          .select('*', { count: 'exact', head: true })
          .eq('operation', 'access')
          .gte('timestamp', dayStart.toISOString())
          .lte('timestamp', dayEnd.toISOString());

        usageDataPoints.push({
          name: dayNames[dayStart.getDay()],
          secrets: secretsCount || 0,
          mcp: mcpCount || 0,
        });
      }
      setUsageData(usageDataPoints);

      // Map active sessions from enabled services with real data
      const serviceSessions: MCPSession[] = (userServices || []).slice(0, 3).map((s) => {
        // Determine risk level based on service type
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (['stripe', 'payment'].some(k => s.service_key.includes(k))) {
          riskLevel = 'high';
        } else if (['database', 'github'].some(k => s.service_key.includes(k))) {
          riskLevel = 'medium';
        }

        return {
          toolName: s.service_key.charAt(0).toUpperCase() + s.service_key.slice(1) + ' Service',
          secretsAccessed: [s.service_key + '_api_key'],
          timeRemaining: 'Active', // Sessions are persistent, not time-limited
          riskLevel,
        };
      });
      setActiveSessions(serviceSessions);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    usageData,
    recentSecrets,
    activeSessions,
    loading,
    error,
    refresh: fetchDashboardData,
  };
}

export default useDashboard;
