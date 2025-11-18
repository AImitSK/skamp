'use client';

import { memo } from 'react';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

interface Props {
  error: Error;
  onRetry: () => void;
}

export const ErrorState = memo(function ErrorState({ error, onRetry }: Props) {
  return (
    <div className="text-center py-12">
      <Text className="text-red-500">Fehler beim Laden: {error.message}</Text>
      <Button onClick={onRetry} className="mt-4">
        Erneut versuchen
      </Button>
    </div>
  );
});
