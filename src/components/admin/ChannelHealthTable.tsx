'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Timestamp } from 'firebase-admin/firestore';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface ChannelHealthTableProps {
  channels: Array<{
    channelId: string;
    type: 'rss_feed' | 'google_news';
    url: string;
    publicationName: string;
    errorCount: number;
    lastError?: string;
    lastSuccess?: Timestamp;
    organizationId: string;
  }>;
}

export function ChannelHealthTable({ channels }: ChannelHealthTableProps) {
  // Nur Channels mit Fehlern anzeigen
  const problematicChannels = channels.filter(c => c.errorCount > 0);

  if (problematicChannels.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <Text className="text-gray-500">Alle Channels funktionieren einwandfrei 🎉</Text>
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>Publication</TableHeader>
          <TableHeader>Typ</TableHeader>
          <TableHeader>URL</TableHeader>
          <TableHeader>Fehler (letzte 10)</TableHeader>
          <TableHeader>Letzter Erfolg</TableHeader>
          <TableHeader>Letzter Fehler</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {problematicChannels.map((channel) => (
          <TableRow key={channel.channelId}>
            <TableCell>
              <div className="flex items-center gap-2">
                {channel.errorCount >= 5 && (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                )}
                <Text className="font-medium">{channel.publicationName}</Text>
              </div>
            </TableCell>
            <TableCell>
              <Badge color="zinc" className="text-xs">
                {channel.type === 'rss_feed' ? 'RSS Feed' : 'Google News'}
              </Badge>
            </TableCell>
            <TableCell>
              <a
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate max-w-xs block"
              >
                {channel.url}
              </a>
            </TableCell>
            <TableCell>
              <Badge
                color={
                  channel.errorCount >= 5
                    ? 'red'
                    : channel.errorCount >= 3
                    ? 'yellow'
                    : 'zinc'
                }
              >
                {channel.errorCount}
              </Badge>
            </TableCell>
            <TableCell>
              {channel.lastSuccess ? (
                <Text className="text-sm">
                  {formatDistanceToNow(channel.lastSuccess.toDate(), {
                    addSuffix: true,
                    locale: de
                  })}
                </Text>
              ) : (
                <Text className="text-sm text-gray-400">Nie</Text>
              )}
            </TableCell>
            <TableCell>
              {channel.lastError ? (
                <Text className="text-sm text-red-600 truncate max-w-xs">
                  {channel.lastError}
                </Text>
              ) : (
                <Text className="text-sm text-gray-400">-</Text>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
