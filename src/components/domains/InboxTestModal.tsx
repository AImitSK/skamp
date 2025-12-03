// src/components/domains/InboxTestModal.tsx
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
  InboxTestResult,
  InboxTestModalProps
} from '@/types/email-domains-enhanced';
import {
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PaperAirplaneIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export function InboxTestModal({ domainId, onClose, onSuccess }: InboxTestModalProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [domain, setDomain] = useState<EmailDomainEnhanced | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<InboxTestResult[]>([]);
  const [testEmails, setTestEmails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [testComplete, setTestComplete] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadDomain();
    }
  }, [domainId, currentOrganization?.id]);

  const loadDomain = async () => {
    if (!currentOrganization?.id) {
      setError('Organisation nicht geladen');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const domainData = await domainServiceEnhanced.getById(
        domainId,
        currentOrganization.id
      );
      setDomain(domainData);
    } catch (err) {
      setError('Domain konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async () => {
    if (!domain) return;

    // Validiere E-Mail-Adressen
    const testAddresses = testEmails
      .split(',')
      .map(email => email.trim())
      .filter(email => email.includes('@'));

    if (testAddresses.length === 0) {
      setError('Bitte geben Sie mindestens eine gültige E-Mail-Adresse ein');
      return;
    }

    try {
      setTesting(true);
      setError(null);
      setTestResults([]);

      // Determine from email
      const fromEmail = domain.subdomain
        ? `test@${domain.subdomain}.${domain.domain}`
        : `test@${domain.domain}`;

      // Call inbox test API
      const response = await apiClient.post<{
        success: boolean;
        testId: string;
        results: InboxTestResult[];
        overallScore: number;
        summary: {
          total: number;
          delivered: number;
          failed: number;
          message: string;
        };
        error?: string;
      }>('/api/email/domains/test-inbox', {
        domainId,
        fromEmail,
        domain: domain.domain,
        testAddresses
      });

      if (!response.success) {
        throw new Error(response.error || 'Inbox-Test fehlgeschlagen');
      }

      setTestResults(response.results);

      // Save test results to Firebase
      const context = {
        organizationId: currentOrganization!.id,
        userId: user!.uid
      };

      for (const result of response.results) {
        await domainServiceEnhanced.addInboxTestResult(
          domainId,
          result,
          context
        );
      }

      setTestComplete(true);

    } catch (err: any) {
      setError(err.message || 'Test fehlgeschlagen');
    } finally {
      setTesting(false);
    }
  };

  const getDeliveryIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'spam':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getDeliveryBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge color="green" className="whitespace-nowrap">Zugestellt</Badge>;
      case 'failed':
        return <Badge color="red" className="whitespace-nowrap">Fehlgeschlagen</Badge>;
      case 'spam':
        return <Badge color="yellow" className="whitespace-nowrap">Spam</Badge>;
      default:
        return <Badge color="zinc" className="whitespace-nowrap">Ausstehend</Badge>;
    }
  };

  const calculateScore = () => {
    if (testResults.length === 0) return 0;
    const delivered = testResults.filter(r => r.deliveryStatus === 'delivered').length;
    return Math.round((delivered / testResults.length) * 100);
  };

  if (loading || !domain) {
    return (
      <Dialog open={true} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-center">
              <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
            Inbox-Test für {domain.domain}
          </Dialog.Title>

          {!testComplete ? (
            <div className="space-y-4">
              {/* Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <Text className="text-sm font-medium text-blue-900">
                      Was ist ein Inbox-Test?
                    </Text>
                    <Text className="text-sm text-blue-800 mt-1">
                      Wir senden Test-E-Mails an verschiedene E-Mail-Provider, um zu prüfen, 
                      ob Ihre E-Mails im Posteingang oder im Spam-Ordner landen.
                    </Text>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex gap-2">
                    <XCircleIcon className="w-5 h-5 text-red-600 shrink-0" />
                    <Text className="text-sm text-red-800">{error}</Text>
                  </div>
                </div>
              )}

              {/* E-Mail-Adressen Eingabe */}
              <Field>
                <Label>Test-E-Mail-Adressen</Label>
                <Input
                  type="text"
                  value={testEmails}
                  onChange={(e) => setTestEmails(e.target.value)}
                  placeholder="test@gmail.com, test@outlook.com"
                  disabled={testing}
                />
                <Description>
                  Geben Sie eine oder mehrere E-Mail-Adressen ein (kommagetrennt), an die Test-E-Mails gesendet werden sollen.
                  Prüfen Sie anschließend, ob die E-Mails im Posteingang oder Spam-Ordner gelandet sind.
                </Description>
              </Field>

              {/* Previous Test Results */}
              {domain.inboxTests && domain.inboxTests.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Text className="text-sm text-gray-600">
                    Letzter Test: {domain.inboxTestScore}% Zustellrate
                  </Text>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between mt-6">
                <Button plain onClick={onClose}>
                  Abbrechen
                </Button>
                <Button
                  onClick={handleStartTest}
                  disabled={testing || !testEmails.trim()}
                >
                  {testing ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Test läuft...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                      Test starten
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Test Complete */}
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <EnvelopeIcon className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Inbox-Test abgeschlossen
                </h3>
                <Text className="mt-2 text-gray-600">
                  Zustellrate: {calculateScore()}%
                </Text>
              </div>

              {/* Test Results */}
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getDeliveryIcon(result.deliveryStatus)}
                        <div>
                          <Text className="font-medium">{result.testEmail}</Text>
                          <Text className="text-sm text-gray-600">
                            Provider: {result.provider || 'Unbekannt'}
                          </Text>
                        </div>
                      </div>
                      {getDeliveryBadge(result.deliveryStatus)}
                    </div>
                    
                    {(() => {
                      const errorText = (result as any).error;
                      if (errorText) {
                        return (
                          <div className="mt-2 p-2 bg-red-50 rounded">
                            <Text className="text-sm text-red-700">{errorText}</Text>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {result.spamReasons && result.spamReasons.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded">
                        <Text className="text-sm text-yellow-700">
                          Spam-Gründe: {result.spamReasons.join(', ')}
                        </Text>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Score Interpretation */}
              <div className={`p-4 rounded-lg border ${
                calculateScore() >= 90 ? 'bg-green-50 border-green-200' :
                calculateScore() >= 70 ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex gap-3">
                  <InformationCircleIcon className={`w-5 h-5 shrink-0 ${
                    calculateScore() >= 90 ? 'text-green-600' :
                    calculateScore() >= 70 ? 'text-yellow-600' :
                    'text-red-600'
                  }`} />
                  <div>
                    <Text className={`text-sm font-medium ${
                      calculateScore() >= 90 ? 'text-green-900' :
                      calculateScore() >= 70 ? 'text-yellow-900' :
                      'text-red-900'
                    }`}>
                      {calculateScore() >= 90 ? 'Exzellente Zustellbarkeit!' :
                       calculateScore() >= 70 ? 'Gute Zustellbarkeit' :
                       'Verbesserung erforderlich'}
                    </Text>
                    <Text className={`text-sm mt-1 ${
                      calculateScore() >= 90 ? 'text-green-800' :
                      calculateScore() >= 70 ? 'text-yellow-800' :
                      'text-red-800'
                    }`}>
                      {calculateScore() >= 90 ? 
                        'Ihre E-Mails erreichen zuverlässig den Posteingang.' :
                       calculateScore() >= 70 ? 
                        'Die meisten E-Mails erreichen den Posteingang, aber es gibt Raum für Verbesserungen.' :
                        'Viele E-Mails landen im Spam. Überprüfen Sie Ihre Sender-Reputation und E-Mail-Inhalte.'}
                    </Text>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center mt-6">
                <Button 
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                >
                  Fertig
                </Button>
              </div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}