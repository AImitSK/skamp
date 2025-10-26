// src/components/projects/distribution/components/LoadingSpinner.tsx
'use client';

import { memo } from 'react';
import { Text } from '@/components/ui/text';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner = memo(function LoadingSpinner({ message = 'Lade...' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <Text className="mt-4">{message}</Text>
      </div>
    </div>
  );
});

export default LoadingSpinner;
