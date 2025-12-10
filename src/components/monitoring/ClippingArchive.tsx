'use client';

import { useState, useEffect } from 'react';
import { MediaClipping } from '@/types/monitoring';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import {
  EyeIcon,
  CurrencyEuroIcon,
  EllipsisVerticalIcon,
  LinkIcon,
  CalendarIcon,
  NewspaperIcon
} from '@heroicons/react/24/outline';
import {
  SentimentPositiveIcon,
  SentimentNeutralIcon,
  SentimentNegativeIcon,
  SentimentIcon
} from '@/components/ui/sentiment-icons';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';
import { aveSettingsService } from '@/lib/firebase/ave-settings-service';
import { AVESettings } from '@/types/monitoring';
import { useTranslations } from 'next-intl';

interface ClippingArchiveProps {
  clippings: MediaClipping[];
}

export function ClippingArchive({ clippings }: ClippingArchiveProps) {
  const t = useTranslations('monitoring.clippingArchive');
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const [aveSettings, setAVESettings] = useState<AVESettings | null>(null);

  useEffect(() => {
    if (currentOrganization?.id && user?.uid) {
      aveSettingsService.getOrCreate(currentOrganization.id, user.uid)
        .then(setAVESettings)
        .catch(console.error);
    }
  }, [currentOrganization?.id, user?.uid]);

  const calculateAVE = (clipping: MediaClipping): number => {
    if (clipping.ave) return clipping.ave;
    if (!aveSettings) return 0;
    return aveSettingsService.calculateAVE(clipping, aveSettings);
  };

  const clippingsWithAVE = clippings.map(c => ({
    ...c,
    calculatedAVE: calculateAVE(c)
  }));

  const totalReach = clippings.reduce((sum, c) => sum + (c.reach || 0), 0);
  const totalAVE = clippingsWithAVE.reduce((sum, c) => sum + c.calculatedAVE, 0);

  const sentimentCounts = {
    positive: clippings.filter(c => c.sentiment === 'positive').length,
    neutral: clippings.filter(c => c.sentiment === 'neutral').length,
    negative: clippings.filter(c => c.sentiment === 'negative').length
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '-';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getSentimentColor = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return 'green';
      case 'neutral': return 'zinc';
      case 'negative': return 'red';
    }
  };

  return (
    <div className="space-y-6">
      {clippings.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Text className="text-sm text-gray-600">{t('totalReach')}</Text>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {totalReach.toLocaleString('de-DE')}
              </div>
            </div>

            {totalAVE > 0 && (
              <div>
                <Text className="text-sm text-gray-600">{t('totalAve')}</Text>
                <div className="text-2xl font-semibold text-gray-900 mt-1">
                  {totalAVE.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>
            )}

            <div>
              <Text className="text-sm text-gray-600">{t('sentiment')}</Text>
              <div className="flex gap-3 mt-1 items-center">
                <span className="flex items-center gap-1 text-gray-900">
                  <SentimentPositiveIcon className="h-5 w-5" />
                  {sentimentCounts.positive}
                </span>
                <span className="flex items-center gap-1 text-gray-900">
                  <SentimentNeutralIcon className="h-5 w-5" />
                  {sentimentCounts.neutral}
                </span>
                <span className="flex items-center gap-1 text-gray-900">
                  <SentimentNegativeIcon className="h-5 w-5" />
                  {sentimentCounts.negative}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {clippings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Text className="text-gray-500">{t('noClippings')}</Text>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.publication')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.medium')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.reach')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.sentiment')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {clippingsWithAVE.map((clipping) => (
                <tr key={clipping.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <Text className="font-medium text-gray-900">
                        {clipping.title}
                      </Text>
                      {clipping.excerpt && (
                        <Text className="text-sm text-gray-600 truncate max-w-md">
                          {clipping.excerpt}
                        </Text>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <Text className="text-sm font-medium text-gray-900">
                        {clipping.outletName}
                      </Text>
                      <Badge color="zinc" className="mt-1">
                        {clipping.outletType}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {clipping.reach && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <EyeIcon className="h-4 w-4" />
                          {clipping.reach.toLocaleString('de-DE')}
                        </div>
                      )}
                      {clipping.calculatedAVE > 0 && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <CurrencyEuroIcon className="h-4 w-4" />
                          {clipping.calculatedAVE.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={getSentimentColor(clipping.sentiment)}>
                      <span className="flex items-center gap-1">
                        <SentimentIcon sentiment={clipping.sentiment} className="h-4 w-4" />
                        {t(`sentimentLabels.${clipping.sentiment}`)}
                      </span>
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4" />
                      {formatDate(clipping.publishedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Dropdown>
                      <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
                        <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        <DropdownItem
                          onClick={() => window.open(clipping.url, '_blank')}
                        >
                          <LinkIcon className="h-4 w-4" />
                          {t('viewArticle')}
                        </DropdownItem>
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
  );
}