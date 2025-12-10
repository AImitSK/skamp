'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { PlayIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { toDate } from '@/lib/utils/timestamp-utils';
import { useTranslations } from 'next-intl';

interface OrganizationStatsTableProps {
  organizations: Array<{
    organizationId: string;
    organizationName: string;
    activeTrackers: number;
    articlesFound: number;
    autoConfirmedRate: number;
    lastActivity?: any;
  }>;
  onTriggerOrgCrawl: (orgId: string) => Promise<void>;
}

export function OrganizationStatsTable({
  organizations,
  onTriggerOrgCrawl
}: OrganizationStatsTableProps) {
  const t = useTranslations('superadmin.monitoring.organizationStats');

  const handleTrigger = async (orgId: string) => {
    try {
      await onTriggerOrgCrawl(orgId);
      alert(t('crawlerStarted'));
    } catch (error) {
      console.error('Error triggering org crawl:', error);
      alert(t('crawlerError'));
    }
  };

  if (organizations.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <Text className="text-gray-500">{t('empty')}</Text>
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>{t('headers.organization')}</TableHeader>
          <TableHeader>{t('headers.activeTrackers')}</TableHeader>
          <TableHeader>{t('headers.articlesFound')}</TableHeader>
          <TableHeader>{t('headers.autoConfirmRate')}</TableHeader>
          <TableHeader>{t('headers.lastActivity')}</TableHeader>
          <TableHeader>{t('headers.actions')}</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {organizations.map((org) => (
          <TableRow key={org.organizationId}>
            <TableCell>
              <Text className="font-medium">{org.organizationName}</Text>
              <Text className="text-xs text-gray-500">{org.organizationId}</Text>
            </TableCell>
            <TableCell>{org.activeTrackers}</TableCell>
            <TableCell>{org.articlesFound}</TableCell>
            <TableCell>
              <Badge color={org.autoConfirmedRate > 70 ? 'green' : org.autoConfirmedRate > 40 ? 'yellow' : 'red'}>
                {org.autoConfirmedRate}%
              </Badge>
            </TableCell>
            <TableCell>
              {(() => {
                const date = toDate(org.lastActivity);
                return date ? (
                  <Text className="text-sm">
                    {formatDistanceToNow(date, {
                      addSuffix: true,
                      locale: de
                    })}
                  </Text>
                ) : (
                  <Text className="text-sm text-gray-400">-</Text>
                );
              })()}
            </TableCell>
            <TableCell>
              <Button
                onClick={() => handleTrigger(org.organizationId)}
                className="bg-[#005fab] hover:bg-[#004a8c] text-white text-sm py-1 px-3"
              >
                <PlayIcon className="h-4 w-4 mr-1" />
                {t('startCrawl')}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
