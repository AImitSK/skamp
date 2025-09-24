'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { ChartBarIcon, EyeIcon, ExclamationCircleIcon, EnvelopeIcon, NewspaperIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { prService } from '@/lib/firebase/pr-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { EmailPerformanceStats } from '@/components/monitoring/EmailPerformanceStats';
import { RecipientTrackingList } from '@/components/monitoring/RecipientTrackingList';
import { ClippingArchive } from '@/components/monitoring/ClippingArchive';

interface ProjectMonitoringTabProps {
  projectId: string;
}

export function ProjectMonitoringTab({ projectId }: ProjectMonitoringTabProps) {
  const { currentOrganization } = useOrganization();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [allSends, setAllSends] = useState<any[]>([]);
  const [allClippings, setAllClippings] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [projectId, currentOrganization?.id]);

  const loadData = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);

      const projectCampaigns = await prService.getByProject(projectId, currentOrganization.id);

      const campaignsWithData = await Promise.all(
        projectCampaigns.map(async (campaign: any) => {
          const [sends, clippings] = await Promise.all([
            emailCampaignService.getSends(campaign.id!, {
              organizationId: currentOrganization.id
            }),
            clippingService.getByCampaignId(campaign.id!, {
              organizationId: currentOrganization.id
            })
          ]);
          return { campaign, sends, clippings };
        })
      );

      const sentCampaigns = campaignsWithData.filter(({ sends }) => sends.length > 0);

      const allSendsArr = sentCampaigns.flatMap(({ sends }) => sends);
      const allClippingsArr = sentCampaigns.flatMap(({ clippings }) => clippings);

      setCampaigns(sentCampaigns.map(({ campaign, sends, clippings }) => ({
        ...campaign,
        stats: {
          total: sends.length,
          delivered: sends.filter((s: any) => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length,
          opened: sends.filter((s: any) => s.status === 'opened' || s.status === 'clicked').length,
          clicked: sends.filter((s: any) => s.status === 'clicked').length,
          bounced: sends.filter((s: any) => s.status === 'bounced').length,
          clippings: clippings.length
        }
      })));

      setAllSends(allSendsArr);
      setAllClippings(allClippingsArr);
    } catch (error) {
      console.error('Fehler beim Laden der Monitoring-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendUpdated = () => {
    loadData();
  };

  const totalSends = allSends.length;
  const totalClippings = allClippings.length;
  const totalReach = allClippings.reduce((sum, c) => sum + (c.reach || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <Text className="ml-3">Lade Monitoring-Daten...</Text>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <Subheading>Noch keine versendeten Kampagnen</Subheading>
        <Text className="text-gray-500">Versende deine erste Kampagne in diesem Projekt</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Subheading className="mb-4">📈 Projekt-Statistiken</Subheading>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <Text className="text-sm text-gray-600">Kampagnen</Text>
            <div className="text-2xl font-semibold text-gray-900 mt-1">
              {campaigns.length}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <Text className="text-sm text-gray-600">Gesamt-Empfänger</Text>
            <div className="text-2xl font-semibold text-gray-900 mt-1">
              {totalSends}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <Text className="text-sm text-gray-600">Clippings</Text>
            <div className="text-2xl font-semibold text-gray-900 mt-1">
              {totalClippings}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <Text className="text-sm text-gray-600">Gesamtreichweite</Text>
            <div className="text-2xl font-semibold text-gray-900 mt-1">
              {totalReach > 0 ? totalReach.toLocaleString('de-DE') : '-'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Subheading className="mb-4">📋 Kampagnen in diesem Projekt</Subheading>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kampagne</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Versendet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {campaigns.map((campaign) => {
                const openRate = campaign.stats.total > 0
                  ? Math.round((campaign.stats.opened / campaign.stats.total) * 100)
                  : 0;
                const bounceRate = campaign.stats.total > 0
                  ? Math.round((campaign.stats.bounced / campaign.stats.total) * 100)
                  : 0;

                return (
                  <tr
                    key={campaign.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/pr-tools/monitoring/${campaign.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 truncate max-w-md">{campaign.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Text className="text-gray-600">
                        {campaign.sentAt ? new Date(campaign.sentAt.toDate()).toLocaleDateString('de-DE') : '-'}
                      </Text>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-4 text-sm items-center">
                        <span className="text-gray-600 flex items-center gap-1">
                          <EyeIcon className="h-4 w-4" />
                          {campaign.stats.opened} ({openRate}%)
                        </span>
                        {campaign.stats.bounced > 0 && (
                          <span className={`flex items-center gap-1 ${bounceRate > 5 ? 'text-red-600' : 'text-gray-600'}`}>
                            <ExclamationCircleIcon className="h-4 w-4" />
                            {campaign.stats.bounced}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                          {campaign.stats.total}
                        </span>
                        <span className={`flex items-center gap-1 ${campaign.stats.clippings > 0 ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                          <NewspaperIcon className="h-4 w-4" />
                          {campaign.stats.clippings}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <EmailPerformanceStats sends={allSends} />

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Subheading className="mb-4">📋 Alle Empfänger & Veröffentlichungen</Subheading>
        <RecipientTrackingList
          sends={allSends}
          campaignId={projectId}
          onSendUpdated={handleSendUpdated}
        />
      </div>

      <ClippingArchive clippings={allClippings} />
    </div>
  );
}