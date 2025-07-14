// src/components/domains/AddDomainModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle } from '@/components/dialog';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Select } from '@/components/select';
import { Checkbox } from '@/components/checkbox';
import { Text } from '@/components/text';
import { Field, Label } from '@/components/fieldset';
import { ProviderGuideView } from './ProviderGuideView';
import { DnsRecordsList } from './DnsRecordsList';
import { 
  ClipboardDocumentIcon, 
  CheckIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/20/solid';
import { apiClient } from '@/lib/api/api-client';
import { DnsRecord, EmailDomain } from '@/types/email-domains';
import { providerGuides, genericGuide } from '@/lib/domain-providers/provider-guides';
import { domainService } from '@/lib/firebase/domain-service';

// Alert Component
function Alert({ 
  type = 'info', 
  children 
}: { 
  type?: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}) {
  const styles = {
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    error: 'bg-red-50 border-red-200'
  };

  return (
    <div className={`rounded-lg border p-4 ${styles[type]}`}>
      {children}
    </div>
  );
}

interface AddDomainModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingDomain?: EmailDomain | null;
}

export function AddDomainModal({ 
  open, 
  onClose, 
  onSuccess, 
  existingDomain 
}: AddDomainModalProps) {
  const [step, setStep] = useState<'input' | 'provider' | 'dns' | 'verify'>(
    existingDomain ? 'dns' : 'input'
  );
  const [domain, setDomain] = useState(existingDomain?.domain || '');
  const [domainId, setDomainId] = useState<string | null>(existingDomain?.id || null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>(
    existingDomain?.dnsRecords || []
  );
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Provider Detection
  useEffect(() => {
    if (domain && step === 'provider' && !existingDomain) {
      detectProvider();
    }
  }, [domain, step]);

  // Set detected provider for existing domain
  useEffect(() => {
    if (existingDomain?.detectedProvider) {
      setSelectedProvider(existingDomain.detectedProvider);
      setDetectedProvider(existingDomain.detectedProvider);
    }
  }, [existingDomain]);

  const detectProvider = async () => {
    try {
      setDetecting(true);
      const response = await apiClient.post<{provider: string | null}>(
        '/api/email/domains/detect-provider',
        { domain }
      );
      setDetectedProvider(response.provider);
      if (response.provider) {
        setSelectedProvider(response.provider);
      }
    } catch (error) {
      console.error('Provider detection failed:', error);
    } finally {
      setDetecting(false);
    }
  };

  const handleDomainSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validierung
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
      if (!domainRegex.test(domain)) {
        setError('Bitte geben Sie eine gültige Domain ein (z.B. ihre-firma.de)');
        setLoading(false);
        return;
      }
      
      if (existingDomain) {
        // Bei existierender Domain direkt zu DNS
        setStep('dns');
      } else {
        // Neue Domain - erst Provider auswählen
        setStep('provider');
      }
    } catch (error: any) {
      setError(error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderContinue = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // DNS Records von SendGrid generieren (nur SendGrid, kein Firebase)
      const response = await apiClient.post<{
        success: boolean;
        sendgridDomainId: number;
        dnsRecords: DnsRecord[];
        domainData: any;
      }>('/api/email/domains', { 
        domain: domain.toLowerCase(),
        provider: selectedProvider 
      });
      
      // Jetzt Firebase direkt vom Client
      try {
        const domainId = await domainService.create(response.domainData);
        
        // SendGrid ID und DNS Records updaten
        await domainService.update(domainId, {
          sendgridDomainId: response.sendgridDomainId,
          dnsRecords: response.dnsRecords,
          detectedProvider: selectedProvider
        });
        
        console.log('✅ Domain saved to Firebase:', domainId);
        
        // Domain ID für spätere Updates speichern
        setDomainId(domainId);
      } catch (fbError) {
        console.error('Firebase error:', fbError);
        setError('Domain konnte nicht gespeichert werden');
        setLoading(false);
        return;
      }
      
      setDnsRecords(response.dnsRecords);
      setStep('dns');
    } catch (error: any) {
      setError(error.message || 'Domain konnte nicht hinzugefügt werden');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = existingDomain 
      ? ['DNS-Einträge', 'Verifizierung']
      : ['Domain', 'Provider', 'DNS-Einträge', 'Verifizierung'];
    
    const currentStepIndex = existingDomain
      ? step === 'dns' ? 0 : 1
      : ['input', 'provider', 'dns', 'verify'].indexOf(step);

    return (
      <div className="flex items-center justify-center mb-6">
        {steps.map((stepName, index) => (
          <div key={index} className="flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
              ${index <= currentStepIndex 
                ? 'bg-[#005fab] text-white' 
                : 'bg-gray-200 text-gray-600'}
            `}>
              {index + 1}
            </div>
            <span className={`ml-2 text-sm whitespace-nowrap ${
              index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {stepName}
            </span>
            {index < steps.length - 1 && (
              <div className={`mx-4 w-16 h-0.5 ${
                index < currentStepIndex ? 'bg-[#005fab]' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} size="4xl">
      <div className="max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4">
          <DialogTitle>
          {existingDomain 
            ? `DNS-Einträge für ${domain}`
            : step === 'input' 
              ? 'Domain hinzufügen' 
              : `Domain authentifizieren: ${domain}`
          }
                  </DialogTitle>
        </div>

        <div className="px-6">
          {renderStepIndicator()}
        </div>

        {error && (
          <div className="px-6 mt-4">
            <Alert type="error">
              <div className="flex gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0" />
                <Text className="text-red-800">{error}</Text>
              </div>
            </Alert>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Domain Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <Field>
                <Label>Domain</Label>
                <Input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="z.B. ihre-firma.de"
                  className="mt-2"
                />
                <Text className="mt-2 text-sm text-gray-600">
                  Geben Sie hier nur die Domain ein, nicht die E-Mail-Adresse.
                  Statt `max@ihre-firma.de` geben Sie `ihre-firma.de` ein.
                </Text>
              </Field>

              <Alert type="info">
                <div className="flex gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <Text className="font-semibold text-blue-800">Gut zu wissen:</Text>
                    <Text className="text-sm mt-1 text-blue-700">
                      Die Einrichtung dauert normalerweise nur 10-15 Minuten. 
                      Wir führen Sie Schritt für Schritt durch den Prozess.
                    </Text>
                  </div>
                </div>
              </Alert>
            </div>
          )}

          {/* Step 2: Provider Selection */}
          {step === 'provider' && (
            <div className="space-y-4">
              <div>
                <Text className="font-medium text-gray-900">Wo ist Ihre Domain registriert?</Text>
                <Text className="text-sm text-gray-600 mb-3 mt-1">
                  Wählen Sie Ihren Domain-Provider für eine spezifische Anleitung.
                </Text>
                
                {detecting && (
                  <Alert type="info">
                    <div className="flex gap-2 items-center">
                      <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />
                      <Text className="text-blue-800">Provider wird automatisch erkannt...</Text>
                    </div>
                  </Alert>
                )}

                {detectedProvider && (
                  <Alert type="success">
                    <div className="flex gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      <Text className="text-green-800">
                        Wir haben erkannt, dass Ihre Domain bei {providerGuides[detectedProvider]?.name || detectedProvider} registriert ist.
                      </Text>
                    </div>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-3 mt-4">
                  {Object.values(providerGuides).map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedProvider(provider.id)}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-colors
                        ${selectedProvider === provider.id 
                          ? 'border-[#005fab] bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'}
                      `}
                    >
                      <div className="font-medium">{provider.name}</div>
                      {provider.logo && (
                        <img 
                          src={provider.logo} 
                          alt={provider.name}
                          className="h-6 mt-2"
                        />
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedProvider('other')}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-colors
                      ${selectedProvider === 'other' 
                        ? 'border-[#005fab] bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'}
                    `}
                  >
                    <div className="font-medium">Anderer Provider</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Allgemeine Anleitung
                    </div>
                  </button>
                </div>
              </div>

              <Alert type="info">
                <div className="flex gap-3">
                  <QuestionMarkCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <Text className="font-semibold text-blue-800">Nicht sicher?</Text>
                    <Text className="text-sm mt-1 text-blue-700">
                      Prüfen Sie Ihre E-Mails nach der Domain-Registrierung oder 
                      schauen Sie in Ihre Rechnungen. Der Provider wird dort genannt.
                    </Text>
                  </div>
                </div>
              </Alert>
            </div>
          )}

          {/* Step 3: DNS Records with Guide */}
          {step === 'dns' && (
            <div className="space-y-6">
              {selectedProvider && selectedProvider !== 'other' ? (
                <ProviderGuideView
                  provider={providerGuides[selectedProvider]}
                  dnsRecords={dnsRecords}
                />
              ) : (
                <>
                  <Text className="text-gray-600">
                    Fast geschafft! Fügen Sie die folgenden DNS-Einträge bei Ihrem Provider hinzu:
                  </Text>
                  
                  <DnsRecordsList records={dnsRecords} />
                  
                  {selectedProvider === 'other' && (
                    <ProviderGuideView
                      provider={genericGuide}
                      dnsRecords={dnsRecords}
                    />
                  )}
                </>
              )}

              <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                <Text className="text-sm text-amber-800">
                  <strong>Tipp:</strong> Machen Sie Screenshots von den DNS-Einträgen, 
                  bevor Sie zu Ihrem Provider wechseln. So haben Sie alle Informationen griffbereit.
                </Text>
              </div>

              <div className="mt-6">
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={confirmed}
                    onChange={setConfirmed}
                    className="mt-1"
                  />
                  <Text className="text-sm">
                    Ich habe die DNS-Einträge bei meinem Provider hinzugefügt 
                    oder werde dies jetzt tun.
                  </Text>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Verification */}
          {step === 'verify' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircleIcon className="h-10 w-10 text-green-600" />
                </div>
                <Text className="text-lg font-semibold mb-2">
                  Einrichtung abgeschlossen!
                </Text>
                <Text className="text-gray-600">
                  Die DNS-Einträge wurden gespeichert. Die Verifizierung läuft 
                  automatisch im Hintergrund und dauert meist 5-15 Minuten.
                </Text>
              </div>

              <Alert type="info">
                <div className="flex gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <Text className="font-semibold text-blue-800">Was passiert jetzt?</Text>
                    <ul className="text-sm mt-2 space-y-1 text-blue-700">
                      <li>• Wir prüfen alle 5 Minuten automatisch den Status</li>
                      <li>• Sie erhalten eine E-Mail, sobald die Domain verifiziert ist</li>
                      <li>• Sie können den Status jederzeit manuell prüfen</li>
                    </ul>
                  </div>
                </div>
              </Alert>
            </div>
          )}
        </div>

        {/* Footer with Navigation */}
        <div className="mt-6 flex justify-between border-t pt-4 px-6 pb-4">
          <div>
            {step !== 'input' && !existingDomain && (
              <Button 
                plain 
                onClick={() => {
                  if (step === 'provider') setStep('input');
                  if (step === 'dns') setStep('provider');
                  if (step === 'verify') setStep('dns');
                }}
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Zurück
              </Button>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button plain onClick={onClose}>
              {step === 'verify' ? 'Schließen' : 'Abbrechen'}
            </Button>
            
            {step === 'input' && (
              <Button 
                onClick={handleDomainSubmit} 
                disabled={!domain || loading}
                className="whitespace-nowrap"
              >
                Weiter
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {step === 'provider' && (
              <Button 
                onClick={handleProviderContinue}
                disabled={!selectedProvider || loading}
                className="whitespace-nowrap"
              >
                {loading ? 'DNS-Einträge werden generiert...' : 'DNS-Einträge generieren'}
                {!loading && <ArrowRightIcon className="w-4 h-4 ml-2" />}
              </Button>
            )}
            
            {step === 'dns' && (
              <Button 
                onClick={() => setStep('verify')}
                disabled={!confirmed}
                className="whitespace-nowrap"
              >
                Einrichtung abschließen
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {step === 'verify' && (
              <Button onClick={onSuccess} className="whitespace-nowrap">
                Zur Übersicht
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}