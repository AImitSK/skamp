// src/components/projects/distribution/components/details/EmptyContactsState.tsx
'use client';

import { useTranslations } from 'next-intl';
import { Text } from '@/components/ui/text';
import { UsersIcon } from '@heroicons/react/24/outline';

interface EmptyContactsStateProps {
  listType: string;
}

export default function EmptyContactsState({ listType }: EmptyContactsStateProps) {
  const t = useTranslations('projects.distribution.listDetails');

  return (
    <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
      <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <Text className="text-sm text-gray-600">
        {listType === 'dynamic' ? t('emptyDynamic') : t('emptyStatic')}
      </Text>
    </div>
  );
}
