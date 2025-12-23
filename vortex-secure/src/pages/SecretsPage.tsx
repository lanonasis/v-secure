// Vortex Secure - Secrets Management Page
import React, { useState } from 'react';
import { SecretsList } from '../components/dashboard/SecretsList';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Filter, 
  Download, 
  Upload,
  Key,
  Shield,
  Clock,
  AlertTriangle
} from 'lucide-react';

export function SecretsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = {
    total: 1247,
    active: 1189,
    rotationDue: 23,
    compromised: 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Secrets Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all your application secrets</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Secret
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Secrets</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total.toLocaleString()}</p>
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
                <p className="text-3xl font-bold text-green-600">{stats.active.toLocaleString()}</p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rotation Due</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.rotationDue}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compromised</p>
                <p className="text-3xl font-bold text-red-600">{stats.compromised}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search secrets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={selectedEnvironment}
                onChange={(e) => setSelectedEnvironment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Environments</option>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
              
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secrets List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Secrets</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {stats.total} total
              </Badge>
              <Badge variant="outline">
                {stats.rotationDue} need rotation
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SecretsList
            environment={selectedEnvironment === 'all' ? undefined : selectedEnvironment as any}
            onCreateSecret={() => setShowCreateForm(true)}
          />
        </CardContent>
      </Card>

      {/* Create Secret Modal/Form would go here */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Secret</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Secret Name</label>
                <Input placeholder="e.g., stripe_api_key" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Environment</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Development</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Secret Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>API Key</option>
                  <option>Database URL</option>
                  <option>OAuth Token</option>
                  <option>Certificate</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Secret Value</label>
                <Input type="password" placeholder="Enter secret value" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button>Create Secret</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}