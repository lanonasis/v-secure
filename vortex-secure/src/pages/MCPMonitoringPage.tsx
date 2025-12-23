// Vortex Secure - MCP Monitoring Page
import React from 'react';
import { MCPAccessMonitor } from '../components/dashboard/MCPAccessMonitor';

export function MCPMonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">MCP Monitoring</h1>
        <p className="text-gray-600 mt-1">Monitor AI agent access and MCP tool activity</p>
      </div>
      
      <MCPAccessMonitor />
    </div>
  );
}