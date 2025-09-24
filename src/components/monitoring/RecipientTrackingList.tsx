'use client';

import { useState } from 'react';
import { EmailCampaignSend } from '@/types/email';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { MarkPublishedModal } from './MarkPublishedModal';

interface RecipientTrackingListProps {
  sends: EmailCampaignSend[];
  campaignId: string;
  onSendUpdated: () => void;
}

export function RecipientTrackingList({ sends, campaignId, onSendUpdated }: RecipientTrackingListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSend, setSelectedSend] = useState<EmailCampaignSend | null>(null);

  const filteredSends = sends.filter(send => {
    const matchesSearch = send.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          send.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'published' && send.publishedStatus === 'published') ||
                          (statusFilter === 'not_published' && (!send.publishedStatus || send.publishedStatus === 'not_published'));

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (send: EmailCampaignSend) => {
    if (send.status === 'bounced') {
      return <Badge color="red">Bounce</Badge>;
    }
    if (send.status === 'failed') {
      return <Badge color="red">Fehler</Badge>;
    }
    if (send.status === 'clicked') {
      return <Badge color="green">Geklickt</Badge>;
    }
    if (send.status === 'opened') {
      return <Badge color="blue">Geöffnet</Badge>;
    }
    if (send.status === 'delivered') {
      return <Badge color="blue">Zugestellt</Badge>;
    }
    return <Badge color="zinc">Versendet</Badge>;
  };

  const getPublishStatusBadge = (send: EmailCampaignSend) => {
    if (send.publishedStatus === 'published') {
      return <Badge color="green">Veröffentlicht</Badge>;
    }
    if (send.publishedStatus === 'pending') {
      return <Badge color="yellow">Ausstehend</Badge>;
    }
    if (send.publishedStatus === 'declined') {
      return <Badge color="red">Abgelehnt</Badge>;
    }
    return null;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Empfänger suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-56">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Alle</option>
              <option value="published">Veröffentlicht</option>
              <option value="not_published">Nicht veröffentlicht</option>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredSends.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <Text className="text-gray-500">Keine Empfänger gefunden</Text>
            </div>
          ) : (
            filteredSends.map((send) => (
              <div
                key={send.id}
                className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Text className="font-medium text-gray-900">
                        {send.recipientName}
                      </Text>
                      {getStatusBadge(send)}
                      {getPublishStatusBadge(send)}
                    </div>

                    <Text className="text-sm text-gray-600 mb-2">
                      {send.recipientEmail}
                    </Text>

                    <div className="flex gap-4 text-sm text-gray-500">
                      {send.openCount !== undefined && send.openCount > 0 && (
                        <span>👁️ {send.openCount}x geöffnet</span>
                      )}
                      {send.clickCount !== undefined && send.clickCount > 0 && (
                        <span>🖱️ {send.clickCount}x geklickt</span>
                      )}
                    </div>

                    {send.publishedStatus === 'published' && send.articleUrl && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <Text className="text-sm font-medium text-gray-700 mb-1">
                          📰 Veröffentlicht am {send.publishedAt ? new Date(send.publishedAt.toDate()).toLocaleDateString('de-DE') : 'N/A'}
                        </Text>
                        {send.articleTitle && (
                          <Text className="text-sm text-gray-600 mb-1">{send.articleTitle}</Text>
                        )}
                        <div className="flex gap-4 items-center">
                          <a
                            href={send.articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            Artikel ansehen →
                          </a>
                          {send.reach && (
                            <Text className="text-sm text-gray-500">Reichweite: {send.reach.toLocaleString('de-DE')}</Text>
                          )}
                          {send.sentiment && (
                            <Text className="text-sm">
                              {send.sentiment === 'positive' && '😊 Positiv'}
                              {send.sentiment === 'neutral' && '😐 Neutral'}
                              {send.sentiment === 'negative' && '😞 Negativ'}
                            </Text>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    {send.status !== 'bounced' && send.status !== 'failed' && send.publishedStatus !== 'published' && (
                      <Button
                        outline
                        onClick={() => setSelectedSend(send)}
                      >
                        Als veröffentlicht markieren
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedSend && (
        <MarkPublishedModal
          send={selectedSend}
          campaignId={campaignId}
          onClose={() => setSelectedSend(null)}
          onSuccess={() => {
            setSelectedSend(null);
            onSendUpdated();
          }}
        />
      )}
    </>
  );
}