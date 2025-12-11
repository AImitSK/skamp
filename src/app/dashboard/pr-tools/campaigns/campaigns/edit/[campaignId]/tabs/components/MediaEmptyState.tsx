// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/components/MediaEmptyState.tsx
"use client";

import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface MediaEmptyStateProps {
  onAddMedia: () => void;
}

/**
 * MediaEmptyState Komponente
 *
 * Zeigt einen Leerzustand an, wenn noch keine Medien angehängt wurden.
 * Bietet eine klickbare Fläche zum Öffnen des Asset-Selectors.
 *
 * @param onAddMedia - Callback zum Öffnen des Asset-Selectors
 */
export const MediaEmptyState = React.memo(function MediaEmptyState({ onAddMedia }: MediaEmptyStateProps) {
  const t = useTranslations('campaigns.edit.media');

  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-[#005fab] transition-all cursor-pointer group py-8"
      onClick={onAddMedia}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAddMedia();
        }
      }}
      aria-label={t('addMediaAriaLabel')}
    >
      <div className="flex flex-col items-center justify-center">
        <PhotoIcon className="h-10 w-10 text-gray-400 group-hover:text-[#005fab] mb-2" />
        <p className="text-gray-600 group-hover:text-[#005fab] font-medium">
          {t('addMedia')}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {t('clickToSelect')}
        </p>
      </div>
    </div>
  );
});
