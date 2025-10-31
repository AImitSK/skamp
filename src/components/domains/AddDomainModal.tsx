// src/components/domains/AddDomainModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Label, Description } from '@/components/ui/fieldset';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { apiClient } from '@/lib/api/api-client';
import { domainServiceEnhanced } from '@/lib/firebase/domain-service-enhanced';
import { 
  EmailDomainEnhanced, 
  DnsRecord, 
  DomainProvider,
  DOMAIN_PROVIDER_NAMES,
  AddDomainModalProps 
} from '@/types/email-domains-enhanced';
import {
  CheckCircleIcon,
  DocumentDuplicateIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  GlobeAltIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

type Step = 'provider' | 'domain' | 'dns' | 'verify';

const providerOptions: { value: DomainProvider; name: string; popular?: boolean }[] = [
  { value: 'namecheap', name: 'Namecheap', popular: true },
  { value: 'godaddy', name: 'GoDaddy', popular: true },
  { value: 'cloudflare', name: 'Cloudflare', popular: true },
  { value: 'hetzner', name: 'Hetzner' },
  { value: 'strato', name: 'STRATO' },
  { value: 'united-domains', name: 'United Domains' },
  { value: 'ionos', name: 'IONOS' },
  { value: 'other', name: 'Andere' }
];

export function AddDomainModal({
  open,
  onClose,
  onSuccess,
  existingDomain
}: AddDomainModalProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [step, setStep] = useState<Step>(existingDomain ? 'dns' : 'provider');
  const [selectedProvider, setSelectedProvider] = useState<DomainProvider>('other');
  const [domain, setDomain] = useState('');
  const [domainId, setDomainId] = useState<string | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Initialize from existing domain
  useEffect(() => {
    if (existingDomain) {
      setDomain(existingDomain.domain);
      setDomainId(existingDomain.id!);
      setDnsRecords(existingDomain.dnsRecords || []);
      setSelectedProvider(existingDomain.provider || 'other');
      setStep('dns');
    }
  }, [existingDomain]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open && !existingDomain) {
      setStep('provider');
      setSelectedProvider('other');
      setDomain('');
      setDomainId(null);
      setDnsRecords([]);
      setError(null);
    }
  }, [open, existingDomain]);

  const handleProviderContinue = () => {
    setStep('domain');
  };

  const handleDomainContinue = async () => {
    if (!domain) {
      setError('Bitte geben Sie eine Domain ein');
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      setError('Bitte geben Sie eine gültige Domain ein (z.B. example.com)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const context = {
        organizationId: currentOrganization?.id || user!.uid,
        userId: user!.uid
      };

      // Check if domain already exists
      const existingDomain = await domainServiceEnhanced.getByDomain(
        domain,
        context.organizationId
      );
      
      if (existingDomain) {
        setError('Diese Domain ist bereits registriert');
        setLoading(false);
        return;
      }
      
      // Create domain at SendGrid
      const response = await apiClient.post<{
        success: boolean;
        sendgridDomainId: number;
        dnsRecords: DnsRecord[];
        domainData: any;
        subdomain: string;
        error?: string;
      }>('/api/email/domains', { 
        domain: domain.toLowerCase(),
        provider: selectedProvider 
      });
      
      if (!response.success) {
        throw new Error(response.error || 'SendGrid-Fehler');
      }
      
      // Save to Firebase
      const newDomainId = await domainServiceEnhanced.createDomain({
        domain: domain.toLowerCase(),
        subdomain: response.subdomain,
        provider: selectedProvider,
        sendgridDomainId: response.sendgridDomainId,
        dnsRecords: response.dnsRecords
      }, context);
      
      
      setDomainId(newDomainId);
      setDnsRecords(response.dnsRecords);
      setStep('dns');
      
    } catch (error: any) {
      setError(error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!domainId) return;

    try {
      setVerifying(true);
      setError(null);

      // Get current domain data
      const currentDomain = await domainServiceEnhanced.getById(
        domainId,
        currentOrganization?.id || user!.uid
      );

      if (!currentDomain?.sendgridDomainId) {
        setError('SendGrid Domain ID nicht gefunden');
        return;
      }

      // Call verify API
      const response = await apiClient.post<{
        success: boolean;
        status: 'pending' | 'verified' | 'failed';
        dnsRecords: DnsRecord[];
        error?: string;
      }>('/api/email/domains/verify', {
        domainId,
        sendgridDomainId: currentDomain.sendgridDomainId
      });

      if (response.success) {
        const context = {
          organizationId: currentOrganization?.id || user!.uid,
          userId: user!.uid
        };

        // Update domain status
        await domainServiceEnhanced.updateVerificationStatus(
          domainId,
          response.status,
          context,
          true // increment attempts
        );

        // Update DNS records
        await domainServiceEnhanced.updateDnsRecords(
          domainId,
          response.dnsRecords,
          context
        );

        if (response.status === 'verified') {
          setStep('verify');
        } else {
          setDnsRecords(response.dnsRecords);
          setError('DNS-Einträge noch nicht vollständig konfiguriert. Bitte überprüfen Sie Ihre DNS-Einstellungen.');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Verifizierung fehlgeschlagen');
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(id);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
    }
  };

  const getProviderInstructions = (provider: DomainProvider): string => {
    const instructions: Record<DomainProvider, string> = {
      namecheap: 'Gehen Sie zu Domain List → Manage → Advanced DNS',
      godaddy: 'Öffnen Sie My Products → DNS → Manage Zones',
      cloudflare: 'Wählen Sie Ihre Domain → DNS → Records',
      hetzner: 'DNS Console → Zone auswählen → Records',
      strato: 'Domain-Verwaltung → DNS-Verwaltung → Records bearbeiten',
      'united-domains': 'Portfolio → Domain → DNS-Einstellungen',
      ionos: 'Domains & SSL → Domain → DNS-Einstellungen',
      other: 'Öffnen Sie die DNS-Verwaltung Ihres Domain-Providers'
    };
    return instructions[provider];
  };

  const renderStepContent = () => {
    switch (step) {
      case 'provider':
        return (
          <div className="space-y-4">
            <Text>Bei welchem Anbieter ist Ihre Domain registriert?</Text>
            
            <div className="grid gap-3">
              {providerOptions.map((provider) => (
                <button
                  key={provider.value}
                  onClick={() => setSelectedProvider(provider.value)}
                  className={`relative flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    selectedProvider === provider.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">{provider.name}</span>
                  {provider.popular && (
                    <Badge color="blue" className="ml-2">Beliebt</Badge>
                  )}
                  {selectedProvider === provider.value && (
                    <CheckCircleIcon className="w-5 h-5 text-blue-500 absolute right-4" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <Button plain onClick={onClose}>
                Abbrechen
              </Button>
              <Button onClick={handleProviderContinue}>
                Weiter
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 'domain':
        return (
          <div className="space-y-4">
            <Field>
              <Label>Ihre Domain</Label>
              <Description>
                Geben Sie die Domain ein, von der Sie E-Mails versenden möchten
              </Description>
              <Input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                disabled={loading}
              />
            </Field>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0" />
                  <Text className="text-sm text-red-800">{error}</Text>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <Text className="text-sm font-medium text-blue-900">Wichtig</Text>
                  <Text className="text-sm text-blue-800 mt-1">
                    Sie müssen Zugriff auf die DNS-Einstellungen dieser Domain haben, 
                    um die Authentifizierung abzuschließen.
                  </Text>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button plain onClick={() => setStep('provider')}>
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Zurück
              </Button>
              <Button onClick={handleDomainContinue} disabled={loading}>
                {loading ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    Domain hinzufügen
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'dns':
        return (
          <div className="space-y-4">
            <div>
              <Text className="font-medium mb-2">
                Fügen Sie diese DNS-Einträge bei {DOMAIN_PROVIDER_NAMES[selectedProvider]} hinzu:
              </Text>
              <Text className="text-sm text-gray-600">
                {getProviderInstructions(selectedProvider)}
              </Text>
            </div>

            {error && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 shrink-0" />
                  <Text className="text-sm text-yellow-800">{error}</Text>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {dnsRecords.map((record, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <Badge color={record.valid ? 'green' : 'yellow'}>
                      {record.type} Record {index + 1}
                    </Badge>
                    {record.valid && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <Text className="text-xs text-gray-500 uppercase">Host/Name</Text>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-white rounded text-sm font-mono break-all">
                          {record.host}
                        </code>
                        <Button
                          plain
                          onClick={() => copyToClipboard(record.host, `host-${index}`)}
                        >
                          {copySuccess === `host-${index}` ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <DocumentDuplicateIcon className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Text className="text-xs text-gray-500 uppercase">Wert/Ziel</Text>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-white rounded text-sm font-mono break-all">
                          {record.data}
                        </code>
                        <Button
                          plain
                          onClick={() => copyToClipboard(record.data, `data-${index}`)}
                        >
                          {copySuccess === `data-${index}` ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <DocumentDuplicateIcon className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex gap-3">
                <InformationCircleIcon className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <Text className="text-sm font-medium text-amber-900">
                    DNS-Änderungen können bis zu 48 Stunden dauern
                  </Text>
                  <Text className="text-sm text-amber-800 mt-1">
                    In den meisten Fällen sind die Änderungen jedoch innerhalb von 
                    5-30 Minuten aktiv.
                  </Text>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button plain onClick={onClose}>
                Später fortfahren
              </Button>
              <Button onClick={handleVerify} disabled={verifying}>
                {verifying ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                    Wird überprüft...
                  </>
                ) : (
                  <>
                    DNS prüfen
                    <CheckCircleIcon className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'verify':
        return (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-10 h-10 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Domain erfolgreich verifiziert!
              </h3>
              <Text className="mt-2 text-gray-600">
                {domain} ist jetzt für den E-Mail-Versand authentifiziert.
              </Text>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <Text className="text-sm text-green-800">
                Sie können jetzt E-Mails von dieser Domain versenden. 
                Die Zustellbarkeit Ihrer E-Mails wird sich deutlich verbessern.
              </Text>
            </div>

            <div className="flex justify-center mt-6">
              <Button 
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
              >
                Fertig
                <CheckCircleIcon className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'provider': return 'Domain-Provider auswählen';
      case 'domain': return 'Domain eingeben';
      case 'dns': return 'DNS-Einträge konfigurieren';
      case 'verify': return 'Verifizierung erfolgreich';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
            {getStepTitle()}
          </Dialog.Title>
          
          {/* Progress indicator */}
          {!existingDomain && step !== 'verify' && (
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-2">
                {['provider', 'domain', 'dns'].map((s, index) => (
                  <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === s 
                        ? 'bg-blue-600 text-white' 
                        : ['provider', 'domain', 'dns'].indexOf(step) > index
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {['provider', 'domain', 'dns'].indexOf(step) > index ? (
                        <CheckCircleIcon className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < 2 && (
                      <div className={`w-16 h-1 ${
                        ['provider', 'domain', 'dns'].indexOf(step) > index 
                          ? 'bg-green-500' 
                          : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {renderStepContent()}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}