'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { ArrowLeftIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useMonitoring } from '../context/MonitoringContext';
import { useRouter } from 'next/navigation';

export const MonitoringHeader = memo(function MonitoringHeader() {
  const router = useRouter();
  const t = useTranslations('monitoring.header');
  const { campaign, isPDFGenerating } = useMonitoring();

  const handleBack = () => {
    router.push('/dashboard/analytics/monitoring');
  };

  if (!campaign) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Button plain className="p-2" onClick={handleBack}>
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          <div>
            <Heading>{t('title', { campaignTitle: campaign.title })}</Heading>
            <Text className="text-gray-600">
              {t('sentAt', {
                date: campaign.sentAt
                  ? new Date(campaign.sentAt.toDate()).toLocaleDateString('de-DE')
                  : t('noDate')
              })}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
});
