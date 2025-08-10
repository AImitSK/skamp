// src/components/admin/api/APIKeyManager.tsx
"use client";

import { useState, useEffect } from 'react';
import { Heading, Subheading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/context/AuthContext';
import { 
  KeyIcon, 
  EyeIcon, 
  EyeSlashIcon,
  TrashIcon,
  ClipboardIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import { APIKeyResponse, APIKeyCreateRequest, APIPermission } from '@/types/api';
import { CreateAPIKeyModal } from './CreateAPIKeyModal';

interface APIKeyManagerProps {
  className?: string;
}

export function APIKeyManager({ className = '' }: APIKeyManagerProps) {
  const { user, organizationId } = useAuth();
  const [apiKeys, setAPIKeys] = useState<Omit<APIKeyResponse, 'key'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (organizationId) {
      loadAPIKeys();
    }
  }, [organizationId]);

  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      setError(null);

      // Da wir keinen Admin-Token haben, simulieren wir die Daten
      // In der echten Implementation würde hier ein interner API-Call stattfinden
      // TODO: Implement internal API call to fetch keys
      
      // Mock-Daten für UI-Testing
      const mockKeys: Omit<APIKeyResponse, 'key'>[] = [
        {
          id: 'key_1',
          name: 'Salesforce Integration',
          keyPreview: 'cp_test_ab...',
          permissions: ['contacts:read', 'contacts:write', 'companies:read'],
          isActive: true,
          rateLimit: {
            requestsPerHour: 1000,
            requestsPerMinute: 60,
            burstLimit: 10
          },
          usage: {
            totalRequests: 1250,
            requestsThisHour: 45,
            requestsToday: 320,
            lastUsedAt: undefined
          },
          createdAt: '2025-01-10T10:00:00Z'
        }
      ];
      
      setAPIKeys(mockKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (request: APIKeyCreateRequest) => {
    try {
      // TODO: Implement actual API key creation
      // const response = await fetch('/api/v1/auth/keys', { ... });
      
      // Mock-Implementation für UI-Testing
      const newKey: Omit<APIKeyResponse, 'key'> = {
        id: `key_${Date.now()}`,
        name: request.name,
        keyPreview: 'cp_test_xy...',
        permissions: request.permissions,
        isActive: true,
        rateLimit: {
          requestsPerHour: request.rateLimit?.requestsPerHour || 1000,
          requestsPerMinute: request.rateLimit?.requestsPerMinute || 60,
          burstLimit: 10
        },
        usage: {
          totalRequests: 0,
          requestsThisHour: 0,
          requestsToday: 0
        },
        createdAt: new Date().toISOString()
      };
      
      setAPIKeys(prev => [newKey, ...prev]);
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('API-Key wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      // TODO: Implement actual deletion
      // await fetch(`/api/v1/auth/keys/${keyId}`, { method: 'DELETE' });
      
      setAPIKeys(prev => prev.filter(key => key.id !== keyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  const getPermissionBadgeColor = (permission: APIPermission): "blue" | "green" | "red" => {
    if (permission.includes('read')) return 'blue';
    if (permission.includes('write')) return 'green';
    if (permission.includes('delete')) return 'red';
    return 'blue';
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Subheading level={2}>API-Schlüssel</Subheading>
          <Text className="mt-2 text-zinc-500 dark:text-zinc-400">
            Erstelle und verwalte API-Keys für externe Integrationen
          </Text>
        </div>
        <Button 
          color="indigo" 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Neuen API-Key erstellen
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <Text className="text-red-700">{error}</Text>
        </div>
      )}

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div 
          className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg"
          style={{ backgroundColor: '#f1f0e2' }}
        >
          <KeyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <Subheading level={3}>Noch keine API-Keys</Subheading>
          <Text className="mt-2 text-gray-500">
            Erstelle deinen ersten API-Key um externe Integrationen zu ermöglichen.
          </Text>
          <Button 
            color="indigo" 
            className="mt-4"
            onClick={() => setShowCreateModal(true)}
          >
            Ersten API-Key erstellen
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="border border-gray-200 rounded-lg p-6"
              style={{ backgroundColor: '#f1f0e2' }}
            >
              {/* API Key Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <KeyIcon className="h-6 w-6 text-gray-600 mt-1" />
                  <div>
                    <div className="flex items-center gap-3">
                      <Text className="font-semibold text-gray-900">{apiKey.name}</Text>
                      <Badge color={apiKey.isActive ? 'green' : 'red'}>
                        {apiKey.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Text className="text-sm text-gray-500 font-mono">
                        {visibleKeys.has(apiKey.id) ? 'cp_test_example123...' : apiKey.keyPreview}
                      </Text>
                      <Button
                        plain
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        className="p-1"
                      >
                        {visibleKeys.has(apiKey.id) ? 
                          <EyeSlashIcon className="h-4 w-4" /> : 
                          <EyeIcon className="h-4 w-4" />
                        }
                      </Button>
                      <Button
                        plain
                        onClick={() => copyToClipboard(visibleKeys.has(apiKey.id) ? 'cp_test_example123...' : apiKey.keyPreview)}
                        className="p-1"
                      >
                        <ClipboardIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  plain
                  onClick={() => handleDeleteKey(apiKey.id)}
                  className="p-2 text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Permissions */}
              <div className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">Berechtigungen:</Text>
                <div className="flex flex-wrap gap-2">
                  {apiKey.permissions.map((permission) => (
                    <Badge 
                      key={permission} 
                      color={getPermissionBadgeColor(permission)}
                      className="text-xs"
                    >
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Usage Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-300">
                <div>
                  <Text className="text-xs text-gray-500">Gesamt</Text>
                  <Text className="font-semibold">{apiKey.usage.totalRequests.toLocaleString()}</Text>
                </div>
                <div>
                  <Text className="text-xs text-gray-500">Diese Stunde</Text>
                  <Text className="font-semibold">{apiKey.usage.requestsThisHour}</Text>
                </div>
                <div>
                  <Text className="text-xs text-gray-500">Heute</Text>
                  <Text className="font-semibold">{apiKey.usage.requestsToday}</Text>
                </div>
                <div>
                  <Text className="text-xs text-gray-500">Rate Limit</Text>
                  <Text className="font-semibold">{apiKey.rateLimit.requestsPerHour}/h</Text>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create API Key Modal */}
      {showCreateModal && (
        <CreateAPIKeyModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateKey}
        />
      )}
    </div>
  );
}