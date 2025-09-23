'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartBarIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { prService } from '@/lib/firebase/pr-service';

export default function MonitoringPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');

  useEffect(() => {
    loadCampaigns();
  }, [currentOrganization?.id]);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchTerm, projectFilter]);

  const loadCampaigns = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);
      const allCampaigns = await prService.getAll(currentOrganization.id);

      const sentCampaigns = allCampaigns.filter((c: any) =>
        c.status === 'sent' || c.emailSends?.length > 0
      );

      const campaignsWithStats = await Promise.all(
        sentCampaigns.map(async (campaign: any) => {
          const sends = await emailCampaignService.getSends(campaign.id!, {
            organizationId: currentOrganization.id
          });

          const stats = {
            total: sends.length,
            delivered: sends.filter((s: any) => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length,
            opened: sends.filter((s: any) => s.status === 'opened' || s.status === 'clicked').length,
            clicked: sends.filter((s: any) => s.status === 'clicked').length,
            bounced: sends.filter((s: any) => s.status === 'bounced').length,
          };

          return {
            ...campaign,
            stats
          };
        })
      );

      setCampaigns(campaignsWithStats);
    } catch (error) {
      console.error('Fehler beim Laden der Kampagnen:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCampaigns = () => {
    let filtered = [...campaigns];

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (projectFilter !== 'all') {
      if (projectFilter === 'none') {
        filtered = filtered.filter(c => !c.projectId);
      } else {
        filtered = filtered.filter(c => c.projectId === projectFilter);
      }
    }

    setFilteredCampaigns(filtered);
  };

  const getBounceRateColor = (rate: number) => {
    if (rate > 10) return 'text-red-600';
    if (rate > 5) return 'text-orange-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Lade Monitoring-Daten...</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <ChartBarIcon className="h-8 w-8 text-primary" />
          <Heading>PR-Monitoring & Versandhistorie</Heading>
        </div>
        <Text>Überwache alle versendeten Pressemeldungen und deren Performance</Text>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Kampagne suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="all">Alle Projekte</option>
          <option value="none">Ohne Projekt</option>
        </Select>
      </div>

      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <Subheading>Noch keine versendeten Kampagnen</Subheading>
          <Text className="text-gray-500">Versende deine erste Kampagne, um das Monitoring zu nutzen</Text>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kampagne</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projekt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Versendet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredCampaigns.map((campaign) => {
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
                      <div>
                        <Text className="font-medium text-gray-900">{campaign.title}</Text>
                        <div className="flex gap-4 mt-1 text-sm">
                          <span className="text-green-600">✅ {campaign.stats.opened} geöffnet ({openRate}%)</span>
                          {campaign.stats.bounced > 0 && (
                            <span className={getBounceRateColor(bounceRate)}>
                              ❌ {campaign.stats.bounced} bounced ({bounceRate}%)
                              {bounceRate > 5 && ' ⚠️'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {campaign.projectId ? (
                        <Badge color="blue">Projekt</Badge>
                      ) : (
                        <Text className="text-gray-500">-</Text>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Text className="text-gray-600">
                        {campaign.sentAt ? new Date(campaign.sentAt.toDate()).toLocaleDateString('de-DE') : '-'}
                      </Text>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-sm">
                        <span>📧 {campaign.stats.total}</span>
                        <span className="text-gray-500">📰 0</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        outline
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/pr-tools/monitoring/${campaign.id}`);
                        }}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}