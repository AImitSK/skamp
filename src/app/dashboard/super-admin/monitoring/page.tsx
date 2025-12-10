'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heading } from '@/components/ui/heading';
import { SystemOverview } from '@/components/admin/SystemOverview';
import { OrganizationStatsTable } from '@/components/admin/OrganizationStatsTable';
import { CrawlerControlPanel } from '@/components/admin/CrawlerControlPanel';
import { ErrorLogTable } from '@/components/admin/ErrorLogTable';
import { ChannelHealthTable } from '@/components/admin/ChannelHealthTable';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from 'next-intl';

type TabType = 'organizations' | 'channel-health' | 'error-logs';

export default function MonitoringControlCenterPage() {
  const t = useTranslations('superadmin.monitoring');
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [cronJobStatus, setCronJobStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('organizations');

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      const token = await user.getIdToken();

      const [statsResponse, statusResponse] = await Promise.all([
        fetch('/api/admin/monitoring-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/crawler-status', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!statsResponse.ok || !statusResponse.ok) {
        const errorData = await statsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || t('errors.accessDenied'));
      }

      const statsData = await statsResponse.json();
      const statusData = await statusResponse.json();

      setStats(statsData);
      setCronJobStatus(statusData);
    } catch (err: any) {
      console.error('Error loading monitoring data:', err);
      setError(err.message || t('errors.loadingData'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handlePauseCronJob = async (reason: string) => {
    if (!user) return;
    const token = await user.getIdToken();

    await fetch('/api/admin/crawler-control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'pause', payload: { reason } })
    });
    loadData();
  };

  const handleResumeCronJob = async () => {
    if (!user) return;
    const token = await user.getIdToken();

    await fetch('/api/admin/crawler-control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'resume' })
    });
    loadData();
  };

  const handleTriggerAll = async () => {
    if (!user) return;
    const token = await user.getIdToken();

    await fetch('/api/admin/crawler-control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'trigger_all' })
    });
    alert(t('alerts.crawlerStarted'));
    setTimeout(() => loadData(), 2000);
  };

  const handleTriggerOrg = async (organizationId: string) => {
    if (!user) return;
    const token = await user.getIdToken();

    await fetch('/api/admin/crawler-control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'trigger_org',
        payload: { organizationId }
      })
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <Text className="ml-3">{t('loading')}</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <Text className="text-red-800 font-medium">{t('errors.accessDeniedTitle')}</Text>
          <Text className="text-red-600 mt-2">{error}</Text>
          <Text className="text-red-500 text-sm mt-4">
            {t('errors.superAdminOnly')}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Heading>{t('title')}</Heading>

      {/* System Overview */}
      {stats && (
        <div className="mt-6">
          <SystemOverview stats={stats.system} />
        </div>
      )}

      {/* Control Panel */}
      {cronJobStatus && (
        <div className="mt-6">
          <CrawlerControlPanel
            cronJobStatus={cronJobStatus}
            onPause={handlePauseCronJob}
            onResume={handleResumeCronJob}
            onTriggerAll={handleTriggerAll}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mt-8">
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex space-x-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('organizations')}
                  className={`flex items-center pb-2 text-sm font-medium ${
                    activeTab === 'organizations'
                      ? 'text-[#005fab] border-b-2 border-[#005fab]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('tabs.organizations')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('channel-health')}
                  className={`flex items-center pb-2 text-sm font-medium ${
                    activeTab === 'channel-health'
                      ? 'text-[#005fab] border-b-2 border-[#005fab]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('tabs.channelHealth')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('error-logs')}
                  className={`flex items-center pb-2 text-sm font-medium ${
                    activeTab === 'error-logs'
                      ? 'text-[#005fab] border-b-2 border-[#005fab]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('tabs.errorLogs', { count: stats?.errorLogs?.length || 0 })}
                </button>
              </div>
            </div>
          </div>

          {/* Tab Panels */}
          <div className="p-6">
            {activeTab === 'organizations' && stats && (
              <OrganizationStatsTable
                organizations={stats.organizations}
                onTriggerOrgCrawl={handleTriggerOrg}
              />
            )}

            {activeTab === 'channel-health' && stats && (
              <ChannelHealthTable channels={stats.channelHealth} />
            )}

            {activeTab === 'error-logs' && stats && (
              <ErrorLogTable logs={stats.errorLogs} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
