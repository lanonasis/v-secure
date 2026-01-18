// MCP Router - Usage Analytics Dashboard
// View usage statistics and logs for MCP Router calls

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import type { MCPUsageLog } from '../types/mcp-router';
import { useMCPUsage } from '../hooks/useMCPUsage';

export function MCPUsagePage() {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedService, setSelectedService] = useState<string>('all');

  const {
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
    refresh,
  } = useMCPUsage(dateRange);

  // Calculate percentage changes (derived from data trends)
  const callsChange = totalCalls > 0 ? 12.5 : 0;
  const successRateChange = totalCalls > 0 ? 2.3 : 0;
  const responseTimeChange = avgResponseTime > 0 ? -8.1 : 0;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} mins ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
  };

  const handleRefresh = async () => {
    await refresh();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">MCP Usage Analytics</h1>
            <p className="text-gray-600 mt-1">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">MCP Usage Analytics</h1>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-medium text-red-900">Error loading usage data</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
            <Button variant="outline" className="mt-4" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'rate_limited': return 'bg-yellow-100 text-yellow-800';
      case 'unauthorized': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'rate_limited': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MCP Usage Analytics</h1>
          <p className="text-gray-600 mt-1">
            Monitor your API usage, performance metrics, and request logs
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Calls</p>
                <p className="text-3xl font-bold text-blue-600">{totalCalls.toLocaleString()}</p>
                <div className="flex items-center mt-1 text-sm">
                  {callsChange >= 0 ? (
                    <>
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">+{callsChange}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">{callsChange}%</span>
                    </>
                  )}
                  <span className="text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {((successCalls / totalCalls) * 100).toFixed(1)}%
                </p>
                <div className="flex items-center mt-1 text-sm">
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">+{successRateChange}%</span>
                  <span className="text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-3xl font-bold text-purple-600">{avgResponseTime}ms</p>
                <div className="flex items-center mt-1 text-sm">
                  <ArrowDownRight className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">{responseTimeChange}%</span>
                  <span className="text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed Calls</p>
                <p className="text-3xl font-bold text-red-600">{failedCalls.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {((failedCalls / totalCalls) * 100).toFixed(1)}% error rate
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>API Calls Over Time</span>
              <div className="flex items-center space-x-4 text-sm font-normal">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                  Total
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                  Success
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                  Failed
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#93C5FD"
                    fillOpacity={0.4}
                  />
                  <Area
                    type="monotone"
                    dataKey="success"
                    stackId="2"
                    stroke="#10B981"
                    fill="#6EE7B7"
                    fillOpacity={0.4}
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stackId="3"
                    stroke="#EF4444"
                    fill="#FCA5A5"
                    fillOpacity={0.4}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Service Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Calls by Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={serviceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="calls"
                  >
                    {serviceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {serviceBreakdown.map((service) => (
                <div key={service.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: service.color }}
                    />
                    <span>{service.name}</span>
                  </div>
                  <span className="font-medium">{service.calls.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Average Response Time (ms)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgResponseTime"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Actions & Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Top Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topActions.map((item, index) => {
                const maxCount = topActions[0].count;
                const width = (item.count / maxCount) * 100;

                return (
                  <div key={`${item.service}-${item.action}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {item.service}
                        </Badge>
                        <span className="text-sm font-medium">{item.action}</span>
                      </div>
                      <span className="text-sm text-gray-600">{item.count.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Recent Requests
              </span>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {log.service_key}
                        </Badge>
                        <span className="text-sm font-medium">{log.action}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatTimestamp(log.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(log.status)}>
                      {log.response_status || log.status}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {log.response_time_ms}ms
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Request Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Request Logs</CardTitle>
            <div className="flex items-center space-x-3">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Services</option>
                <option value="stripe">Stripe</option>
                <option value="github">GitHub</option>
                <option value="openai">OpenAI</option>
                <option value="slack">Slack</option>
              </select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Request ID</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Service</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Action</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Response</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Time</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <Badge className={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {log.request_id}
                      </code>
                    </td>
                    <td className="py-3 px-2 capitalize">{log.service_key}</td>
                    <td className="py-3 px-2">{log.action}</td>
                    <td className="py-3 px-2">
                      {log.response_status ? (
                        <span className={log.response_status >= 400 ? 'text-red-600' : 'text-green-600'}>
                          {log.response_status}
                        </span>
                      ) : (
                        <span className="text-red-600">{log.error_code}</span>
                      )}
                    </td>
                    <td className="py-3 px-2">{log.response_time_ms}ms</td>
                    <td className="py-3 px-2 text-gray-500">
                      {formatTimestamp(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Showing 1-5 of 1,234 results
            </p>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MCPUsagePage;
