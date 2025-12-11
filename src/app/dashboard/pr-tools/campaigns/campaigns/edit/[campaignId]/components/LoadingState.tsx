// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/components/LoadingState.tsx
'use client';
import React from 'react';
import { useTranslations } from 'next-intl';

export default function LoadingState() {
  const t = useTranslations('campaigns.edit.loading');

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-600">{t('campaign')}</p>
      </div>
    </div>
  );
}
