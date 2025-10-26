// src/components/projects/distribution/components/ListStatsBar.tsx
'use client';

import { memo } from 'react';
import { Text } from '@/components/ui/text';

interface ListStatsBarProps {
  filteredCount: number;
  totalCount: number;
  itemLabel?: string;
}

const ListStatsBar = memo(function ListStatsBar({
  filteredCount,
  totalCount,
  itemLabel = 'Listen'
}: ListStatsBarProps) {
  return (
    <div className="flex items-center justify-between">
      <Text className="text-sm text-zinc-600">
        {filteredCount} von {totalCount} {itemLabel}
      </Text>
    </div>
  );
});

export default ListStatsBar;
