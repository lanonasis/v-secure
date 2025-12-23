// Vortex Secure - Secrets List Component

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Copy, 
  Edit, 
  Trash2, 
  Shield, 
  Clock,
  Search,
  Filter,
  Plus
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { VortexEncryption } from "../../lib/encryption";
import { RotationScheduler } from "../../lib/rotation";
import type { Secret } from "../../types/secrets";

interface SecretsListProps {
  projectId?: string;
  environment?: 'development' | 'staging' | 'production';
  onCreateSecret?: () => void;
}

export function SecretsList({ projectId, environment, onCreateSecret }: SecretsListProps) {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [rotatingSecrets, setRotatingSecrets] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSecrets();
  }, [projectId, environment]);

  const loadSecrets = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('secrets')
        .select(`
          *,
          rotation_policies (
            frequency_days,
            next_rotation,
            auto_rotate
          )
        `)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (environment) {
        query = query.eq('environment', environment);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSecrets(data || []);
    } catch (error) {
      console.error('Error loading secrets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSecrets = secrets.filter(secret => {
    const matchesSearch = secret.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         secret.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || secret.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSecretVisibility = async (secretId: string) => {
    if (visibleSecrets.has(secretId)) {
      // Hide secret
      setVisibleSecrets(prev => {
        const next = new Set(prev);
        next.delete(secretId);
        return next;
      });
    } else {
      // Show secret - requires master password
      if (!masterPassword) {
        const password = prompt('Enter master password to view secret:');
        if (!password) return;
        setMasterPassword(password);
      }

      setVisibleSecrets(prev => new Set(prev).add(secretId));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const rotateSecret = async (secretId: string) => {
    if (!masterPassword) {
      const password = prompt('Enter master password to rotate secret:');
      if (!password) return;
      setMasterPassword(password);
    }

    try {
      setRotatingSecrets(prev => new Set(prev).add(secretId));
      
      const scheduler = new RotationScheduler(masterPassword);
      await scheduler.rotateSecret(secretId);
      
      // Reload secrets to show updated data
      await loadSecrets();
      
      // Could add success notification here
    } catch (error) {
      console.error('Error rotating secret:', error);
      // Could add error notification here
    } finally {
      setRotatingSecrets(prev => {
        const next = new Set(prev);
        next.delete(secretId);
        return next;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'rotating': return 'secondary';
      case 'deprecated': return 'outline';
      case 'expired': return 'destructive';
      case 'compromised': return 'destructive';
      default: return 'default';
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production': return 'destructive';
      case 'staging': return 'secondary';
      case 'development': return 'outline';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilRotation = (nextRotation?: string) => {
    if (!nextRotation) return null;
    const days = Math.ceil((new Date(nextRotation).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search secrets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="rotating">Rotating</option>
            <option value="deprecated">Deprecated</option>
            <option value="expired">Expired</option>
          </select>
          
          {onCreateSecret && (
            <Button onClick={onCreateSecret} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Secret
            </Button>
          )}
        </div>
      </div>

      {/* Secrets Grid */}
      <div className="grid gap-4">
        {filteredSecrets.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No secrets found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first secret'
                }
              </p>
              {onCreateSecret && !searchTerm && statusFilter === 'all' && (
                <Button onClick={onCreateSecret}>
                  Create your first secret
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredSecrets.map((secret) => {
            const isVisible = visibleSecrets.has(secret.id);
            const isRotating = rotatingSecrets.has(secret.id);
            const daysUntilRotation = getDaysUntilRotation(secret.rotation_policies?.[0]?.next_rotation);
            
            return (
              <Card key={secret.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {secret.name}
                        <Badge variant={getStatusColor(secret.status)}>
                          {secret.status}
                        </Badge>
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={getEnvironmentColor(secret.environment)}>
                          {secret.environment}
                        </Badge>
                        <Badge variant="outline">
                          {secret.secret_type.replace('_', ' ')}
                        </Badge>
                        {secret.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSecretVisibility(secret.id)}
                      >
                        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rotateSecret(secret.id)}
                        disabled={isRotating}
                      >
                        <RotateCcw className={`h-4 w-4 ${isRotating ? 'animate-spin' : ''}`} />
                      </Button>
                      
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Secret Value */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Secret Value</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 font-mono text-sm bg-gray-50 p-2 rounded border">
                        {isVisible ? (
                          <DecryptedValue 
                            encryptedValue={secret.encrypted_value} 
                            masterPassword={masterPassword}
                          />
                        ) : (
                          '••••••••••••••••••••••••••••••••'
                        )}
                      </div>
                      {isVisible && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(secret.encrypted_value)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Last rotated:</span>
                      <div className="font-medium">{formatDate(secret.last_rotated)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Usage count:</span>
                      <div className="font-medium">{secret.usage_count.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Rotation Info */}
                  {secret.rotation_policies?.[0] && (
                    <div className="flex items-center gap-2 text-sm p-2 bg-blue-50 rounded">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>
                        {daysUntilRotation !== null ? (
                          daysUntilRotation > 0 ? (
                            `Next rotation in ${daysUntilRotation} days`
                          ) : (
                            <span className="text-orange-600 font-medium">Rotation overdue</span>
                          )
                        ) : (
                          `Rotates every ${secret.rotation_policies[0].frequency_days} days`
                        )}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// Helper component to decrypt and display secret values
function DecryptedValue({ encryptedValue, masterPassword }: { encryptedValue: string; masterPassword: string }) {
  const [decryptedValue, setDecryptedValue] = useState<string>('Decrypting...');

  useEffect(() => {
    const decrypt = async () => {
      try {
        if (masterPassword) {
          const value = await VortexEncryption.decrypt(encryptedValue, masterPassword);
          setDecryptedValue(value);
        }
      } catch (error) {
        setDecryptedValue('Failed to decrypt');
      }
    };

    decrypt();
  }, [encryptedValue, masterPassword]);

  return <span>{decryptedValue}</span>;
}