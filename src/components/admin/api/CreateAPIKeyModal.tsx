// src/components/admin/api/CreateAPIKeyModal.tsx
"use client";

import { useState } from 'react';
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
  onCreate: (request: APIKeyCreateRequest) => Promise<void>;
}

const AVAILABLE_PERMISSIONS: { 
  value: APIPermission; 
  label: string; 
  description: string;
  category: string;
}[] = [
  // Contacts
  { value: 'contacts:read', label: 'Kontakte lesen', description: 'Kontaktdaten abrufen und suchen', category: 'Kontakte' },
  { value: 'contacts:write', label: 'Kontakte schreiben', description: 'Neue Kontakte erstellen und bearbeiten', category: 'Kontakte' },
  { value: 'contacts:delete', label: 'Kontakte löschen', description: 'Kontakte permanent löschen', category: 'Kontakte' },
  
  // Companies
  { value: 'companies:read', label: 'Firmen lesen', description: 'Firmendaten abrufen und suchen', category: 'Firmen' },
  { value: 'companies:write', label: 'Firmen schreiben', description: 'Neue Firmen erstellen und bearbeiten', category: 'Firmen' },
  { value: 'companies:delete', label: 'Firmen löschen', description: 'Firmen permanent löschen', category: 'Firmen' },
  
  // Publications
  { value: 'publications:read', label: 'Publikationen lesen', description: 'Publikationsdaten abrufen und filtern', category: 'Bibliothek' },
  { value: 'publications:write', label: 'Publikationen schreiben', description: 'Neue Publikationen erstellen und bearbeiten', category: 'Bibliothek' },
  { value: 'publications:delete', label: 'Publikationen löschen', description: 'Publikationen permanent löschen', category: 'Bibliothek' },
  
  // Advertisements
  { value: 'advertisements:read', label: 'Werbemittel lesen', description: 'Werbemitteldaten abrufen', category: 'Bibliothek' },
  { value: 'advertisements:write', label: 'Werbemittel schreiben', description: 'Werbemittel erstellen und bearbeiten', category: 'Bibliothek' },
  { value: 'advertisements:delete', label: 'Werbemittel löschen', description: 'Werbemittel permanent löschen', category: 'Bibliothek' },
  
  // Advanced
  { value: 'webhooks:manage', label: 'Webhooks verwalten', description: 'Webhook-Konfiguration ändern', category: 'Erweitert' },
  { value: 'analytics:read', label: 'Analytics lesen', description: 'Nutzungsstatistiken abrufen', category: 'Erweitert' }
];

const EXPIRY_OPTIONS = [
  { value: null, label: 'Permanent (kein Ablauf)' },
  { value: 30, label: '30 Tage' },
  { value: 90, label: '90 Tage' },
  { value: 365, label: '1 Jahr' }
];

export function CreateAPIKeyModal({ onClose, onCreate }: CreateAPIKeyModalProps) {
  const [step, setStep] = useState<'config' | 'created'>('config');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<APIPermission>>(new Set());
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [requestsPerHour, setRequestsPerHour] = useState(1000);
  const [allowedIPs, setAllowedIPs] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }
    
    if (selectedPermissions.size === 0) {
      setError('Mindestens eine Berechtigung ist erforderlich');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const request: APIKeyCreateRequest = {
        name: name.trim(),
        permissions: Array.from(selectedPermissions),
        expiresInDays,
        rateLimit: {
          requestsPerHour
        },
        allowedIPs: allowedIPs ? allowedIPs.split(',').map(ip => ip.trim()).filter(Boolean) : undefined
      };

      // In der echten Implementation würde hier der tatsächliche API-Key zurückgegeben
      await onCreate(request);
      
      // Mock für UI-Testing
      setCreatedKey('cp_test_abcd1234efgh5678ijkl9012mnop3456qrst7890');
      setStep('created');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des API-Keys');
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
        <DialogPanel className="w-full max-w-2xl bg-white rounded-lg shadow-xl">
          
          {step === 'config' && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <KeyIcon className="h-6 w-6 text-blue-600" />
                  <DialogTitle className="text-lg font-semibold">Neuen API-Key erstellen</DialogTitle>
                </div>
                <Button plain onClick={onClose}>
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>

              {/* Form */}
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
                    <Label>Name des API-Keys</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="z.B. Salesforce Integration"
                      required
                    />
                    <Text className="text-sm text-gray-500">
                      Eindeutiger Name zur Identifizierung dieses API-Keys
                    </Text>
                  </Field>

                  <Field>
                    <Label>Anfragen pro Stunde</Label>
                    <Input
                      type="number"
                      value={requestsPerHour}
                      onChange={(e) => setRequestsPerHour(parseInt(e.target.value) || 1000)}
                      min="1"
                      max="10000"
                    />
                    <Text className="text-sm text-gray-500">
                      Maximale Anzahl API-Anfragen pro Stunde
                    </Text>
                  </Field>

                  <Field>
                    <Label>Ablaufzeit</Label>
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
                    <Label>Erlaubte IP-Adressen (optional)</Label>
                    <Input
                      value={allowedIPs}
                      onChange={(e) => setAllowedIPs(e.target.value)}
                      placeholder="192.168.1.1, 10.0.0.1 (leer für alle IPs)"
                    />
                    <Text className="text-sm text-gray-500">
                      Kommagetrennte Liste von IP-Adressen. Leer lassen für unbegrenzt.
                    </Text>
                  </Field>
                </div>

                {/* Permissions */}
                <div>
                  <h3 className="text-base font-semibold">Berechtigungen</h3>
                  <Text className="text-sm text-gray-500 mt-1 mb-4">
                    Wähle die Aktionen aus, die mit diesem API-Key ausgeführt werden dürfen.
                  </Text>
                  
                  <div className="space-y-6">
                    {Object.entries(groupedPermissions).map(([category, permissions]) => (
                      <div key={category}>
                        <Text className="font-medium text-gray-900 mb-3">{category}</Text>
                        <div className="space-y-2 pl-4">
                          {permissions.map((permission) => (
                            <CheckboxField key={permission.value}>
                              <Checkbox
                                checked={selectedPermissions.has(permission.value)}
                                onChange={(checked) => handlePermissionChange(permission.value, checked)}
                              />
                              <span className="font-medium">{permission.label}</span>
                              <Text className="text-sm text-gray-500">{permission.description}</Text>
                            </CheckboxField>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button plain onClick={onClose}>
                    Abbrechen
                  </Button>
                  <Button 
                    type="submit" 
                    color="indigo"
                    disabled={loading || !name.trim() || selectedPermissions.size === 0}
                  >
                    {loading ? 'Erstelle...' : 'API-Key erstellen'}
                  </Button>
                </div>
              </form>
            </>
          )}

          {step === 'created' && createdKey && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <CheckIcon className="h-6 w-6 text-green-600" />
                  <DialogTitle className="text-lg font-semibold">API-Key erfolgreich erstellt</DialogTitle>
                </div>
                <Button plain onClick={onClose}>
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>

              {/* Created Key Display */}
              <div className="p-6">
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Text className="text-yellow-800 font-medium mb-2">Wichtiger Sicherheitshinweis</Text>
                  <Text className="text-yellow-700 text-sm">
                    Dies ist das einzige Mal, dass der vollständige API-Key angezeigt wird. 
                    Bitte kopiere ihn jetzt und bewahre ihn sicher auf.
                  </Text>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Dein neuer API-Key:</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={createdKey}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        plain
                        onClick={copyToClipboard}
                        className="p-2 bg-gray-100 hover:bg-gray-200"
                      >
                        {copied ? (
                          <CheckIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <ClipboardIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {copied && (
                      <Text className="text-sm text-green-600 mt-1">In Zwischenablage kopiert!</Text>
                    )}
                  </div>

                  <div>
                    <Text className="font-medium">Nächste Schritte:</Text>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Sichere den API-Key in deinem Passwort-Manager</li>
                      <li>Konfiguriere deine externe Anwendung mit diesem Key</li>
                      <li>Teste die Integration mit einem einfachen API-Aufruf</li>
                      <li>Überwache die Usage-Statistiken in diesem Dashboard</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                  <Button color="indigo" onClick={onClose}>
                    Verstanden
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}