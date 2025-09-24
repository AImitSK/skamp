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
import { ChartBarIcon, EyeIcon, ExclamationCircleIcon, EnvelopeIcon, NewspaperIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import { SearchInput } from '@/components/ui/search-input';
import { useRouter } from 'next/navigation';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { prService } from '@/lib/firebase/pr-service';
import { clippingService } from '@/lib/firebase/clipping-service';

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

      console.log('📊 All campaigns:', allCampaigns);
      console.log('📊 Campaigns count:', allCampaigns.length);

      // Prüfe für jede Kampagne ob sie Sends hat und lade Clippings
      const campaignsWithSends = await Promise.all(
        allCampaigns.map(async (campaign: any) => {
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

      // Filtere nur Kampagnen die tatsächlich versendet wurden (haben Sends)
      const sentCampaigns = campaignsWithSends.filter(({ sends }) => sends.length > 0);

      console.log('📊 Sent campaigns:', sentCampaigns);
      console.log('📊 Sent campaigns count:', sentCampaigns.length);

      const campaignsWithStats = sentCampaigns.map(({ campaign, sends, clippings }) => {
        const stats = {
          total: sends.length,
          delivered: sends.filter((s: any) => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length,
          opened: sends.filter((s: any) => s.status === 'opened' || s.status === 'clicked').length,
          clicked: sends.filter((s: any) => s.status === 'clicked').length,
          bounced: sends.filter((s: any) => s.status === 'bounced').length,
          clippings: clippings.length
        };

        return {
          ...campaign,
          stats
        };
      });

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
        <Text>Überwache alle versendeten Pressemeldungen und deren Performance (E-Mail Tracking & Clippings)</Text>
      </div>

      <div className="flex gap-2 items-center">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Kampagnen durchsuchen..."
          className="flex-1"
        />
        <div className="w-48">
          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="all">Alle Projekte</option>
            <option value="none">Ohne Projekt</option>
          </Select>
        </div>
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
                        <div className="font-semibold text-gray-900 truncate max-w-md">{campaign.title}</div>
                        <div className="flex gap-4 mt-1 text-sm items-center">
                          <span className="text-gray-600 flex items-center gap-1">
                            <EyeIcon className="h-4 w-4" />
                            {campaign.stats.opened} geöffnet ({openRate}%)
                          </span>
                          {campaign.stats.bounced > 0 && (
                            <span className={`${getBounceRateColor(bounceRate)} flex items-center gap-1`}>
                              <ExclamationCircleIcon className="h-4 w-4" />
                              {campaign.stats.bounced} bounced ({bounceRate}%)
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
                    <td className="px-6 py-4 text-right">
                      <Dropdown>
                        <DropdownButton
                          plain
                          className="p-1.5 hover:bg-gray-100 rounded-md"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          <DropdownItem onClick={() => router.push(`/dashboard/pr-tools/monitoring/${campaign.id}`)}>
                            <ChartBarIcon className="h-4 w-4" />
                            Details
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
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