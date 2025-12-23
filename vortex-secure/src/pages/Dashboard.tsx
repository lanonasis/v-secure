// Vortex Secure - Main Dashboard Page
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Key, 
  Bot, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Database,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Mock data for demo
const mockUsageData = [
  { name: 'Mon', secrets: 45, mcp: 12 },
  { name: 'Tue', secrets: 52, mcp: 18 },
  { name: 'Wed', secrets: 61, mcp: 23 },
  { name: 'Thu', secrets: 58, mcp: 19 },
  { name: 'Fri', secrets: 73, mcp: 31 },
  { name: 'Sat', secrets: 45, mcp: 15 },
  { name: 'Sun', secrets: 38, mcp: 8 }
];

const mockSecrets = [
  { name: 'stripe_api_key', environment: 'production', status: 'active', lastRotated: '2024-01-10', usage: 156 },
  { name: 'database_url', environment: 'production', status: 'rotation_due', lastRotated: '2023-12-15', usage: 243 },
  { name: 'openai_api_key', environment: 'staging', status: 'active', lastRotated: '2024-01-20', usage: 89 },
  { name: 'webhook_secret', environment: 'development', status: 'active', lastRotated: '2024-01-25', usage: 34 }
];

const mockMCPSessions = [
  { toolName: 'AI Payment Processor', secretsAccessed: ['stripe_api_key'], timeRemaining: '12m 34s', riskLevel: 'high' },
  { toolName: 'Database Manager', secretsAccessed: ['database_url'], timeRemaining: '4m 12s', riskLevel: 'medium' },
  { toolName: 'Content Generator', secretsAccessed: ['openai_api_key'], timeRemaining: '8m 45s', riskLevel: 'low' }
];

export function Dashboard() {
  const [stats, setStats] = useState({
    totalSecrets: 0,
    activeSecrets: 0,
    rotationsDue: 0,
    mcpSessions: 0,
    secretsAccessed24h: 0,
    averageResponseTime: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setStats({
        totalSecrets: 1247,
        activeSecrets: 1189,
        rotationsDue: 23,
        mcpSessions: 15,
        secretsAccessed24h: 3421,
        averageResponseTime: 145
      });
      setLoading(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'rotation_due': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to Vortex Secure Admin Portal</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            All Systems Operational
          </Badge>
          <Button onClick={loadDashboardData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Secrets</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalSecrets.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.activeSecrets} active
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rotations Due</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.rotationsDue}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Next 7 days
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active MCP Sessions</p>
                <p className="text-3xl font-bold text-green-600">{stats.mcpSessions}</p>
                <p className="text-xs text-gray-500 mt-1">
                  AI agents connected
                </p>
              </div>
              <Bot className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">24h Access Count</p>
                <p className="text-3xl font-bold text-purple-600">{stats.secretsAccessed24h.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg {stats.averageResponseTime}ms response
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Analytics Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Analytics (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="secrets" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Secret Access"
                />
                <Line 
                  type="monotone" 
                  dataKey="mcp" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="MCP Sessions"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Secrets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Secrets</CardTitle>
              <Button variant="outline" size="sm">
                <Key className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockSecrets.map((secret, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{secret.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {secret.environment}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      Last rotated: {secret.lastRotated} • {secret.usage} uses
                    </div>
                  </div>
                  <Badge className={`text-xs ${getStatusColor(secret.status)}`}>
                    {secret.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active MCP Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Active MCP Sessions
            </CardTitle>
            <Badge variant="secondary">{mockMCPSessions.length} active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockMCPSessions.map((session, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{session.toolName}</h3>
                    <Badge className={`text-xs ${getRiskColor(session.riskLevel)}`}>
                      {session.riskLevel} risk
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    Accessing: {session.secretsAccessed.join(', ')}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Time remaining: {session.timeRemaining}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Monitor
                  </Button>
                  <Button variant="destructive" size="sm">
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
            
            {mockMCPSessions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active MCP sessions</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Key className="h-8 w-8 mx-auto mb-3 text-blue-600" />
            <h3 className="font-medium mb-2">Create Secret</h3>
            <p className="text-sm text-gray-500">Add a new secret to the vault</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Bot className="h-8 w-8 mx-auto mb-3 text-green-600" />
            <h3 className="font-medium mb-2">Register MCP Tool</h3>
            <p className="text-sm text-gray-500">Add a new AI agent or MCP tool</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-3 text-purple-600" />
            <h3 className="font-medium mb-2">View Analytics</h3>
            <p className="text-sm text-gray-500">Detailed usage and security metrics</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}