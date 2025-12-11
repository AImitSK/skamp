// src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/components/AiAssistantCTA.tsx
"use client";

import React from 'react';
import { SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

interface AiAssistantCTAProps {
  onOpenAiModal: () => void;
}

export function AiAssistantCTA({ onOpenAiModal }: AiAssistantCTAProps) {
  const t = useTranslations('campaigns.edit.aiAssistant');

  return (
    <button
      type="button"
      onClick={onOpenAiModal}
      className="w-full mb-6 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <SparklesIcon className="h-8 w-8 text-white" />
          </div>
          <div className="text-left">
            <p className="text-lg font-bold text-white mb-1">
              {t('ctaTitle')}
            </p>
            <p className="text-sm text-indigo-100">
              {t('ctaDescription')}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <ArrowRightIcon className="h-6 w-6 text-white group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </button>
  );
}
