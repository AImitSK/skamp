'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

interface Props {
  error: Error;
  onRetry: () => void;
}

export const ErrorState = memo(function ErrorState({ error, onRetry }: Props) {
  const t = useTranslations('monitoring');

  return (
    <div className="text-center py-12">
      <Text className="text-red-500">{t('loadError')}: {error.message}</Text>
      <Button onClick={onRetry} className="mt-4">
        {t('retryButton')}
      </Button>
    </div>
  );
});
