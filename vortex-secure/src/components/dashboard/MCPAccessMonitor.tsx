// Vortex Secure - MCP Access Monitoring Dashboard
// Real-time monitoring of AI agent and MCP tool secret access

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Clock, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bot,
  Cpu,
  Activity,
  Users,
  Timer,
  Database
} from "lucide-react";
import { supabase } from "../../lib/supabase";

interface MCPSession {
  session_id: string;
  tool_id: string;
  tool_name: string;
  secret_names: string[];
  expires_at: string;
  created_at: string;
  justification: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'expired' | 'revoked';
}

interface MCPAccessEvent {
  id: string;
  event_type: string;
  tool_id: string;
  tool_name: string;
  timestamp: string;
  metadata: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
}

interface MCPStats {
  totalActiveSessions: number;
  totalTools: number;
  secretsAccessed24h: number;
  averageSessionDuration: number;
  riskDistribution: Record<string, number>;
}

export function MCPAccessMonitor() {
  const [activeSessions, setActiveSessions] = useState<MCPSession[]>([]);
  const [recentEvents, setRecentEvents] = useState<MCPAccessEvent[]>([]);
  const [stats, setStats] = useState<MCPStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
    // Set up real-time subscriptions
    const sessionsSubscription = supabase
      .channel('mcp_sessions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'mcp_active_sessions' },
        () => loadActiveSessions()
      )
      .subscribe();

    const eventsSubscription = supabase
      .channel('mcp_events')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mcp_audit_log' },
        (payload) => {
          setRecentEvents(prev => [payload.new as MCPAccessEvent, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);

    return () => {
      sessionsSubscription.unsubscribe();
      eventsSubscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadActiveSessions(),
        loadRecentEvents(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Failed to load MCP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSessions = async () => {
    const { data, error } = await supabase
      .from('mcp_active_sessions')
      .select(`
        *,
        mcp_tools (
          tool_name,
          risk_level
        ),
        mcp_access_requests (
          justification
        )
      `)
      .gt('expires_at', new Date().toISOString())
      .is('ended_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const sessions = data.map(item => ({
      session_id: item.session_id,
      tool_id: item.tool_id,
      tool_name: item.mcp_tools?.tool_name || 'Unknown Tool',
      secret_names: item.secret_names,
      expires_at: item.expires_at,
      created_at: item.created_at,
      justification: item.mcp_access_requests?.justification || '',
      risk_level: item.mcp_tools?.risk_level || 'medium',
      status: new Date(item.expires_at) < new Date() ? 'expired' : 'active'
    }));

    setActiveSessions(sessions);
  };

  const loadRecentEvents = async () => {
    const { data, error } = await supabase
      .from('mcp_audit_log')
      .select(`
        *,
        mcp_tools (tool_name)
      `)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;

    const events = data.map(item => ({
      id: item.id,
      event_type: item.event_type,
      tool_id: item.tool_id,
      tool_name: item.mcp_tools?.tool_name || 'Unknown Tool',
      timestamp: item.timestamp,
      metadata: item.metadata || {},
      severity: getSeverityFromEventType(item.event_type)
    }));

    setRecentEvents(events);
  };

  const loadStats = async () => {
    // This would typically be a single API call or database view
    // For now, we'll calculate from the data we have
    const activeSessions = await getActiveSessionCount();
    const totalTools = await getTotalToolCount();
    const secretsAccessed24h = await getSecretsAccessedCount();
    const averageSessionDuration = await getAverageSessionDuration();
    const riskDistribution = await getRiskDistribution();

    setStats({
      totalActiveSessions: activeSessions,
      totalTools,
      secretsAccessed24h,
      averageSessionDuration,
      riskDistribution
    });
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('mcp_active_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('session_id', sessionId);

      if (error) throw error;

      // Also revoke all tokens for this session
      await supabase
        .from('mcp_proxy_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('session_id', sessionId);

      // Refresh data
      await loadActiveSessions();
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalActiveSessions}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Registered Tools</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalTools}</p>
                </div>
                <Bot className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Secrets Accessed (24h)</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.secretsAccessed24h}</p>
                </div>
                <Database className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Session Duration</p>
                  <p className="text-3xl font-bold text-orange-600">{Math.round(stats.averageSessionDuration / 60)}m</p>
                </div>
                <Timer className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Active MCP Sessions
              </CardTitle>
              <Badge variant="secondary">{activeSessions.length} active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active MCP sessions</p>
              </div>
            ) : (
              activeSessions.map((session) => (
                <div
                  key={session.session_id}
                  className={`p-4 border rounded-lg transition-colors ${
                    selectedSession === session.session_id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedSession(
                    selectedSession === session.session_id ? null : session.session_id
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{session.tool_name}</h3>
                        <Badge className={`text-xs ${getRiskColor(session.risk_level)}`}>
                          {session.risk_level}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Secrets:</strong> {session.secret_names.join(', ')}</p>
                        <p><strong>Justification:</strong> {session.justification || 'No justification provided'}</p>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeRemaining(session.expires_at)} remaining
                        </span>
                        <span>Started {new Date(session.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSession(session.session_id);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          revokeSession(session.session_id);
                        }}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                  
                  {selectedSession === session.session_id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Session ID:</strong>
                          <div className="font-mono text-xs bg-gray-100 p-1 rounded mt-1">
                            {session.session_id}
                          </div>
                        </div>
                        <div>
                          <strong>Tool ID:</strong>
                          <div className="font-mono text-xs bg-gray-100 p-1 rounded mt-1">
                            {session.tool_id}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent MCP Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                recentEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getSeverityIcon(event.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {event.tool_name}
                        </p>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 capitalize">
                        {event.event_type.replace(/_/g, ' ')}
                      </p>
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {Object.entries(event.metadata).slice(0, 2).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              {key}: {String(value).substring(0, 20)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Risk Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(stats.riskDistribution).map(([level, count]) => (
                <div key={level} className="text-center">
                  <div className={`p-4 rounded-lg ${getRiskColor(level)}`}>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm capitalize">{level} Risk</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper functions
function getSeverityFromEventType(eventType: string): 'info' | 'warning' | 'error' {
  if (eventType.includes('failed') || eventType.includes('denied') || eventType.includes('error')) {
    return 'error';
  }
  if (eventType.includes('expired') || eventType.includes('revoked')) {
    return 'warning';
  }
  return 'info';
}

async function getActiveSessionCount(): Promise<number> {
  const { count } = await supabase
    .from('mcp_active_sessions')
    .select('*', { count: 'exact', head: true })
    .gt('expires_at', new Date().toISOString())
    .is('ended_at', null);
  
  return count || 0;
}

async function getTotalToolCount(): Promise<number> {
  const { count } = await supabase
    .from('mcp_tools')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  return count || 0;
}

async function getSecretsAccessedCount(): Promise<number> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { count } = await supabase
    .from('mcp_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'secret_accessed')
    .gt('timestamp', yesterday);
  
  return count || 0;
}

async function getAverageSessionDuration(): Promise<number> {
  // This would be calculated from ended sessions
  // For now, return a mock value
  return 420; // 7 minutes in seconds
}

async function getRiskDistribution(): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('mcp_tools')
    .select('risk_level')
    .eq('status', 'active');

  const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
  data?.forEach(tool => {
    if (tool.risk_level in distribution) {
      distribution[tool.risk_level as keyof typeof distribution]++;
    }
  });

  return distribution;
}