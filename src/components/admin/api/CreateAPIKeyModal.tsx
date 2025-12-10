// src/components/admin/api/CreateAPIKeyModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Label } from "@/components/ui/fieldset";
import { Text } from "@/components/ui/text";
import { Checkbox, CheckboxField } from "@/components/ui/checkbox";
import { 
  XMarkIcon, 
  KeyIcon,
  ClipboardIcon,
  CheckIcon 
} from "@heroicons/react/24/outline";
import { APIKeyCreateRequest, APIPermission } from '@/types/api';

interface CreateAPIKeyModalProps {
  onClose: () => void;
  onCreate: (request: APIKeyCreateRequest) => Promise<any>;
}

export function CreateAPIKeyModal({ onClose, onCreate }: CreateAPIKeyModalProps) {
  const t = useTranslations('admin.api.createModal');
  const [step, setStep] = useState<'config' | 'created'>('config');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<APIPermission>>(new Set());
  const [selectAllStates, setSelectAllStates] = useState<Record<string, boolean>>({});
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [requestsPerHour, setRequestsPerHour] = useState(1000);
  const [allowedIPs, setAllowedIPs] = useState('');

  // Permission definitions with translations
  const AVAILABLE_PERMISSIONS: {
    value: APIPermission;
    label: string;
    description: string;
    category: string;
  }[] = [
    // Contacts
    { value: 'contacts:read', label: t('form.permissions.items.contactsRead'), description: t('form.permissions.items.contactsReadDesc'), category: t('form.permissions.categories.contacts') },
    { value: 'contacts:write', label: t('form.permissions.items.contactsWrite'), description: t('form.permissions.items.contactsWriteDesc'), category: t('form.permissions.categories.contacts') },
    { value: 'contacts:delete', label: t('form.permissions.items.contactsDelete'), description: t('form.permissions.items.contactsDeleteDesc'), category: t('form.permissions.categories.contacts') },

    // Companies
    { value: 'companies:read', label: t('form.permissions.items.companiesRead'), description: t('form.permissions.items.companiesReadDesc'), category: t('form.permissions.categories.companies') },
    { value: 'companies:write', label: t('form.permissions.items.companiesWrite'), description: t('form.permissions.items.companiesWriteDesc'), category: t('form.permissions.categories.companies') },
    { value: 'companies:delete', label: t('form.permissions.items.companiesDelete'), description: t('form.permissions.items.companiesDeleteDesc'), category: t('form.permissions.categories.companies') },

    // Publications
    { value: 'publications:read', label: t('form.permissions.items.publicationsRead'), description: t('form.permissions.items.publicationsReadDesc'), category: t('form.permissions.categories.library') },
    { value: 'publications:write', label: t('form.permissions.items.publicationsWrite'), description: t('form.permissions.items.publicationsWriteDesc'), category: t('form.permissions.categories.library') },
    { value: 'publications:delete', label: t('form.permissions.items.publicationsDelete'), description: t('form.permissions.items.publicationsDeleteDesc'), category: t('form.permissions.categories.library') },

    // Advertisements
    { value: 'advertisements:read', label: t('form.permissions.items.advertisementsRead'), description: t('form.permissions.items.advertisementsReadDesc'), category: t('form.permissions.categories.library') },
    { value: 'advertisements:write', label: t('form.permissions.items.advertisementsWrite'), description: t('form.permissions.items.advertisementsWriteDesc'), category: t('form.permissions.categories.library') },
    { value: 'advertisements:delete', label: t('form.permissions.items.advertisementsDelete'), description: t('form.permissions.items.advertisementsDeleteDesc'), category: t('form.permissions.categories.library') },

    // Advanced
    { value: 'webhooks:manage', label: t('form.permissions.items.webhooksManage'), description: t('form.permissions.items.webhooksManageDesc'), category: t('form.permissions.categories.advanced') },
    { value: 'analytics:read', label: t('form.permissions.items.analyticsRead'), description: t('form.permissions.items.analyticsReadDesc'), category: t('form.permissions.categories.advanced') }
  ];

  const EXPIRY_OPTIONS = [
    { value: null, label: t('form.expiry.options.permanent') },
    { value: 30, label: t('form.expiry.options.30days') },
    { value: 90, label: t('form.expiry.options.90days') },
    { value: 365, label: t('form.expiry.options.1year') }
  ];

  const handlePermissionChange = (permission: APIPermission, checked: boolean) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(permission);
      } else {
        newSet.delete(permission);
      }
      return newSet;
    });
  };

  const handleSelectAllCategory = (category: string, checked: boolean) => {
    const categoryPermissions = AVAILABLE_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.value);
    
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      categoryPermissions.forEach(permission => {
        if (checked) {
          newSet.add(permission);
        } else {
          newSet.delete(permission);
        }
      });
      return newSet;
    });
    
    setSelectAllStates(prev => ({ ...prev, [category]: checked }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPermissions(new Set(AVAILABLE_PERMISSIONS.map(p => p.value)));
      const allCategories = [...new Set(AVAILABLE_PERMISSIONS.map(p => p.category))];
      const newStates: Record<string, boolean> = {};
      allCategories.forEach(cat => { newStates[cat] = true; });
      setSelectAllStates(newStates);
    } else {
      setSelectedPermissions(new Set());
      setSelectAllStates({});
    }
  };

  // Update category checkboxes when individual permissions change
  useEffect(() => {
    const categories = [...new Set(AVAILABLE_PERMISSIONS.map(p => p.category))];
    const newStates: Record<string, boolean> = {};
    
    categories.forEach(category => {
      const categoryPermissions = AVAILABLE_PERMISSIONS
        .filter(p => p.category === category)
        .map(p => p.value);
      
      const allSelected = categoryPermissions.every(p => selectedPermissions.has(p));
      newStates[category] = allSelected;
    });
    
    setSelectAllStates(newStates);
  }, [selectedPermissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t('form.errors.nameRequired'));
      return;
    }

    if (selectedPermissions.size === 0) {
      setError(t('form.errors.permissionsRequired'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const request: APIKeyCreateRequest = {
        name: name.trim(),
        permissions: Array.from(selectedPermissions),
        expiresInDays: expiresInDays || undefined,
        rateLimit: {
          requestsPerHour
        },
        allowedIPs: allowedIPs ? allowedIPs.split(',').map(ip => ip.trim()).filter(Boolean) : undefined
      };

      // API Key erstellen
      const newKey = await onCreate(request);
      
      // Verwende den echten Key vom API-Response
      if (newKey && newKey.key) {
        setCreatedKey(newKey.key);
        setStep('created');
      } else {
        throw new Error(t('form.errors.noKeyInResponse'));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : t('form.errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/25" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
          
          {step === 'config' && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <KeyIcon className="h-6 w-6 text-blue-600" />
                  <DialogTitle className="text-lg font-semibold">{t('title')}</DialogTitle>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <Text className="text-red-700">{error}</Text>
                  </div>
                )}

                {/* Basic Info */}
                <div className="space-y-4">
                  <Field>
                    <Label>{t('form.name.label')}</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('form.name.placeholder')}
                      required
                    />
                    <Text className="text-sm text-gray-500 break-words">
                      {t('form.name.hint')}
                    </Text>
                  </Field>

                  <Field>
                    <Label>{t('form.rateLimit.label')}</Label>
                    <Input
                      type="number"
                      value={requestsPerHour}
                      onChange={(e) => setRequestsPerHour(parseInt(e.target.value) || 1000)}
                      min="1"
                      max="10000"
                    />
                    <Text className="text-sm text-gray-500 break-words">
                      {t('form.rateLimit.hint')}
                    </Text>
                  </Field>

                  <Field>
                    <Label>{t('form.expiry.label')}</Label>
                    <select
                      value={expiresInDays || ''}
                      onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2"
                    >
                      {EXPIRY_OPTIONS.map(option => (
                        <option key={option.value || 'permanent'} value={option.value || ''}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field>
                    <Label>{t('form.allowedIPs.label')}</Label>
                    <Input
                      value={allowedIPs}
                      onChange={(e) => setAllowedIPs(e.target.value)}
                      placeholder={t('form.allowedIPs.placeholder')}
                    />
                    <Text className="text-sm text-gray-500 break-words">
                      {t('form.allowedIPs.hint')}
                    </Text>
                  </Field>
                </div>

                {/* Permissions */}
                <div>
                  <h3 className="text-base font-semibold">{t('form.permissions.title')}</h3>
                  <Text className="text-sm text-gray-500 mt-1 mb-4 break-words">
                    {t('form.permissions.description')}
                  </Text>

                  {/* Master Select All */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.size === AVAILABLE_PERMISSIONS.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="font-medium">{t('form.permissions.selectAll')}</span>
                    </label>
                  </div>
                  
                  <div className="space-y-6">
                    {Object.entries(groupedPermissions).map(([category, permissions]) => (
                      <div key={category} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Text className="font-medium text-gray-900">{category}</Text>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectAllStates[category] || false}
                              onChange={(e) => handleSelectAllCategory(category, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-gray-600">{t('form.permissions.selectAllCategory')}</span>
                          </label>
                        </div>
                        <div className="space-y-2 pl-2">
                          {permissions.map((permission) => (
                            <label key={permission.value} className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedPermissions.has(permission.value)}
                                onChange={(e) => handlePermissionChange(permission.value, e.target.checked)}
                                className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium break-words">{permission.label}</div>
                                <Text className="text-sm text-gray-500 break-words">{permission.description}</Text>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-900 border-0 rounded-md px-4 py-2 text-sm font-medium"
                  >
                    {t('actions.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !name.trim() || selectedPermissions.size === 0}
                    className="inline-flex items-center bg-primary hover:bg-primary-hover text-white border-0 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? t('actions.creating') : t('actions.create')}
                  </button>
                </div>
              </form>
              </div>
            </>
          )}

          {step === 'created' && createdKey && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <CheckIcon className="h-6 w-6 text-green-600" />
                  <DialogTitle className="text-lg font-semibold">{t('successTitle')}</DialogTitle>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Created Key Display */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Text className="text-yellow-800 font-medium mb-2">{t('success.warning')}</Text>
                  <Text className="text-yellow-700 text-sm break-words">
                    {t('success.warningText')}
                  </Text>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">{t('success.keyLabel')}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={createdKey}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <button
                        onClick={copyToClipboard}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                      >
                        {copied ? (
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <ClipboardIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {copied && (
                      <Text className="text-sm text-green-600 mt-1">{t('success.copied')}</Text>
                    )}
                  </div>

                  <div>
                    <Text className="font-medium">{t('success.nextSteps')}</Text>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>{t('success.steps.saveKey')}</li>
                      <li>{t('success.steps.configure')}</li>
                      <li>{t('success.steps.test')}</li>
                      <li>{t('success.steps.monitor')}</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      // Schließe das Modal und refreshe die API Key Liste
                      onClose();
                    }}
                    className="inline-flex items-center bg-primary hover:bg-primary-hover text-white border-0 rounded-md px-4 py-2 text-sm font-medium"
                  >
                    {t('actions.understood')}
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}