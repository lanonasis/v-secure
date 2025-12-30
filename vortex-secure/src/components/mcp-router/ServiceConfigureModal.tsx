// MCP Router - Service Configuration Modal
// Modal for configuring external API service credentials

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  Info,
} from 'lucide-react';
import type {
  MCPServiceCatalog,
  UserMCPService,
  CredentialField,
} from '../../types/mcp-router';

interface ServiceConfigureModalProps {
  service: MCPServiceCatalog;
  existingConfig?: UserMCPService;
  onClose: () => void;
  onSave: (serviceKey: string, credentials: Record<string, string>) => Promise<void>;
  onTest: (serviceKey: string) => Promise<void>;
}

export function ServiceConfigureModal({
  service,
  existingConfig,
  onClose,
  onSave,
  onTest,
}: ServiceConfigureModalProps) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize credentials with empty values
  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const field of service.credential_fields) {
      initial[field.key] = '';
    }
    setCredentials(initial);
  }, [service.credential_fields]);

  // Handle credential change
  const handleCredentialChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
    // Clear test result when credentials change
    setTestResult(null);
  };

  // Toggle password visibility
  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Validate credentials
  const validateCredentials = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of service.credential_fields) {
      const value = credentials[field.key];

      if (field.required && (!value || value.trim() === '')) {
        newErrors[field.key] = `${field.label} is required`;
        continue;
      }

      if (value && field.validation) {
        if (field.validation.minLength && value.length < field.validation.minLength) {
          newErrors[field.key] = `${field.label} must be at least ${field.validation.minLength} characters`;
        }

        if (field.validation.maxLength && value.length > field.validation.maxLength) {
          newErrors[field.key] = `${field.label} must be at most ${field.validation.maxLength} characters`;
        }

        if (field.validation.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            newErrors[field.key] = `${field.label} has an invalid format`;
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle test connection
  const handleTestConnection = async () => {
    if (!validateCredentials()) return;

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      // Simulate test - in real implementation, would call API
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock success/failure based on if credentials are filled
      const hasCredentials = Object.values(credentials).some(v => v.length > 0);
      if (hasCredentials) {
        setTestResult({
          success: true,
          message: 'Connection successful! Your credentials are valid.',
        });
      } else {
        setTestResult({
          success: false,
          message: 'Please enter your credentials before testing.',
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Connection failed. Please check your credentials.',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!validateCredentials()) return;

    setIsSaving(true);
    try {
      await onSave(service.service_key, credentials);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Render credential field input
  const renderCredentialField = (field: CredentialField) => {
    const value = credentials[field.key] || '';
    const error = errors[field.key];
    const isPassword = field.type === 'password';
    const showPassword = showPasswords[field.key];

    return (
      <div key={field.key} className="space-y-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {field.description && (
            <span className="block text-xs text-gray-500 mt-0.5">{field.description}</span>
          )}
        </label>

        {field.type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => handleCredentialChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-md text-sm font-mono ${
              error ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            rows={4}
          />
        ) : (
          <div className="relative">
            <Input
              type={isPassword && !showPassword ? 'password' : 'text'}
              value={value}
              onChange={(e) => handleCredentialChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={`pr-10 font-mono ${error ? 'border-red-500' : ''}`}
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => togglePasswordVisibility(field.key)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-gray-900">
              {existingConfig ? 'Update' : 'Configure'} {service.display_name}
            </h2>
            {service.is_beta && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Beta
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {/* Service Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  {service.description}
                </p>
                {service.documentation_url && (
                  <a
                    href={service.documentation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-2"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View API Documentation
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Existing Config Warning */}
          {existingConfig && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800">
                    This service is already configured. Enter new credentials to update.
                    Leave fields empty to keep existing values.
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Last updated: {new Date(existingConfig.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Credential Fields */}
          <div className="space-y-4">
            {service.credential_fields.map(renderCredentialField)}
          </div>

          {/* Environment Selection */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Environment
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>

          {/* Enable Immediately */}
          <div className="mt-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                defaultChecked={true}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Enable immediately after saving</span>
            </label>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                testResult.success
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm font-medium">{testResult.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : existingConfig ? (
                'Update Configuration'
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServiceConfigureModal;
