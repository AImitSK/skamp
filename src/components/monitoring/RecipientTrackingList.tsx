'use client';

import { useState } from 'react';
import { EmailCampaignSend } from '@/types/email';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import {
  EyeIcon,
  CursorArrowRaysIcon,
  NewspaperIcon,
  LinkIcon,
  EllipsisVerticalIcon,
  DocumentCheckIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
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

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '-';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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

        {filteredSends.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <Text className="text-gray-500">Keine Empfänger gefunden</Text>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empfänger</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interaktion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veröffentlichung</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {
                filteredSends.map((send) => (
                  <tr key={send.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <Text className="font-medium text-gray-900">
                          {send.recipientName}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          {send.recipientEmail}
                        </Text>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {getStatusBadge(send)}
                        {getPublishStatusBadge(send)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3 text-sm">
                        {send.openCount !== undefined && send.openCount > 0 && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <EyeIcon className="h-4 w-4" />
                            {send.openCount}x
                          </span>
                        )}
                        {send.clickCount !== undefined && send.clickCount > 0 && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <CursorArrowRaysIcon className="h-4 w-4" />
                            {send.clickCount}x
                          </span>
                        )}
                        {!send.openCount && !send.clickCount && (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {send.publishedStatus === 'published' && send.articleUrl ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <CalendarIcon className="h-4 w-4" />
                            {formatDate(send.publishedAt)}
                          </div>
                          {send.articleTitle && (
                            <Text className="text-sm text-gray-600 truncate max-w-xs">
                              {send.articleTitle}
                            </Text>
                          )}
                          {send.reach && (
                            <Text className="text-xs text-gray-500">
                              Reichweite: {send.reach.toLocaleString('de-DE')}
                            </Text>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Dropdown>
                        <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
                          <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          {send.publishedStatus === 'published' && send.articleUrl && (
                            <>
                              <DropdownItem
                                onClick={() => window.open(send.articleUrl, '_blank')}
                              >
                                <LinkIcon className="h-4 w-4" />
                                Artikel ansehen
                              </DropdownItem>
                              <DropdownDivider />
                            </>
                          )}
                          {send.status !== 'bounced' && send.status !== 'failed' && send.publishedStatus !== 'published' && (
                            <DropdownItem onClick={() => setSelectedSend(send)}>
                              <DocumentCheckIcon className="h-4 w-4" />
                              Als veröffentlicht markieren
                            </DropdownItem>
                          )}
                        </DropdownMenu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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