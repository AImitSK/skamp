'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { toDate } from '@/lib/utils/timestamp-utils';
import { useTranslations } from 'next-intl';

interface ErrorLog {
  id: string;
  timestamp: any;
  type: 'rss_feed_error' | 'crawler_error' | 'channel_error';
  organizationId?: string;
  campaignId?: string;
  channelId?: string;
  errorMessage: string;
  stackTrace?: string;
  metadata?: any;
}

interface ErrorLogTableProps {
  logs: ErrorLog[];
}

export function ErrorLogTable({ logs }: ErrorLogTableProps) {
  const t = useTranslations('superadmin.monitoring.errorLog');
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

  const errorTypeLabels: Record<string, string> = {
    rss_feed_error: t('errorTypes.rssFeed'),
    crawler_error: t('errorTypes.crawler'),
    channel_error: t('errorTypes.channel')
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <Text className="text-gray-500">{t('empty')}</Text>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>{t('headers.time')}</TableHeader>
            <TableHeader>{t('headers.type')}</TableHeader>
            <TableHeader>{t('headers.organization')}</TableHeader>
            <TableHeader>{t('headers.error')}</TableHeader>
            <TableHeader>{t('headers.details')}</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <Text className="text-sm">
                  {(() => {
                    const date = toDate(log.timestamp);
                    return date ? formatDistanceToNow(date, { addSuffix: true, locale: de }) : '-';
                  })()}
                </Text>
              </TableCell>
              <TableCell>
                <Badge color="red" className="text-xs">
                  {errorTypeLabels[log.type] || log.type}
                </Badge>
              </TableCell>
              <TableCell>
                <Text className="text-sm">{log.organizationId || '-'}</Text>
              </TableCell>
              <TableCell className="max-w-md">
                <Text className="text-sm truncate">{log.errorMessage}</Text>
              </TableCell>
              <TableCell>
                <Button
                  plain
                  onClick={() => setSelectedLog(log)}
                  className="text-sm"
                >
                  {t('detailsButton')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Error Detail Modal */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onClose={() => setSelectedLog(null)}>
          <DialogTitle>{t('dialog.title')}</DialogTitle>
          <DialogBody className="space-y-4">
            <div>
              <Text className="text-xs text-gray-500">{t('dialog.timestamp')}</Text>
              <Text className="text-sm font-medium">
                {(() => {
                  const date = toDate(selectedLog.timestamp);
                  return date ? date.toLocaleString('de-DE') : '-';
                })()}
              </Text>
            </div>

            <div>
              <Text className="text-xs text-gray-500">{t('dialog.type')}</Text>
              <Badge color="red" className="mt-1">
                {errorTypeLabels[selectedLog.type] || selectedLog.type}
              </Badge>
            </div>

            {selectedLog.organizationId && (
              <div>
                <Text className="text-xs text-gray-500">{t('dialog.organizationId')}</Text>
                <Text className="text-sm font-mono">{selectedLog.organizationId}</Text>
              </div>
            )}

            {selectedLog.campaignId && (
              <div>
                <Text className="text-xs text-gray-500">{t('dialog.campaignId')}</Text>
                <Text className="text-sm font-mono">{selectedLog.campaignId}</Text>
              </div>
            )}

            {selectedLog.channelId && (
              <div>
                <Text className="text-xs text-gray-500">{t('dialog.channelId')}</Text>
                <Text className="text-sm font-mono">{selectedLog.channelId}</Text>
              </div>
            )}

            <div>
              <Text className="text-xs text-gray-500">{t('dialog.errorMessage')}</Text>
              <div className="mt-1 p-3 bg-red-50 rounded-lg">
                <Text className="text-sm text-red-700 font-mono whitespace-pre-wrap">
                  {selectedLog.errorMessage}
                </Text>
              </div>
            </div>

            {selectedLog.stackTrace && (
              <div>
                <Text className="text-xs text-gray-500">{t('dialog.stackTrace')}</Text>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg max-h-64 overflow-auto">
                  <Text className="text-xs font-mono whitespace-pre-wrap">
                    {selectedLog.stackTrace}
                  </Text>
                </div>
              </div>
            )}

            {selectedLog.metadata && (
              <div>
                <Text className="text-xs text-gray-500">{t('dialog.metadata')}</Text>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg max-h-64 overflow-auto">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogActions>
            <Button onClick={() => setSelectedLog(null)}>{t('dialog.close')}</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
