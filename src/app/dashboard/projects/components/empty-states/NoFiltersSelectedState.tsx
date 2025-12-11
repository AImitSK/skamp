'use client';

import { FunnelIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

export default function NoFiltersSelectedState() {
  const t = useTranslations('projects.emptyStates');

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
      <FunnelIcon className="mx-auto h-12 w-12 text-zinc-400" />
      <h3 className="mt-2 text-sm font-medium text-zinc-900">
        {t('noFiltersSelected.title')}
      </h3>
      <p className="mt-1 text-sm text-zinc-500">
        {t('noFiltersSelected.description')}
      </p>
    </div>
  );
}
