// src/components/admin/api/APIKeyManager.tsx
"use client";

import { useState, useEffect } from 'react';
import { Heading, Subheading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
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
  const { user } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id;
  const [apiKeys, setAPIKeys] = useState<Omit<APIKeyResponse, 'key'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ keyId: string; keyName: string } | null>(null);

  useEffect(() => {
    console.log('APIKeyManager: organizationId changed:', organizationId, 'orgLoading:', orgLoading);
    
    if (orgLoading) {
      // Organization wird noch geladen, warten
      return;
    }
    
    if (organizationId) {
      loadAPIKeys();
    } else {
      // Wenn keine organizationId vorhanden, loading beenden
      console.log('APIKeyManager: No organizationId available, ending loading state');
      setLoading(false);
    }
  }, [organizationId, orgLoading]);

  const loadAPIKeys = async () => {
    if (!user || !organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const response = await fetch('/api/v1/auth/keys', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const keys = await response.json();
      setAPIKeys(keys);
    } catch (err) {
      console.error('Failed to load API keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (request: APIKeyCreateRequest) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/v1/auth/keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const newKey = await response.json();
      
      // Refresh the API keys list to get the latest state
      await loadAPIKeys();
      setShowCreateModal(false);
      
      // Return the new key for the modal
      return newKey;
    } catch (err) {
      console.error('Failed to create API key:', err);
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const handleDeleteKeyConfirm = (keyId: string, keyName: string) => {
    setDeleteConfirm({ keyId, keyName });
  };

  const handleDeleteKey = async () => {
    if (!deleteConfirm) return;

    const { keyId } = deleteConfirm;
    setDeleteConfirm(null);

    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/auth/keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Refresh the API keys list to get the latest state
      await loadAPIKeys();
    } catch (err) {
      console.error('Failed to delete API key:', err);
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

  // Zeige Loading wenn Organization oder API Keys geladen werden
  if (orgLoading || loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Fallback wenn keine Organization verfügbar ist
  if (!currentOrganization) {
    return (
      <div className={className}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <Text className="text-yellow-800">
            Keine Organisation verfügbar. Bitte prüfen Sie Ihre Berechtigung.
          </Text>
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
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center bg-primary hover:bg-primary-hover text-white border-0 rounded-md px-6 py-2 text-sm font-medium"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Neuen API-Key erstellen
        </button>
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
          <button 
            className="mt-4 inline-flex items-center bg-primary hover:bg-primary-hover text-white border-0 rounded-md px-4 py-2 text-sm font-medium"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Ersten API-Key erstellen
          </button>
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
                      <button
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        className="p-2 hover:bg-gray-100 rounded-md"
                      >
                        {visibleKeys.has(apiKey.id) ? 
                          <EyeSlashIcon className="h-4 w-4" /> : 
                          <EyeIcon className="h-4 w-4" />
                        }
                      </button>
                      <button
                        onClick={() => copyToClipboard(visibleKeys.has(apiKey.id) ? 'cp_test_example123...' : apiKey.keyPreview)}
                        className="p-2 hover:bg-gray-100 rounded-md"
                      >
                        <ClipboardIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteKeyConfirm(apiKey.id, apiKey.name)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
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
          onClose={() => {
            console.log('Closing modal');
            setShowCreateModal(false);
          }}
          onCreate={handleCreateKey}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">API-Key löschen</h3>
            <p className="text-gray-600 mb-6">
              Möchtest du den API-Key <strong>"{deleteConfirm.keyName}"</strong> wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-900 border-0 rounded-md px-4 py-2 text-sm font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteKey}
                className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white border-0 rounded-md px-4 py-2 text-sm font-medium"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}