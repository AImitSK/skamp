// src/app/dashboard/settings/domain/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SettingsNav } from '@/components/SettingsNav';
import {
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  InformationCircleIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { toastService } from '@/lib/utils/toast';
import { AddDomainModal } from '@/components/domains/AddDomainModal';
import { InboxTestModal } from '@/components/domains/InboxTestModal';
import { DnsStatusCard } from '@/components/domains/DnsStatusCard';
import { apiClient } from '@/lib/api/api-client';
import { domainServiceEnhanced } from '@/lib/firebase/domain-service-enhanced';
import {
  EmailDomainEnhanced,
  DomainStatus,
} from '@/types/email-domains-enhanced';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

// Info Alert Component (nur für Info-Boxen, nicht für Fehlermeldungen)
function InfoAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
      {children}
    </div>
  );
}

export default function DomainsPage() {
  const t = useTranslations('settings.domain');
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const [domains, setDomains] = useState<EmailDomainEnhanced[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInboxTest, setShowInboxTest] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<EmailDomainEnhanced | null>(null);
  const [checkingDns, setCheckingDns] = useState<string | null>(null);

  // Context for all operations
  const getContext = useCallback(() => ({
    organizationId: currentOrganization?.id || '', // Use currentOrganization instead of user.uid
    userId: user?.uid || ''
  }), [currentOrganization?.id, user?.uid]);

  const loadDomains = useCallback(async () => {
    if (!user || !currentOrganization?.id) return;

    try {
      setLoading(true);
      const context = getContext();
      const data = await domainServiceEnhanced.getAll(context.organizationId);
      setDomains(data);
    } catch (error: any) {
      console.error('Domain loading error:', error);
      toastService.error('Domain loading failed');
    } finally {
      setLoading(false);
    }
  }, [user, currentOrganization?.id, getContext]);

  useEffect(() => {
    // Only load domains when auth and organization are fully loaded
    if (!authLoading && !orgLoading && user && currentOrganization?.id) {
      loadDomains();
    }
  }, [authLoading, orgLoading, user, currentOrganization?.id, loadDomains]);

  const handleVerify = async (domainId: string) => {
    try {
      setVerifying(domainId);

      const domain = domains.find(d => d.id === domainId);
      if (!domain || !domain.sendgridDomainId) {
        toastService.error('Domain or SendGrid ID not found');
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
      toastService.error(error.message || 'Verification failed');
    } finally {
      setVerifying(null);
    }
  };

  const checkDnsStatus = async (domainId: string) => {
    try {
      setCheckingDns(domainId);

      const domain = domains.find(d => d.id === domainId);
      if (!domain || !domain.dnsRecords || domain.dnsRecords.length === 0) {
        toastService.error('Domain or DNS records not found');
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
      toastService.error('DNS check failed');
    } finally {
      setCheckingDns(null);
    }
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm(t('deleteConfirm'))) {
      return;
    }

    try {
      const domain = domains.find(d => d.id === domainId);

      if (domain?.sendgridDomainId) {
        try {
          await apiClient.delete(`/api/email/domains/${domainId}`);
        } catch (apiError) {
        }
      }

      const context = getContext();
      await domainServiceEnhanced.softDelete(domainId, context);
      await loadDomains();
      toastService.success('Domain deleted successfully');

    } catch (error: any) {
      toastService.error('Failed to delete domain');
    }
  };

  const getStatusBadge = (status: DomainStatus) => {
    const colors = {
      pending: { bg: 'yellow', icon: ClockIcon, text: t('status.pending') },
      verified: { bg: 'green', icon: CheckCircleIcon, text: t('status.verified') },
      failed: { bg: 'red', icon: XCircleIcon, text: t('status.failed') }
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
    if (!timestamp) return t('unknown');
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: de });
    } catch {
      return t('unknown');
    }
  };

  return (
    <>
      <div className="flex flex-col gap-10 lg:flex-row">
        {/* Linke Spalte: Navigation */}
        <aside className="w-full lg:w-64 lg:flex-shrink-0">
          <SettingsNav />
        </aside>

        {/* Rechte Spalte: Hauptinhalt */}
        <div className="flex-1">
          {(authLoading || orgLoading || loading) ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
                <Text className="mt-4">{t('loading')}</Text>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="min-w-0 flex-1">
                  <Heading level={1}>{t('title')}</Heading>
                  <Text className="mt-2 text-gray-600">
                    {t('description')}
                  </Text>
                </div>
                <div className="mt-4 md:mt-0 flex gap-3">
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    {t('addDomain')}
                  </Button>
                </div>
              </div>

              {/* Info Alert für Erstnutzer */}
              {domains.length === 0 && !loading && (
                <InfoAlert>
                  <div className="flex gap-3">
                    <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <Text className="font-semibold text-blue-800">{t('infoAlert.title')}</Text>
                      <Text className="text-sm mt-1 text-blue-700">
                        {t('infoAlert.description')}
                      </Text>
                    </div>
                  </div>
                </InfoAlert>
              )}

              {/* Domains List */}
              {domains.length > 0 && (
                <div className="space-y-4 mt-6">
                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="bg-white ring-1 ring-gray-900/5 rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{domain.domain}</h3>
                            {getStatusBadge(domain.status)}
                            {domain.isDefault && (
                              <Badge color="blue" className="whitespace-nowrap">{t('badge.default')}</Badge>
                            )}
                          </div>

                          <Text className="text-sm text-gray-500 mt-1">
                            {t('addedAt', { date: formatDate(domain.createdAt) })}
                          </Text>

                          {domain.status !== 'verified' && domain.dnsCheckResults && (
                            <DnsStatusCard
                              results={domain.dnsCheckResults}
                              onRefresh={() => checkDnsStatus(domain.id!)}
                              isRefreshing={checkingDns === domain.id}
                            />
                          )}

                          {domain.status === 'verified' && domain.inboxTests && domain.inboxTests.length > 0 && (
                            <div className="mt-4 flex items-center gap-4">
                              {typeof domain.inboxTestScore === 'number' && (
                                <div className="flex items-center gap-2">
                                  <div className="text-sm text-gray-600">{t('deliveryRate')}</div>
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
                            </div>
                          )}

                          {domain.provider && domain.provider !== 'other' && (
                            <div className="mt-2">
                              <Text className="text-sm text-gray-600">
                                {t('provider', { name: domain.provider })}
                              </Text>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {domain.status === 'verified' ? (
                            <>
                              <Button plain onClick={() => setShowInboxTest(domain.id!)}>
                                <EnvelopeIcon className="w-4 h-4" />
                                {t('actions.testInbox')}
                              </Button>
                              {!domain.isDefault && (
                                <Button
                                  plain
                                  onClick={async () => {
                                    await domainServiceEnhanced.setAsDefault(domain.id!, getContext());
                                    await loadDomains();
                                  }}
                                >
                                  {t('actions.setDefault')}
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
                                {t('actions.dnsRecords')}
                              </Button>
                              <Button
                                plain
                                onClick={() => handleVerify(domain.id!)}
                                disabled={verifying === domain.id}
                              >
                                <ArrowPathIcon
                                  className={`w-4 h-4 ${verifying === domain.id ? 'animate-spin' : ''}`}
                                />
                                {t('actions.verify')}
                              </Button>
                            </>
                          )}
                          <Button plain onClick={() => handleDelete(domain.id!)}>
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
                    {t('emptyState.message')}
                  </Text>
                  <Button onClick={() => setShowAddModal(true)} className="whitespace-nowrap">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    {t('emptyState.action')}
                  </Button>
                  <Text className="text-sm text-gray-500 mt-4">
                    {t('emptyState.hint')}
                  </Text>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
    </>
  );
}