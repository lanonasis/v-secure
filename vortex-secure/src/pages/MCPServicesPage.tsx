// MCP Router - Service Catalog Page
// Zapier-like interface for managing external API integrations

import React, { useState } from 'react';
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
import { useMCPServices } from '../hooks/useMCPServices';

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


export function MCPServicesPage() {
  const {
    catalogServices,
    userServices,
    stats,
    loading,
    error,
    configureService: saveServiceConfig,
    toggleService,
    deleteService,
    testConnection,
    refresh,
  } = useMCPServices();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [showBeta, setShowBeta] = useState(true);
  const [configureService, setConfigureService] = useState<MCPServiceCatalog | null>(null);

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

  // Get user service for a catalog service
  const getUserService = (serviceKey: string) => {
    return userServices.find(s => s.service_key === serviceKey);
  };

  // Handle enable/disable toggle
  const handleToggle = async (serviceKey: string, enabled: boolean) => {
    try {
      await toggleService(serviceKey, enabled);
    } catch (err: any) {
      alert(`Failed to toggle service: ${err.message}`);
    }
  };

  // Handle delete
  const handleDelete = async (serviceKey: string) => {
    if (confirm('Are you sure you want to remove this service configuration?')) {
      try {
        await deleteService(serviceKey);
      } catch (err: any) {
        alert(`Failed to delete service: ${err.message}`);
      }
    }
  };

  // Handle test connection
  const handleTestConnection = async (serviceKey: string) => {
    try {
      const result = await testConnection(serviceKey);
      alert(result.success ? 'Connection successful!' : `Connection failed: ${result.message}`);
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    }
  };

  // Handle save configuration
  const handleSaveConfiguration = async (serviceKey: string, credentials: Record<string, string>) => {
    try {
      await saveServiceConfig(serviceKey, credentials);
      setConfigureService(null);
    } catch (err: any) {
      alert(`Failed to save configuration: ${err.message}`);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">MCP Services</h1>
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
            <h1 className="text-3xl font-bold text-gray-900">MCP Services</h1>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-medium text-red-900">Error loading services</h3>
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
