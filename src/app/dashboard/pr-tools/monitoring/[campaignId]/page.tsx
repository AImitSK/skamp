'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeftIcon,
  ChartBarIcon,
  EnvelopeIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ExclamationCircleIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { prService } from '@/lib/firebase/pr-service';

export default function MonitoringDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const campaignId = params.campaignId as string;

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [sends, setSends] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(true);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, [campaignId, currentOrganization?.id]);

  const loadData = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(false);

      const campaignData = await prService.getById(campaignId, {
        organizationId: currentOrganization.id
      });
      setCampaign(campaignData);

      const sendData = await emailCampaignService.getSends(campaignId, {
        organizationId: currentOrganization.id
      });
      setSends(sendData);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    }
  };

  const stats = {
    total: sends.length,
    delivered: sends.filter(s => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length,
    opened: sends.filter(s => s.status === 'opened' || s.status === 'clicked').length,
    clicked: sends.filter(s => s.status === 'clicked').length,
    bounced: sends.filter(s => s.status === 'bounced').length,
  };

  const openRate = stats.total > 0 ? Math.round((stats.opened / stats.total) * 100) : 0;
  const clickRate = stats.total > 0 ? Math.round((stats.clicked / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Lade Monitoring-Daten...</Text>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <Text>Kampagne nicht gefunden</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            outline
            onClick={() => router.push('/dashboard/pr-tools/monitoring')}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <Heading>{campaign.title}</Heading>
            <Text className="text-gray-500">Kampagnen-Monitoring</Text>
          </div>
        </div>
        <Button
          outline
          onClick={() => setShowDebug(!showDebug)}
        >
          <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
          {showDebug ? 'Debug ausblenden' : 'Debug anzeigen'}
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="h-5 w-5 text-primary mr-2" />
          <Subheading>E-Mail Performance</Subheading>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <EnvelopeIcon className="h-8 w-8 text-gray-400" />
              <Text className="text-2xl font-bold">{stats.total}</Text>
            </div>
            <Text className="text-sm text-gray-600 mt-2">Versendet</Text>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <EnvelopeIcon className="h-8 w-8 text-green-600" />
              <Text className="text-2xl font-bold text-green-600">{stats.delivered}</Text>
            </div>
            <Text className="text-sm text-gray-600 mt-2">Zugestellt</Text>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <EyeIcon className="h-8 w-8 text-blue-600" />
              <Text className="text-2xl font-bold text-blue-600">{stats.opened}</Text>
            </div>
            <Text className="text-sm text-gray-600 mt-2">Geöffnet ({openRate}%)</Text>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <CursorArrowRaysIcon className="h-8 w-8 text-purple-600" />
              <Text className="text-2xl font-bold text-purple-600">{stats.clicked}</Text>
            </div>
            <Text className="text-sm text-gray-600 mt-2">Geklickt ({clickRate}%)</Text>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <ExclamationCircleIcon className="h-8 w-8 text-red-600" />
              <Text className="text-2xl font-bold text-red-600">{stats.bounced}</Text>
            </div>
            <Text className="text-sm text-gray-600 mt-2">Bounced</Text>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <Subheading>Empfänger & Status</Subheading>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empfänger</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zugestellt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Geöffnet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Geklickt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sends.map((send) => (
                <tr key={send.id}>
                  <td className="px-6 py-4">
                    <Text className="font-medium">{send.recipientName}</Text>
                    <Text className="text-sm text-gray-500">{send.recipientEmail}</Text>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={
                      send.status === 'clicked' ? 'purple' :
                      send.status === 'opened' ? 'blue' :
                      send.status === 'delivered' ? 'green' :
                      send.status === 'bounced' ? 'red' :
                      'gray'
                    }>
                      {send.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {send.deliveredAt ? (
                      <Text className="text-sm">
                        {new Date(send.deliveredAt.toDate()).toLocaleString('de-DE')}
                      </Text>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {send.openedAt ? (
                      <div>
                        <Text className="text-sm">
                          {new Date(send.openedAt.toDate()).toLocaleString('de-DE')}
                        </Text>
                        {send.openCount > 1 && (
                          <Text className="text-xs text-gray-500">({send.openCount}x)</Text>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {send.clickedAt ? (
                      <div>
                        <Text className="text-sm">
                          {new Date(send.clickedAt.toDate()).toLocaleString('de-DE')}
                        </Text>
                        {send.clickCount > 1 && (
                          <Text className="text-xs text-gray-500">({send.clickCount}x)</Text>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDebug && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <WrenchScrewdriverIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <Subheading className="text-yellow-900">🔧 Debug-Ansicht (Entwicklung)</Subheading>
          </div>

          <div className="space-y-4">
            <div>
              <Text className="font-medium text-yellow-900 mb-2">Firestore-Daten (email_campaign_sends):</Text>
              <pre className="bg-white p-4 rounded border border-yellow-200 overflow-x-auto text-xs">
                {JSON.stringify(sends, null, 2)}
              </pre>
            </div>

            <div>
              <Text className="font-medium text-yellow-900 mb-2">Kampagnen-Daten:</Text>
              <pre className="bg-white p-4 rounded border border-yellow-200 overflow-x-auto text-xs">
                {JSON.stringify(campaign, null, 2)}
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <Text className="font-medium text-blue-900 mb-2">💡 Test-Anleitung:</Text>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Öffne die Test-E-Mail in deinem Postfach</li>
                <li>Diese Seite aktualisiert sich automatisch alle 5 Sekunden</li>
                <li>Nach Öffnen: Status sollte zu "opened" wechseln</li>
                <li>Nach Link-Klick: Status sollte zu "clicked" wechseln</li>
                <li>Prüfe ob openCount / clickCount hochzählt</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}