'use client';

import { useState, useEffect } from 'react';
import { Heading } from '@/components/ui/heading';
import { SystemOverview } from '@/components/admin/SystemOverview';
import { OrganizationStatsTable } from '@/components/admin/OrganizationStatsTable';
import { CrawlerControlPanel } from '@/components/admin/CrawlerControlPanel';
import { ErrorLogTable } from '@/components/admin/ErrorLogTable';
import { ChannelHealthTable } from '@/components/admin/ChannelHealthTable';
import { Text } from '@/components/ui/text';

type TabType = 'organizations' | 'channel-health' | 'error-logs';

export default function MonitoringControlCenterPage() {
  const [stats, setStats] = useState<any>(null);
  const [cronJobStatus, setCronJobStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('organizations');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsResponse, statusResponse] = await Promise.all([
        fetch('/api/admin/monitoring-stats'),
        fetch('/api/admin/crawler-status')
      ]);

      const statsData = await statsResponse.json();
      const statusData = await statusResponse.json();

      setStats(statsData);
      setCronJobStatus(statusData);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseCronJob = async (reason: string) => {
    await fetch('/api/admin/crawler-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause', payload: { reason } })
    });
    loadData();
  };

  const handleResumeCronJob = async () => {
    await fetch('/api/admin/crawler-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' })
    });
    loadData();
  };

  const handleTriggerAll = async () => {
    await fetch('/api/admin/crawler-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'trigger_all' })
    });
    alert('Crawler gestartet! Ergebnisse erscheinen in wenigen Minuten.');
    // Daten nach 2 Sekunden neu laden
    setTimeout(() => loadData(), 2000);
  };

  const handleTriggerOrg = async (organizationId: string) => {
    await fetch('/api/admin/crawler-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        <Text className="ml-3">Lade Monitoring-Daten...</Text>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Heading>Monitoring & Control Center</Heading>

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
                  Organizations
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
                  Channel Health
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
                  Error Logs ({stats?.errorLogs?.length || 0})
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
