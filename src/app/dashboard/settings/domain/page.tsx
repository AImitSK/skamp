// src/app/dashboard/settings/domain/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { 
  PlusIcon, 
  TrashIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  InformationCircleIcon,
  PlayCircleIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/20/solid';
import { AddDomainModal } from '@/components/domains/AddDomainModal';
import { InboxTestModal } from '@/components/domains/InboxTestModal';
import { DnsStatusCard } from '@/components/domains/DnsStatusCard';
import { HelpSidebar } from '@/components/domains/HelpSidebar';
import { apiClient } from '@/lib/api/api-client';
import { domainServiceEnhanced } from '@/lib/firebase/domain-service-enhanced';
import { 
  EmailDomainEnhanced, 
  DomainStatus, 
  DOMAIN_STATUS_COLORS_ENHANCED 
} from '@/types/email-domains-enhanced';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { de } from 'date-fns/locale/de';

// Alert Component using existing pattern
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

export default function DomainsPage() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<EmailDomainEnhanced[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInboxTest, setShowInboxTest] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<EmailDomainEnhanced | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingDns, setCheckingDns] = useState<string | null>(null);

  // Context for all operations
  const getContext = () => ({
    organizationId: user!.uid, // TODO: Use proper organizationId when available
    userId: user!.uid
  });

  useEffect(() => {
    if (user) {
      loadDomains();
    }
  }, [user]);

  const loadDomains = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const context = getContext();
      const data = await domainServiceEnhanced.getAll(context.organizationId);
      setDomains(data);
    } catch (error: any) {
      console.error('Error loading domains:', error);
      setError('Domains konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    try {
      setVerifying(domainId);
      setError(null);
      
      const domain = domains.find(d => d.id === domainId);
      if (!domain || !domain.sendgridDomainId) {
        setError('Domain oder SendGrid ID nicht gefunden');
        return;
      }
      
      const response = await apiClient.post<{
        success: boolean;
        status: DomainStatus;
        dnsRecords: any[];
        error?: string;
      }>('/api/email/domains/verify', { 
        domainId,
        sendgridDomainId: domain.sendgridDomainId
      });
      
      if (response.success) {
        const context = getContext();
        
        await domainServiceEnhanced.updateVerificationStatus(
          domainId,
          response.status,
          context,
          true // increment attempts
        );
        
        await domainServiceEnhanced.updateDnsRecords(
          domainId, 
          response.dnsRecords,
          context
        );
        
        await loadDomains();
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setError(error.message || 'Verifizierung fehlgeschlagen');
    } finally {
      setVerifying(null);
    }
  };

  const checkDnsStatus = async (domainId: string) => {
    try {
      setCheckingDns(domainId);
      setError(null);
      
      const domain = domains.find(d => d.id === domainId);
      if (!domain || !domain.dnsRecords || domain.dnsRecords.length === 0) {
        setError('Domain oder DNS Records nicht gefunden');
        return;
      }
      
      const response = await apiClient.post<{
        success: boolean;
        results: any[];
        allValid: boolean;
        error?: string;
      }>('/api/email/domains/check-dns', { 
        domainId,
        dnsRecords: domain.dnsRecords 
      });
      
      if (response.success) {
        const context = getContext();
        await domainServiceEnhanced.updateDnsCheckResults(
          domainId, 
          response.results,
          context
        );
        
        if (response.allValid && domain.status !== 'verified') {
          await handleVerify(domainId);
        } else {
          await loadDomains();
        }
      }
    } catch (error: any) {
      console.error('DNS check error:', error);
      setError('DNS-Überprüfung fehlgeschlagen');
    } finally {
      setCheckingDns(null);
    }
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm('Möchten Sie diese Domain wirklich löschen?')) {
      return;
    }

    try {
      setError(null);
      const domain = domains.find(d => d.id === domainId);
      
      if (domain?.sendgridDomainId) {
        try {
          await apiClient.delete(`/api/email/domains/${domainId}`);
        } catch (apiError) {
          console.warn('SendGrid deletion failed, continuing with Firebase deletion');
        }
      }
      
      // Delete from Firebase using the softDelete method from BaseService
      const context = getContext();
      await domainServiceEnhanced.softDelete(domainId, context);
      await loadDomains();
      
    } catch (error: any) {
      console.error('Delete error:', error);
      setError('Domain konnte nicht gelöscht werden');
    }
  };

  const getStatusBadge = (status: DomainStatus) => {
    const colors = {
      pending: { bg: 'yellow', icon: ClockIcon, text: 'Ausstehend' },
      verified: { bg: 'green', icon: CheckCircleIcon, text: 'Verifiziert' },
      failed: { bg: 'red', icon: XCircleIcon, text: 'Fehlgeschlagen' }
    };

    const config = colors[status];
    const Icon = config.icon;

    return (
      <Badge color={config.bg as any} className="inline-flex items-center gap-1 whitespace-nowrap">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Unbekannt';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: de });
    } catch {
      return 'Unbekannt';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-gray-400 animate-spin mx-auto" />
          <Text className="mt-4">Lade Domains...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <Heading level={1}>Versand-Domains authentifizieren</Heading>
            <Text className="mt-2 text-gray-600">
              Verbinden Sie Ihre Domain, um E-Mails im Namen Ihrer eigenen Marke zu versenden.
              Dies verbessert die Zustellbarkeit erheblich und schafft Vertrauen bei den Empfängern.
            </Text>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 gap-2">
            <Button plain onClick={() => window.open('https://help.skamp.de/domains', '_blank')}>
              <PlayCircleIcon className="w-4 h-4 mr-2" />
              Video-Tutorial
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Neue Domain hinzufügen
            </Button>
          </div>
        </div>

        {/* Info Alert für Erstnutzer */}
        {domains.length === 0 && !loading && (
          <Alert type="info">
            <div className="flex gap-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <Text className="font-semibold text-blue-800">Warum ist das wichtig?</Text>
                <Text className="text-sm mt-1 text-blue-700">
                  Ohne eigene Domain werden Ihre E-Mails von einer fremden Adresse versendet, 
                  was oft im Spam-Ordner landet. Mit Ihrer eigenen Domain erhöhen Sie die 
                  Zustellrate um bis zu 95%.
                </Text>
              </div>
            </div>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert type="error">
            <div className="flex gap-3">
              <XCircleIcon className="w-5 h-5 text-red-600 shrink-0" />
              <Text className="text-red-800">{error}</Text>
            </div>
          </Alert>
        )}

        {/* Domains List */}
        {domains.length > 0 && (
          <div className="space-y-4 mt-6">
            {domains.map((domain) => (
              <div 
                key={domain.id}
                className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{domain.domain}</h3>
                      {getStatusBadge(domain.status)}
                      {domain.isDefault && (
                        <Badge color="blue" className="whitespace-nowrap">Standard</Badge>
                      )}
                    </div>
                    
                    <Text className="text-sm text-gray-500 mt-1">
                      Hinzugefügt {formatDate(domain.createdAt)}
                    </Text>

                    {/* DNS Status Details */}
                    {domain.status !== 'verified' && domain.dnsCheckResults && (
                      <DnsStatusCard 
                        results={domain.dnsCheckResults}
                        onRefresh={() => checkDnsStatus(domain.id!)}
                        isRefreshing={checkingDns === domain.id}
                      />
                    )}

                    {/* Inbox Test Results Summary */}
                    {domain.status === 'verified' && (
                      <div className="mt-4 flex items-center gap-4">
                        {domain.inboxTestScore !== undefined && (
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-600">Zustellrate:</div>
                            <Badge 
                              color={
                                domain.inboxTestScore >= 90 ? 'green' : 
                                domain.inboxTestScore >= 70 ? 'yellow' : 'red'
                              }
                              className="whitespace-nowrap"
                            >
                              {domain.inboxTestScore}%
                            </Badge>
                          </div>
                        )}
                        {domain.emailsSent && domain.emailsSent > 0 && (
                          <Text className="text-sm text-gray-600">
                            {domain.emailsSent} E-Mails versendet
                          </Text>
                        )}
                      </div>
                    )}

                    {/* Provider Info */}
                    {domain.provider && domain.provider !== 'other' && (
                      <div className="mt-2">
                        <Text className="text-sm text-gray-600">
                          Provider: <span className="font-medium capitalize">{domain.provider}</span>
                        </Text>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {domain.status === 'verified' ? (
                      <>
                        <Button
                          plain
                          onClick={() => setShowInboxTest(domain.id!)}
                        >
                          <EnvelopeIcon className="w-4 h-4" />
                          Inbox testen
                        </Button>
                        {!domain.isDefault && (
                          <Button
                            plain
                            onClick={async () => {
                              await domainServiceEnhanced.setAsDefault(domain.id!, getContext());
                              await loadDomains();
                            }}
                          >
                            Als Standard
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Button
                          plain
                          onClick={() => {
                            setSelectedDomain(domain);
                            setShowAddModal(true);
                          }}
                        >
                          <InformationCircleIcon className="w-4 h-4" />
                          DNS-Einträge
                        </Button>
                        <Button
                          plain
                          onClick={() => handleVerify(domain.id!)}
                          disabled={verifying === domain.id}
                        >
                          <ArrowPathIcon 
                            className={`w-4 h-4 ${verifying === domain.id ? 'animate-spin' : ''}`} 
                          />
                          Prüfen
                        </Button>
                      </>
                    )}
                    <Button
                      plain
                      onClick={() => handleDelete(domain.id!)}
                    >
                      <TrashIcon className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {domains.length === 0 && !loading && (
          <div className="text-center py-12 bg-gray-50 rounded-lg mt-8">
            <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <EnvelopeIcon className="h-12 w-12 text-gray-400" />
            </div>
            <Text className="text-gray-500 mb-4">
              Sie haben noch keine Domains hinzugefügt.
            </Text>
            <Button onClick={() => setShowAddModal(true)} className="whitespace-nowrap">
              <PlusIcon className="w-4 h-4 mr-2" />
              Erste Domain hinzufügen
            </Button>
            <Text className="text-sm text-gray-500 mt-4">
              Keine Sorge, wir führen Sie Schritt für Schritt durch den Prozess.
            </Text>
          </div>
        )}

        {/* Help Toggle Button (Mobile) */}
        {!showHelp && (
          <Button
            plain
            onClick={() => setShowHelp(true)}
            className="fixed bottom-4 right-4 md:hidden bg-white shadow-lg rounded-full p-3"
          >
            <QuestionMarkCircleIcon className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* Help Sidebar */}
      {showHelp && (
        <HelpSidebar 
          onClose={() => setShowHelp(false)}
          currentStep={domains.length === 0 ? 'start' : 'manage'}
        />
      )}

      {/* Modals */}
      <AddDomainModal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedDomain(null);
        }}
        onSuccess={() => {
          setShowAddModal(false);
          setSelectedDomain(null);
          loadDomains();
        }}
        existingDomain={selectedDomain}
      />

      {showInboxTest && (
        <InboxTestModal
          domainId={showInboxTest}
          onClose={() => setShowInboxTest(null)}
          onSuccess={() => {
            setShowInboxTest(null);
            loadDomains();
          }}
        />
      )}
    </div>
  );
}