import React from 'react';
import { Text } from '@/components/ui/text';
import { ChartBarIcon } from '@heroicons/react/24/outline';

export const EmptyState = React.memo(function EmptyState() {
  return (
    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
      <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <Text className="text-gray-500">Noch keine Daten für Analytics verfügbar</Text>
    </div>
  );
});
