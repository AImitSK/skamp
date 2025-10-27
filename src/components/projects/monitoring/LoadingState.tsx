import React from 'react';
import { Text } from '@/components/ui/text';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

/**
 * LoadingState Komponente für Monitoring Tab
 *
 * Wiederverwendbare Loading Animation mit optionaler Nachricht.
 *
 * @example
 * ```tsx
 * <LoadingState message="Lade Monitoring-Daten..." />
 * ```
 */
const LoadingState = React.memo(function LoadingState({
  message = 'Lädt...',
  className = ''
}: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center h-64 ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <Text className="ml-3">{message}</Text>
    </div>
  );
});

export default LoadingState;
