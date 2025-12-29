// MCP Router - Service Catalog Page
// Zapier-like interface for managing external API integrations

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Settings,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  GitBranch,
  Brain,
  MessageSquare,
  Database,
  BarChart,
  Box,
  RefreshCw,
  Power,
  Trash2,
} from 'lucide-react';
import type {
  MCPServiceCatalog,
  UserMCPService,
  ServiceCategory,
} from '../types/mcp-router';
import { ServiceConfigureModal } from '../components/mcp-router/ServiceConfigureModal';

// Icon mapping for categories
const categoryIcons: Record<ServiceCategory, React.ReactNode> = {
  payment: <CreditCard className="h-5 w-5" />,
  devops: <GitBranch className="h-5 w-5" />,
  ai: <Brain className="h-5 w-5" />,
  communication: <MessageSquare className="h-5 w-5" />,
  storage: <Database className="h-5 w-5" />,
  analytics: <BarChart className="h-5 w-5" />,
  other: <Box className="h-5 w-5" />,
};

const categoryColors: Record<ServiceCategory, string> = {
  payment: 'bg-green-100 text-green-800',
  devops: 'bg-blue-100 text-blue-800',
  ai: 'bg-purple-100 text-purple-800',
  communication: 'bg-yellow-100 text-yellow-800',
  storage: 'bg-orange-100 text-orange-800',
  analytics: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

const categoryLabels: Record<ServiceCategory, string> = {
  payment: 'Payment',
  devops: 'DevOps',
  ai: 'AI',
  communication: 'Communication',
  storage: 'Storage',
  analytics: 'Analytics',
  other: 'Other',
};

// Mock data for demonstration
const mockCatalogServices: MCPServiceCatalog[] = [
  {
    id: '1',
    service_key: 'stripe',
    display_name: 'Stripe',
    description: 'Accept payments, manage subscriptions, and handle billing',
    icon: 'credit-card',
    category: 'payment',
    credential_fields: [
      { key: 'secret_key', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_live_...' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false, placeholder: 'whsec_...' },
    ],
    mcp_command: 'npx @stripe/mcp-server-stripe',
    mcp_args: [],
    mcp_env_mapping: { secret_key: 'STRIPE_SECRET_KEY' },
    documentation_url: 'https://stripe.com/docs/api',
    base_url: 'https://api.stripe.com',
    health_check_endpoint: '/v1/account',
    is_available: true,
    is_beta: false,
    requires_approval: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    service_key: 'github',
    display_name: 'GitHub',
    description: 'Manage repositories, issues, pull requests, and workflows',
    icon: 'github',
    category: 'devops',
    credential_fields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', required: true, placeholder: 'ghp_...' },
    ],
    mcp_command: 'npx @modelcontextprotocol/server-github',
    mcp_args: [],
    mcp_env_mapping: { token: 'GITHUB_TOKEN' },
    documentation_url: 'https://docs.github.com/en/rest',
    base_url: 'https://api.github.com',
    health_check_endpoint: '/user',
    is_available: true,
    is_beta: false,
    requires_approval: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    service_key: 'openai',
    display_name: 'OpenAI',
    description: 'Access GPT models, embeddings, DALL-E, and Whisper APIs',
    icon: 'brain',
    category: 'ai',
    credential_fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'sk-...' },
      { key: 'organization', label: 'Organization ID', type: 'text', required: false, placeholder: 'org-...' },
    ],
    mcp_command: 'npx openai-mcp-server',
    mcp_args: [],
    mcp_env_mapping: { api_key: 'OPENAI_API_KEY=REDACTED_OPENAI_API_KEY
    documentation_url: 'https://platform.openai.com/docs/api-reference',
    base_url: 'https://api.openai.com',
    health_check_endpoint: '/v1/models',
    is_available: true,
    is_beta: false,
    requires_approval: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    service_key: 'slack',
    display_name: 'Slack',
    description: 'Send messages and manage Slack workspaces',
    icon: 'message-square',
    category: 'communication',
    credential_fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', required: true, placeholder: 'xoxb-...' },
    ],
    mcp_command: 'npx @modelcontextprotocol/server-slack',
    mcp_args: [],
    mcp_env_mapping: { bot_token: 'SLACK_BOT_TOKEN' },
    documentation_url: 'https://api.slack.com/methods',
    base_url: 'https://slack.com/api',
    health_check_endpoint: '/auth.test',
    is_available: true,
    is_beta: false,
    requires_approval: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    service_key: 'perplexity',
    display_name: 'Perplexity',
    description: 'AI-powered search and research with real-time information',
    icon: 'search',
    category: 'ai',
    credential_fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'pplx-...' },
    ],
    mcp_command: 'npx perplexity-mcp-server',
    mcp_args: [],
    mcp_env_mapping: { api_key: 'PERPLEXITY_API_KEY' },
    documentation_url: 'https://docs.perplexity.ai/reference',
    base_url: 'https://api.perplexity.ai',
    health_check_endpoint: '/chat/completions',
    is_available: true,
    is_beta: true,
    requires_approval: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    service_key: 'notion',
    display_name: 'Notion',
    description: 'Manage Notion pages, databases, and workspaces',
    icon: 'file-text',
    category: 'other',
    credential_fields: [
      { key: 'api_key', label: 'Integration Token', type: 'password', required: true, placeholder: 'secret_...' },
    ],
    mcp_command: 'npx @modelcontextprotocol/server-notion',
    mcp_args: [],
    mcp_env_mapping: { api_key: 'NOTION_API_KEY' },
    documentation_url: 'https://developers.notion.com/reference',
    base_url: 'https://api.notion.com/v1',
    health_check_endpoint: '/users/me',
    is_available: true,
    is_beta: false,
    requires_approval: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockUserServices: UserMCPService[] = [
  {
    id: '1',
    user_id: 'user-1',
    service_key: 'stripe',
    encrypted_credentials: 'encrypted_data',
    encryption_version: 1,
    is_enabled: true,
    environment: 'production',
    last_used_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    total_calls: 156,
    successful_calls: 152,
    failed_calls: 4,
    health_status: 'healthy',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'user-1',
    service_key: 'github',
    encrypted_credentials: 'encrypted_data',
    encryption_version: 1,
    is_enabled: true,
    environment: 'production',
    last_used_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    total_calls: 89,
    successful_calls: 89,
    failed_calls: 0,
    health_status: 'healthy',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function MCPServicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [showBeta, setShowBeta] = useState(true);
  const [configureService, setConfigureService] = useState<MCPServiceCatalog | null>(null);
  const [catalogServices, setCatalogServices] = useState<MCPServiceCatalog[]>(mockCatalogServices);
  const [userServices, setUserServices] = useState<UserMCPService[]>(mockUserServices);

  // Get configured service keys
  const configuredServiceKeys = new Set(userServices.map(s => s.service_key));

  // Filter services
  const filteredServices = catalogServices.filter(service => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !service.display_name.toLowerCase().includes(search) &&
        !service.description?.toLowerCase().includes(search) &&
        !service.service_key.toLowerCase().includes(search)
      ) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== 'all' && service.category !== selectedCategory) {
      return false;
    }

    // Beta filter
    if (!showBeta && service.is_beta) {
      return false;
    }

    return true;
  });

  // Get stats
  const stats = {
    total: catalogServices.length,
    configured: userServices.length,
    enabled: userServices.filter(s => s.is_enabled).length,
    healthy: userServices.filter(s => s.health_status === 'healthy').length,
  };

  // Get user service for a catalog service
  const getUserService = (serviceKey: string) => {
    return userServices.find(s => s.service_key === serviceKey);
  };

  // Handle enable/disable toggle
  const handleToggle = async (serviceKey: string, enabled: boolean) => {
    setUserServices(prev =>
      prev.map(s =>
        s.service_key === serviceKey ? { ...s, is_enabled: enabled } : s
      )
    );
  };

  // Handle delete
  const handleDelete = async (serviceKey: string) => {
    if (confirm('Are you sure you want to remove this service configuration?')) {
      setUserServices(prev => prev.filter(s => s.service_key !== serviceKey));
    }
  };

  // Handle test connection
  const handleTestConnection = async (serviceKey: string) => {
    // In real implementation, would call API
    alert(`Testing connection to ${serviceKey}...`);
  };

  // Handle save configuration
  const handleSaveConfiguration = async (serviceKey: string, credentials: Record<string, string>) => {
    const existing = getUserService(serviceKey);
    if (existing) {
      // Update existing
      setUserServices(prev =>
        prev.map(s =>
          s.service_key === serviceKey
            ? { ...s, health_status: 'unknown', updated_at: new Date().toISOString() }
            : s
        )
      );
    } else {
      // Add new
      const newService: UserMCPService = {
        id: `new-${Date.now()}`,
        user_id: 'user-1',
        service_key: serviceKey,
        encrypted_credentials: 'encrypted_data',
        encryption_version: 1,
        is_enabled: true,
        environment: 'production',
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        health_status: 'unknown',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUserServices(prev => [...prev, newService]);
    }
    setConfigureService(null);
  };

  const formatLastUsed = (date?: string) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} mins ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MCP Services</h1>
          <p className="text-gray-600 mt-1">
            Configure external API services for your LanOnasis integration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => window.open('/docs/mcp-router', '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Documentation
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Services</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <Box className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Configured</p>
                <p className="text-3xl font-bold text-purple-600">{stats.configured}</p>
              </div>
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Enabled</p>
                <p className="text-3xl font-bold text-green-600">{stats.enabled}</p>
              </div>
              <Power className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Healthy</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.healthy}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ServiceCategory | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                <option value="payment">Payment</option>
                <option value="devops">DevOps</option>
                <option value="ai">AI</option>
                <option value="communication">Communication</option>
                <option value="storage">Storage</option>
                <option value="analytics">Analytics</option>
                <option value="other">Other</option>
              </select>

              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showBeta}
                  onChange={(e) => setShowBeta(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>Show Beta</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => {
          const userService = getUserService(service.service_key);
          const isConfigured = !!userService;
          const isEnabled = userService?.is_enabled ?? false;

          return (
            <Card key={service.id} className={`relative overflow-hidden ${isConfigured ? 'ring-2 ring-blue-500' : ''}`}>
              {service.is_beta && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    Beta
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${categoryColors[service.category].split(' ')[0]}`}>
                    {categoryIcons[service.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">{service.display_name}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {categoryLabels[service.category]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {service.description}
                </p>

                {isConfigured && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <div className="flex items-center space-x-1">
                        {userService?.health_status === 'healthy' && (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">Healthy</span>
                          </>
                        )}
                        {userService?.health_status === 'unhealthy' && (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-red-600">Unhealthy</span>
                          </>
                        )}
                        {userService?.health_status === 'unknown' && (
                          <>
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <span className="text-yellow-600">Unknown</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Calls</span>
                      <span className="font-medium">{userService?.total_calls.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Last Used</span>
                      <span className="font-medium">{formatLastUsed(userService?.last_used_at)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  {isConfigured ? (
                    <>
                      <Button
                        variant={isEnabled ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => handleToggle(service.service_key, !isEnabled)}
                      >
                        <Power className="h-4 w-4 mr-1" />
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfigureService(service)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(service.service_key)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(service.service_key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => setConfigureService(service)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  )}
                </div>

                {service.documentation_url && (
                  <a
                    href={service.documentation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Documentation
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredServices.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Box className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No services found</h3>
            <p className="text-gray-600">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}

      {/* Configure Modal */}
      {configureService && (
        <ServiceConfigureModal
          service={configureService}
          existingConfig={getUserService(configureService.service_key)}
          onClose={() => setConfigureService(null)}
          onSave={handleSaveConfiguration}
          onTest={handleTestConnection}
        />
      )}
    </div>
  );
}

export default MCPServicesPage;
