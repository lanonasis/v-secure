// Vortex Secure - Settings Page
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Users, Shield, Bell } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your Vortex Secure instance</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Settings className="h-8 w-8 mx-auto mb-3 text-blue-600" />
            <h3 className="font-medium mb-2">General Settings</h3>
            <p className="text-sm text-gray-500">Basic configuration and preferences</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-green-600" />
            <h3 className="font-medium mb-2">User Management</h3>
            <p className="text-sm text-gray-500">Manage team access and permissions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 mx-auto mb-3 text-red-600" />
            <h3 className="font-medium mb-2">Security Settings</h3>
            <p className="text-sm text-gray-500">Authentication and encryption options</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Bell className="h-8 w-8 mx-auto mb-3 text-purple-600" />
            <h3 className="font-medium mb-2">Notifications</h3>
            <p className="text-sm text-gray-500">Alert preferences and webhooks</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>🚧 Settings Panel Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Full settings management interface is under development.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}