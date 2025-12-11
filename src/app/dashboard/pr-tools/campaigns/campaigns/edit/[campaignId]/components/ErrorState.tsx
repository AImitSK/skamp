// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/components/ErrorState.tsx
'use client';

import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface ErrorStateProps {
  message?: string;
}

export default function ErrorState({ message }: ErrorStateProps) {
  const t = useTranslations('campaigns.edit.error');

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('title')}</h2>
        <p className="text-sm text-gray-600">{message || t('defaultMessage')}</p>
      </div>
    </div>
  );
}
