'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Text } from '@/components/ui/text';

export const LoadingState = memo(function LoadingState() {
  const t = useTranslations('monitoring');

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <Text className="ml-3">{t('loading')}</Text>
    </div>
  );
});
