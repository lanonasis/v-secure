// Vortex Secure - Admin Sidebar Navigation
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Shield, 
  LayoutDashboard, 
  Key, 
  Bot, 
  BarChart3, 
  Settings,
  Database,
  Users,
  Activity
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Secrets', href: '/secrets', icon: Key },
  { name: 'MCP Monitoring', href: '/mcp-monitoring', icon: Bot },
  { name: 'VPS Management', href: '/vps-management', icon: Database },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-gray-700">
        <div className="bg-blue-600 p-2 rounded-lg mr-3">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Vortex Secure</h1>
          <p className="text-xs text-gray-400">Admin Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon className="h-5 w-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* System Status */}
      <div className="px-6 py-4 border-t border-gray-700">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">System Status</span>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span className="text-xs text-gray-400">Healthy</span>
            </div>
          </div>
          <div className="space-y-1 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Active Secrets:</span>
              <span className="text-white">1,247</span>
            </div>
            <div className="flex justify-between">
              <span>MCP Sessions:</span>
              <span className="text-white">23</span>
            </div>
            <div className="flex justify-between">
              <span>Uptime:</span>
              <span className="text-green-400">99.9%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Badge */}
      <div className="px-6 py-2">
        <div className="bg-yellow-600 text-yellow-100 text-xs font-medium px-3 py-1 rounded-full text-center">
          🧪 Demo Environment
        </div>
      </div>
    </div>
  );
}