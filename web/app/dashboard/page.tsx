'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Key,
  Activity,
  Settings,
  Database,
  BarChart,
  Lock,
  Network,
  LogOut,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { getCurrentUser, signOut, isSupabaseConfigured } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then((user) => {
        if (!user) {
          router.push('/login?redirect=/dashboard');
          return;
        }
        setUser(user);
        setLoading(false);
      })
      .catch(() => {
        router.push('/login?redirect=/dashboard');
      });
  }, [router, isConfigured]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-vortex-cyan border-t-transparent mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Demo mode when Supabase is not configured
  if (!isConfigured || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <DashboardDemo />
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Secrets Manager',
      description: 'Store and manage encrypted secrets',
      icon: <Lock className="w-6 h-6" />,
      href: '/dashboard/secrets',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      title: 'API Keys',
      description: 'Generate and rotate API keys',
      icon: <Key className="w-6 h-6" />,
      href: '/dashboard/api-keys',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'MCP Services',
      description: 'Configure AI tool integrations',
      icon: <Network className="w-6 h-6" />,
      href: '/dashboard/mcp-services',
      color: 'from-cyan-500 to-teal-500',
    },
    {
      title: 'Analytics',
      description: 'View usage and security metrics',
      icon: <BarChart className="w-6 h-6" />,
      href: '/dashboard/analytics',
      color: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-vortex-cyan" />
              <span className="text-xl font-bold text-white">VortexShield</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
          </h1>
          <p className="text-gray-400">
            Manage your secrets, API keys, and security infrastructure from one place.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Secrets', value: '24', icon: <Lock className="w-5 h-5" />, trend: '+3 this week' },
            { label: 'API Keys', value: '12', icon: <Key className="w-5 h-5" />, trend: '2 expiring soon' },
            { label: 'MCP Requests', value: '1.2K', icon: <Activity className="w-5 h-5" />, trend: 'Last 24 hours' },
            { label: 'Security Score', value: '94%', icon: <Shield className="w-5 h-5" />, trend: 'Excellent' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">{stat.label}</span>
                <span className="text-vortex-cyan">{stat.icon}</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.trend}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="group bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:bg-slate-800 transition"
            >
              <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${action.color} mb-4`}>
                {action.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                {action.title}
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition" />
              </h3>
              <p className="text-sm text-gray-400">{action.description}</p>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-700">
            {[
              { action: 'Secret accessed', target: 'STRIPE_API_KEY', time: '2 minutes ago', type: 'access' },
              { action: 'API key rotated', target: 'prod-api-key-001', time: '1 hour ago', type: 'rotate' },
              { action: 'New secret created', target: 'DATABASE_URL', time: '3 hours ago', type: 'create' },
              { action: 'MCP session started', target: 'claude-code-assistant', time: '5 hours ago', type: 'mcp' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/50 transition">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'access' ? 'bg-blue-500/20 text-blue-400' :
                    activity.type === 'rotate' ? 'bg-purple-500/20 text-purple-400' :
                    activity.type === 'create' ? 'bg-green-500/20 text-green-400' :
                    'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {activity.type === 'access' ? <Database className="w-4 h-4" /> :
                     activity.type === 'rotate' ? <Key className="w-4 h-4" /> :
                     activity.type === 'create' ? <Lock className="w-4 h-4" /> :
                     <Network className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-white">{activity.action}</p>
                    <p className="text-sm text-gray-400">{activity.target}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// Demo Dashboard Component
function DashboardDemo() {
  return (
    <>
      {/* Demo Banner */}
      <div className="bg-amber-500/20 border-b border-amber-500/50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-amber-200 text-sm">
            <strong>Demo Mode:</strong> This is a preview of the VortexShield dashboard.
            Sign up to access your own secure environment.
          </p>
          <Link
            href="/signup"
            className="px-4 py-1.5 bg-amber-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-400 transition"
          >
            Start Free Trial
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-vortex-cyan" />
              <span className="text-xl font-bold text-white">VortexShield</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-gradient-to-r from-vortex-blue to-vortex-cyan text-white rounded-lg text-sm font-medium hover:shadow-lg transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Demo Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Your Security Command Center
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Get a glimpse of the powerful features available in VortexShield.
            Sign up today to secure your infrastructure.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Secrets Manager',
              description: 'AES-256 encrypted storage with version control and automatic rotation',
              icon: <Lock className="w-8 h-8" />,
            },
            {
              title: 'API Key Management',
              description: 'Create, rotate, and monitor API keys with granular permissions',
              icon: <Key className="w-8 h-8" />,
            },
            {
              title: 'MCP Integration',
              description: 'Secure AI tool access with approval workflows and audit trails',
              icon: <Network className="w-8 h-8" />,
            },
            {
              title: 'Real-time Analytics',
              description: 'Monitor usage patterns and detect anomalies in real-time',
              icon: <BarChart className="w-8 h-8" />,
            },
            {
              title: 'Compliance Dashboard',
              description: 'SOC 2, ISO 27001, and GDPR compliance monitoring',
              icon: <Shield className="w-8 h-8" />,
            },
            {
              title: 'Team Settings',
              description: 'Role-based access control and team management',
              icon: <Settings className="w-8 h-8" />,
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 opacity-80 hover:opacity-100 transition"
            >
              <div className="text-vortex-cyan mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-vortex-blue to-vortex-cyan text-white rounded-lg font-semibold text-lg hover:shadow-xl transition"
          >
            Start Your Free Trial
            <ExternalLink className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-gray-500 text-sm">No credit card required. 14-day free trial.</p>
        </div>
      </main>
    </>
  );
}
