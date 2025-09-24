'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, DocumentTextIcon, ChartBarIcon, NewspaperIcon } from '@heroicons/react/24/outline';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { prService } from '@/lib/firebase/pr-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { EmailPerformanceStats } from '@/components/monitoring/EmailPerformanceStats';
import { RecipientTrackingList } from '@/components/monitoring/RecipientTrackingList';
import { ClippingArchive } from '@/components/monitoring/ClippingArchive';
import { EmailCampaignSend } from '@/types/email';
import { PRCampaign } from '@/types/pr';
import { MediaClipping } from '@/types/monitoring';
import Link from 'next/link';

export default function MonitoringDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const campaignId = params.campaignId as string;

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [sends, setSends] = useState<EmailCampaignSend[]>([]);
  const [clippings, setClippings] = useState<MediaClipping[]>([]);
  const [activeTab, setActiveTab] = useState<'performance' | 'recipients' | 'clippings'>('performance');

  useEffect(() => {
    loadData();
  }, [campaignId, currentOrganization?.id]);

  const loadData = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);

      const [campaignData, sendsData, clippingsData] = await Promise.all([
        prService.getById(campaignId, currentOrganization.id),
        emailCampaignService.getSends(campaignId, {
          organizationId: currentOrganization.id
        }),
        clippingService.getByCampaignId(campaignId, {
          organizationId: currentOrganization.id
        })
      ]);

      setCampaign(campaignData);
      setSends(sendsData);
      setClippings(clippingsData);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendUpdated = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <Text className="ml-3">Lade Monitoring-Daten...</Text>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <Text className="text-gray-500">Kampagne nicht gefunden</Text>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard/pr-tools/monitoring">
            <Button plain className="p-2">
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
          </Link>
          <Heading>Monitoring: {campaign.title}</Heading>
        </div>
        <Text className="text-gray-600">
          Versendet am {campaign.sentAt ? new Date(campaign.sentAt.toDate()).toLocaleDateString('de-DE') : 'N/A'}
        </Text>
      </div>

      {/* Tab Navigation in white box */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex space-x-6">
              <button
                type="button"
                onClick={() => setActiveTab('performance')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'performance'
                    ? 'text-[#005fab] border-b-2 border-[#005fab]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ChartBarIcon className="w-4 h-4 mr-2" />
                E-Mail Performance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('recipients')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'recipients'
                    ? 'text-[#005fab] border-b-2 border-[#005fab]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                Empfänger & Veröffentlichungen
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('clippings')}
                className={`flex items-center pb-2 text-sm font-medium ${
                  activeTab === 'clippings'
                    ? 'text-[#005fab] border-b-2 border-[#005fab]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <NewspaperIcon className="w-4 h-4 mr-2" />
                Clipping-Archiv ({clippings.length})
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'performance' && (
            <EmailPerformanceStats sends={sends} />
          )}

          {activeTab === 'recipients' && (
            <RecipientTrackingList
              sends={sends}
              campaignId={campaignId}
              onSendUpdated={handleSendUpdated}
            />
          )}

          {activeTab === 'clippings' && (
            <ClippingArchive clippings={clippings} />
          )}
        </div>
      </div>
    </div>
  );
}