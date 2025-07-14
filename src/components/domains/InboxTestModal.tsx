// src/components/domains/InboxTestModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle } from '@/components/dialog';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Select } from '@/components/select';
import { Text } from '@/components/text';
import { Field, Label } from '@/components/fieldset';
import { Badge } from '@/components/badge';
import { 
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/20/solid';
import { apiClient } from '@/lib/api/api-client';
import { domainService } from '@/lib/firebase/domain-service';
import { EmailDomain, EMAIL_PROVIDER_LABELS, DELIVERY_STATUS_COLORS } from '@/types/email-domains';

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

interface InboxTestModalProps {
  domainId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InboxTestModal({ domainId, onClose, onSuccess }: InboxTestModalProps) {
  const [domain, setDomain] = useState<EmailDomain | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [emailProvider, setEmailProvider] = useState('gmail');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDomain();
  }, [domainId]);

  const loadDomain = async () => {
    try {
      const domainData = await domainService.getById(domainId);
      setDomain(domainData);
    } catch (error) {
      console.error('Error loading domain:', error);
      setError('Domain konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!domain) return;

    try {
      setSending(true);
      setError(null);
      setResult(null);

      // E-Mail-Validierung
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(testEmail)) {
        setError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
        setSending(false);
        return;
      }

      const response = await apiClient.post<{
        success: boolean;
        testId: string;
        messageId: string;
        status: 'sending' | 'sent' | 'failed';
        deliveryStatus?: string;
        deliveryTime?: number;
        spamScore?: number;
        recommendations?: string[];
      }>('/api/email/domains/test-inbox', {
        domainId,
        testEmail,
        provider: emailProvider
      });

      setResult(response);
      
      // Auto-refresh nach 5 Sekunden
      if (response.testId) {
        setTimeout(() => {
          checkTestStatus(response.testId);
        }, 5000);
      }
      
    } catch (error: any) {
      setError(error.message || 'Test fehlgeschlagen');
    } finally {
      setSending(false);
    }
  };

  const checkTestStatus = async (testId: string) => {
    try {
      const status = await apiClient.get<{
        deliveryStatus?: string;
        deliveryTime?: number;
        spamScore?: number;
        recommendations?: string[];
      }>(`/api/email/domains/test-status/${testId}`);
      
      setResult((prev: any) => {
        if (!prev) return status;
        return Object.assign({}, prev, status);
      });
    } catch (error) {
      console.error('Status check failed:', error);
    }
  };

  const getDeliveryStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return CheckCircleIcon;
      case 'spam':
        return ExclamationTriangleIcon;
      case 'blocked':
        return XCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const getDeliveryStatusText = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'E-Mail erfolgreich zugestellt!';
      case 'spam':
        return 'E-Mail im Spam-Ordner gelandet';
      case 'blocked':
        return 'E-Mail wurde blockiert';
      case 'pending':
        return 'Zustellung wird überprüft...';
      default:
        return 'Status unbekannt';
    }
  };

  if (loading) {
    return (
      <Dialog open onClose={onClose}>
        <div>
          <div className="flex items-center justify-center p-8">
            <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose}>
      <div className="p-6">
        <DialogTitle>Inbox-Zustellbarkeit testen</DialogTitle>

        <div className="mt-4 space-y-4">
          <Alert type="info">
            <div className="flex gap-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <Text className="font-semibold text-blue-800">So funktioniert der Test:</Text>
                <Text className="text-sm mt-1 text-blue-700">
                  Wir senden eine Test-E-Mail von Ihrer Domain an die angegebene 
                  Adresse und prüfen, ob sie im Posteingang landet.
                </Text>
              </div>
            </div>
          </Alert>

          {domain && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <Text className="text-sm text-gray-600">
                Test-Domain: <span className="font-medium">{domain.domain}</span>
              </Text>
            </div>
          )}

          <Field>
            <Label>Test-E-Mail-Adresse</Label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="ihre-email@gmail.com"
              className="mt-2"
            />
            <Text className="mt-2 text-sm text-gray-600">
              Verwenden Sie eine E-Mail-Adresse, auf die Sie Zugriff haben.
            </Text>
          </Field>

          <Field>
            <Label>E-Mail-Provider</Label>
            <Select
              value={emailProvider}
              onChange={(e) => setEmailProvider(e.target.value)}
              className="mt-2"
            >
              {Object.entries(EMAIL_PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Text className="mt-2 text-sm text-gray-600">
              Verschiedene Provider haben unterschiedliche Spam-Filter.
            </Text>
          </Field>

          {/* Test Result */}
          {result && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                {result.status === 'sending' && (
                  <>
                    <ClockIcon className="w-5 h-5 text-blue-600 animate-pulse" />
                    <div>
                      <Text className="font-semibold">E-Mail wird gesendet...</Text>
                      <Text className="text-sm text-gray-600 mt-1">
                        Test-ID: {result.testId}
                      </Text>
                    </div>
                  </>
                )}
                
                {result.deliveryStatus && (
                  <>
                    {(() => {
                      const Icon = getDeliveryStatusIcon(result.deliveryStatus);
                      const colorKey = result.deliveryStatus as keyof typeof DELIVERY_STATUS_COLORS;
                      const color = DELIVERY_STATUS_COLORS[colorKey] || 'zinc';
                      return (
                        <>
                          <Icon className={`w-5 h-5 text-${color}-600`} />
                          <div className="flex-1">
                            <Text className={`font-semibold text-${color}-800`}>
                              {getDeliveryStatusText(result.deliveryStatus)}
                            </Text>
                            
                            {result.deliveryTime && (
                              <Text className="text-sm text-gray-600 mt-1">
                                Zustellzeit: {result.deliveryTime}ms
                              </Text>
                            )}
                            
                            {result.spamScore !== undefined && (
                              <div className="mt-2">
                                <Text className="text-sm text-gray-600">
                                  Spam-Score: {result.spamScore}/10
                                </Text>
                                <div className="mt-1 flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        result.spamScore <= 3 ? 'bg-green-500' :
                                        result.spamScore <= 6 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                      }`}
                                      style={{ width: `${result.spamScore * 10}%` }}
                                    />
                                  </div>
                                  <Badge 
                                    color={
                                      result.spamScore <= 3 ? 'green' :
                                      result.spamScore <= 6 ? 'yellow' :
                                      'red'
                                    }
                                    className="whitespace-nowrap"
                                  >
                                    {result.spamScore <= 3 ? 'Sehr gut' :
                                     result.spamScore <= 6 ? 'OK' :
                                     'Kritisch'}
                                  </Badge>
                                </div>
                              </div>
                            )}
                            
                            {result.recommendations && result.recommendations.length > 0 && (
                              <div className="mt-3">
                                <Text className="text-sm font-medium text-gray-700">
                                  Empfehlungen:
                                </Text>
                                <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                                  {result.recommendations.map((rec: string, i: number) => (
                                    <li key={i}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <Alert type="error">
              <div className="flex gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0" />
                <Text className="text-red-800">{error}</Text>
              </div>
            </Alert>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
          <Button plain onClick={onClose}>
            Schließen
          </Button>
          <Button 
            onClick={handleSendTest}
            disabled={!testEmail || sending}
            className="whitespace-nowrap"
          >
            {sending ? (
              <>
                <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                Sende Test...
              </>
            ) : (
              <>
                <EnvelopeIcon className="w-4 h-4 mr-2" />
                Test senden
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}