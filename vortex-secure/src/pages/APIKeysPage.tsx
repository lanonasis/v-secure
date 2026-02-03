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

  if (loading) {
    return (
      <div className="space-y-6 p-6">
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

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-1">Manage API keys for service access</p>
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
              <Button variant="ghost" size="sm" onClick={() => setNewlyCreatedKey(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className={`p-4 border rounded-lg ${key.is_active ? 'bg-white' : 'bg-gray-50 opacity-75'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-gray-900">{key.name}</h3>
                      <Badge variant={key.is_active ? "default" : "secondary"}>
                        {key.is_active ? 'Active' : 'Revoked'}
                      </Badge>
                      <Badge variant="outline">{key.scope_type === 'all' ? 'All Services' : 'Specific Services'}</Badge>
                    </div>
                    {key.description && <p className="text-sm text-gray-600 mt-1">{key.description}</p>}
                    <div className="mt-3 flex items-center space-x-2">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">{key.key_prefix}...</code>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(key.key_prefix, key.id)}>
                        {copiedKeyId === key.id ? <CheckCircle className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Rate Limit:</span>
                        <p className="font-medium">{key.rate_limit_per_minute}/min</p>
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
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => setSelectedKey(key)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                    {key.is_active ? (
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleRevokeKey(key.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleReactivateKey(key.id)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {apiKeys.length === 0 && (
              <div className="text-center py-12">
                <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No API keys</h3>
                <p className="text-gray-600 mb-4">Create your first API key to get started</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create API Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Name" onChange={(e) => setSelectedKey({ ...selectedKey, name: e.target.value } as any)} />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button onClick={async () => {
                  await createAPIKey({ name: selectedKey?.name || 'New Key', scope_type: 'all' });
                  setShowCreateModal(false);
                }}>Create</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default APIKeysPage;