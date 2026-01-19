// MCP Router - API Keys Management Page
// Manage API keys with service scoping

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Key,
  Copy,
  Trash2,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import type { APIKey, ScopeType } from '../types/mcp-router';
import { useAPIKeys } from '../hooks/useAPIKeys';
import { useMCPServices } from '../hooks/useMCPServices';

export function APIKeysPage() {
  const {
    apiKeys,
    stats,
    loading,
    error,
    createAPIKey,
    revokeAPIKey,
    reactivateAPIKey,
    deleteAPIKey,
    updateAPIKey,
    refresh,
  } = useAPIKeys();
  const { userServices } = useMCPServices();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ key: APIKey; fullKey: string } | null>(null);

  // Get configured services for the create modal
  const configuredServices = userServices.map(s => ({
    service_key: s.service_key,
    display_name: s.service?.display_name || s.service_key,
    is_enabled: s.is_enabled,
  }));

  const formatDate = (date?: string) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const formatRelativeTime = (date?: string) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} mins ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
    return d.toLocaleDateString();
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }
    try {
      await revokeAPIKey(keyId, 'Manually revoked');
    } catch (err: any) {
      alert(`Failed to revoke key: ${err.message}`);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to permanently delete this API key?')) {
      return;
    }
    try {
      await deleteAPIKey(keyId);
    } catch (err: any) {
      alert(`Failed to delete key: ${err.message}`);
    }
  };

  const handleReactivateKey = async (keyId: string) => {
    try {
      await reactivateAPIKey(keyId);
    } catch (err: any) {
      alert(`Failed to reactivate key: ${err.message}`);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
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
            <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-medium text-red-900">Error loading API keys</h3>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-1">
            Manage your LanOnasis API keys for external applications
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => window.open('/docs/api-keys', '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Documentation
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Keys</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <Key className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revoked</p>
                <p className="text-3xl font-bold text-red-600">{stats.revoked}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.expiringSoon}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Newly Created Key Alert */}
      {newlyCreatedKey && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900">API Key Created Successfully!</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Make sure to copy your API key now. You won't be able to see it again!
                  </p>
                  <div className="mt-3 flex items-center space-x-2">
                    <code className="px-3 py-2 bg-white rounded border text-sm font-mono">
                      {newlyCreatedKey.fullKey}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(newlyCreatedKey.fullKey, 'new')}
                    >
                      {copiedKeyId === 'new' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewlyCreatedKey(null)}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className={`p-4 border rounded-lg ${
                  key.is_active ? 'bg-white' : 'bg-gray-50 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-gray-900">{key.name}</h3>
                      {key.is_active ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          Revoked
                        </Badge>
                      )}
                      {key.scope_type === 'all' ? (
                        <Badge variant="outline">All Services</Badge>
                      ) : (
                        <Badge variant="outline">
                          {key.scopes?.length || 0} Service{(key.scopes?.length || 0) !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    {key.description && (
                      <p className="text-sm text-gray-600 mt-1">{key.description}</p>
                    )}

                    <div className="mt-3 flex items-center space-x-2">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                        {key.key_prefix}...
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(key.key_prefix, key.id)}
                      >
                        {copiedKeyId === key.id ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    {/* Service Scopes */}
                    {key.scope_type === 'specific' && key.scopes && key.scopes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {key.scopes.map((scope) => (
                          <Badge
                            key={scope.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {scope.service?.display_name || scope.service_key}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Key Details */}
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Environments:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {key.allowed_environments.map((env) => (
                            <Badge key={env} variant="outline" className="text-xs">
                              {env}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Rate Limit:</span>
                        <p className="font-medium">
                          {key.rate_limit_per_minute}/min, {key.rate_limit_per_day.toLocaleString()}/day
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Used:</span>
                        <p className="font-medium">{formatRelativeTime(key.last_used_at)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <p className="font-medium">{formatRelativeTime(key.created_at)}</p>
                      </div>
                    </div>

                    {/* Revoked Info */}
                    {!key.is_active && key.revoked_at && (
                      <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-800">
                        <strong>Revoked:</strong> {formatDate(key.revoked_at)}
                        {key.revoked_reason && <span> - {key.revoked_reason}</span>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedKey(key)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    {key.is_active ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRevokeKey(key.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleReactivateKey(key.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {apiKeys.length === 0 && (
              <div className="text-center py-12">
                <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No API keys</h3>
                <p className="text-gray-600 mb-4">
                  Create your first API key to start using the MCP Router
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <CreateAPIKeyModal
          configuredServices={configuredServices}
          onClose={() => setShowCreateModal(false)}
          onCreate={async (request) => {
            try {
              const result = await createAPIKey(request);
              setNewlyCreatedKey(result);
              setShowCreateModal(false);
            } catch (err: any) {
              alert(`Failed to create API key: ${err.message}`);
            }
          }}
        />
      )}

      {/* Edit API Key Modal */}
      {selectedKey && (
        <EditAPIKeyModal
          apiKey={selectedKey}
          configuredServices={configuredServices}
          onClose={() => setSelectedKey(null)}
          onSave={async (updated) => {
            try {
              await updateAPIKey(updated.id, updated);
              setSelectedKey(null);
            } catch (err: any) {
              alert(`Failed to update API key: ${err.message}`);
            }
          }}
        />
      )}
    </div>
  );
}

// Create API Key Modal Component
function CreateAPIKeyModal({
  configuredServices,
  onClose,
  onCreate,
}: {
  configuredServices: { service_key: string; display_name: string; is_enabled: boolean }[];
  onClose: () => void;
  onCreate: (request: {
    name: string;
    description?: string;
    scope_type: ScopeType;
    service_keys?: string[];
    allowed_environments?: string[];
    rate_limit_per_minute?: number;
    rate_limit_per_day?: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopeType, setScopeType] = useState<ScopeType>('all');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [environments, setEnvironments] = useState<Set<string>>(new Set(['production']));
  const [rateLimitMinute, setRateLimitMinute] = useState(60);
  const [rateLimitDay, setRateLimitDay] = useState(10000);
  const [isCreating, setIsCreating] = useState(false);

  const enabledServices = configuredServices.filter(s => s.is_enabled);

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    if (scopeType === 'specific' && selectedServices.size === 0) {
      alert('Please select at least one service');
      return;
    }

    if (environments.size === 0) {
      alert('Please select at least one environment');
      return;
    }

    setIsCreating(true);

    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        scope_type: scopeType,
        service_keys: scopeType === 'specific' ? Array.from(selectedServices) : undefined,
        allowed_environments: Array.from(environments),
        rate_limit_per_minute: rateLimitMinute,
        rate_limit_per_day: rateLimitDay,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleService = (serviceKey: string) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceKey)) {
        next.delete(serviceKey);
      } else {
        next.add(serviceKey);
      }
      return next;
    });
  };

  const toggleEnvironment = (env: string) => {
    setEnvironments(prev => {
      const next = new Set(prev);
      if (next.has(env)) {
        next.delete(env);
      } else {
        next.add(env);
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create API Key</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production App Key"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          {/* Scope Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Access
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={scopeType === 'all'}
                  onChange={() => setScopeType('all')}
                  className="h-4 w-4"
                />
                <div>
                  <span className="font-medium">All Enabled Services</span>
                  <p className="text-sm text-gray-500">Access all services you've configured</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  checked={scopeType === 'specific'}
                  onChange={() => setScopeType('specific')}
                  className="h-4 w-4"
                />
                <div>
                  <span className="font-medium">Specific Services</span>
                  <p className="text-sm text-gray-500">Choose which services this key can access</p>
                </div>
              </label>
            </div>
          </div>

          {/* Service Selection */}
          {scopeType === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Services
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                {enabledServices.map((service) => (
                  <label
                    key={service.service_key}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.has(service.service_key)}
                      onChange={() => toggleService(service.service_key)}
                      className="h-4 w-4 rounded"
                    />
                    <span>{service.display_name}</span>
                  </label>
                ))}
                {enabledServices.length === 0 && (
                  <p className="text-sm text-gray-500 p-2">
                    No services configured. Go to MCP Services to set them up.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Environments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed Environments
            </label>
            <div className="flex flex-wrap gap-2">
              {['production', 'staging', 'development'].map((env) => (
                <label
                  key={env}
                  className={`flex items-center space-x-2 px-3 py-2 border rounded-lg cursor-pointer ${
                    environments.has(env)
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={environments.has(env)}
                    onChange={() => toggleEnvironment(env)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="capitalize">{env}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Rate Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate Limit (per minute)
              </label>
              <Input
                type="number"
                value={rateLimitMinute}
                onChange={(e) => setRateLimitMinute(Number(e.target.value))}
                min={1}
                max={1000}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate Limit (per day)
              </label>
              <Input
                type="number"
                value={rateLimitDay}
                onChange={(e) => setRateLimitDay(Number(e.target.value))}
                min={1}
                max={1000000}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create API Key'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Edit API Key Modal Component (simplified)
function EditAPIKeyModal({
  apiKey,
  configuredServices,
  onClose,
  onSave,
}: {
  apiKey: APIKey;
  configuredServices: { service_key: string; display_name: string; is_enabled: boolean }[];
  onClose: () => void;
  onSave: (updated: APIKey) => void;
}) {
  const [name, setName] = useState(apiKey.name);
  const [description, setDescription] = useState(apiKey.description || '');
  const [rateLimitMinute, setRateLimitMinute] = useState(apiKey.rate_limit_per_minute);
  const [rateLimitDay, setRateLimitDay] = useState(apiKey.rate_limit_per_day);

  const handleSave = () => {
    onSave({
      ...apiKey,
      name: name.trim(),
      description: description.trim() || undefined,
      rate_limit_per_minute: rateLimitMinute,
      rate_limit_per_day: rateLimitDay,
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Edit API Key</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate Limit (per minute)
              </label>
              <Input
                type="number"
                value={rateLimitMinute}
                onChange={(e) => setRateLimitMinute(Number(e.target.value))}
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate Limit (per day)
              </label>
              <Input
                type="number"
                value={rateLimitDay}
                onChange={(e) => setRateLimitDay(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

export default APIKeysPage;
