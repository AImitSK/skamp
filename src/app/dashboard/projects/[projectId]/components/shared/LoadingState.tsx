'use client';

import React from 'react';
import { Text } from '@/components/ui/text';

/**
 * LoadingState Props
 */
interface LoadingStateProps {
  message?: string;
}

/**
 * LoadingState Component
 *
 * Zeigt einen zentrierten Loading Spinner mit optionaler Nachricht
 */
export function LoadingState({ message = 'Projekt wird geladen...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <Text className="ml-3">{message}</Text>
    </div>
  );
}
