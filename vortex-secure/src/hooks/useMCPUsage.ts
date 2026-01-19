// Hook for MCP usage analytics with real Supabase data
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { MCPUsageLog } from '../types/mcp-router';

interface DailyData {
  date: string;
  fullDate: string;
  total: number;
  success: number;
  failed: number;
  avgResponseTime: number;
}

interface ServiceBreakdown {
  name: string;
  calls: number;
  color: string;
}

interface TopAction {
  service: string;
  action: string;
  count: number;
}

interface UseMCPUsageReturn {
  dailyData: DailyData[];
  serviceBreakdown: ServiceBreakdown[];
  recentLogs: MCPUsageLog[];
  topActions: TopAction[];
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  avgResponseTime: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SERVICE_COLORS: Record<string, string> = {
  stripe: '#4F46E5',
  github: '#10B981',
  openai: '#8B5CF6',
  slack: '#F59E0B',
  notion: '#EC4899',
  perplexity: '#06B6D4',
};

export function useMCPUsage(dateRange: string = '30d'): UseMCPUsageReturn {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceBreakdown[]>([]);
  const [recentLogs, setRecentLogs] = useState<MCPUsageLog[]>([]);
  const [topActions, setTopActions] = useState<TopAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = parseInt(dateRange) || 30;

  const fetchUsageData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch usage logs
      const { data: logs, error: logsError } = await supabase
        .from('mcp_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (logsError) throw new Error(logsError.message);

      // Process logs into daily data
      const dailyMap = new Map<string, DailyData>();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        dailyMap.set(dateKey, {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: date.toISOString(),
          total: 0,
          success: 0,
          failed: 0,
          avgResponseTime: 0,
        });
      }

      const serviceCount = new Map<string, number>();
      const actionCount = new Map<string, { service: string; action: string; count: number }>();

      for (const log of logs || []) {
        const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
        const daily = dailyMap.get(dateKey);

        if (daily) {
          daily.total++;
          if (log.status === 'success') {
            daily.success++;
          } else {
            daily.failed++;
          }
          if (log.response_time_ms) {
            daily.avgResponseTime =
              (daily.avgResponseTime * (daily.total - 1) + log.response_time_ms) / daily.total;
          }
        }

        // Count by service
        const service = log.service_key || 'unknown';
        serviceCount.set(service, (serviceCount.get(service) || 0) + 1);

        // Count by action
        const actionKey = `${service}:${log.action || 'unknown'}`;
        if (!actionCount.has(actionKey)) {
          actionCount.set(actionKey, { service, action: log.action || 'unknown', count: 0 });
        }
        actionCount.get(actionKey)!.count++;
      }

      setDailyData(Array.from(dailyMap.values()));

      // Service breakdown
      const breakdown: ServiceBreakdown[] = Array.from(serviceCount.entries())
        .map(([name, calls]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          calls,
          color: SERVICE_COLORS[name] || '#6B7280',
        }))
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 5);
      setServiceBreakdown(breakdown);

      // Top actions
      const actions = Array.from(actionCount.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopActions(actions);

      // Recent logs
      setRecentLogs(
        (logs || []).slice(0, 10).map(log => ({
          id: log.id,
          request_id: log.request_id,
          user_id: log.user_id,
          api_key_id: log.api_key_id,
          service_key: log.service_key,
          action: log.action,
          method: log.method,
          response_status: log.response_status,
          response_time_ms: log.response_time_ms,
          mcp_spawn_time_ms: log.mcp_spawn_time_ms,
          external_api_time_ms: log.external_api_time_ms,
          error_message: log.error_message,
          error_code: log.error_code,
          client_ip: log.client_ip,
          status: log.status,
          billable: log.billable,
          billing_amount_cents: log.billing_amount_cents,
          timestamp: log.timestamp,
        }))
      );

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  const totalCalls = dailyData.reduce((sum, d) => sum + d.total, 0);
  const successCalls = dailyData.reduce((sum, d) => sum + d.success, 0);
  const failedCalls = dailyData.reduce((sum, d) => sum + d.failed, 0);
  const avgResponseTime = dailyData.length
    ? Math.round(dailyData.reduce((sum, d) => sum + d.avgResponseTime, 0) / dailyData.length)
    : 0;

  return {
    dailyData,
    serviceBreakdown,
    recentLogs,
    topActions,
    totalCalls,
    successCalls,
    failedCalls,
    avgResponseTime,
    loading,
    error,
    refresh: fetchUsageData,
  };
}

export default useMCPUsage;
