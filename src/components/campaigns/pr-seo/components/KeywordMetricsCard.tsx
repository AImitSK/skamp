// src/components/campaigns/pr-seo/components/KeywordMetricsCard.tsx
"use client";

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { KIAnalysisBox } from './KIAnalysisBox';
import type { KeywordMetricsCardProps } from '../types';
import clsx from 'clsx';

/**
 * Keyword-Metriken-Card Komponente
 * Zeigt Keyword-Metriken in einer One-Line-Layout-Karte an
 */
export const KeywordMetricsCard = React.memo(function KeywordMetricsCard({ metrics, isAnalyzing, onRemove }: KeywordMetricsCardProps) {
  const t = useTranslations('campaigns.prSeo.keywords');

  // Helper function to get distribution label
  const getDistributionLabel = (distribution: string) => {
    switch (distribution) {
      case 'gut':
        return t('distribution.good');
      case 'mittel':
        return t('distribution.medium');
      case 'schlecht':
        return t('distribution.poor');
      default:
        return distribution;
    }
  };

  return (
    <div className="flex items-center bg-white rounded-md p-3 gap-4">
      {/* Links: Keyword + Basis-Metriken */}
      <div className="flex items-center gap-3 flex-1">
        <div className="text-base font-medium text-gray-900">
          {metrics.keyword}
        </div>
        <div className="flex gap-2 items-center">
          {/* Dichte */}
          <div className="inline-flex items-center gap-1 bg-white border border-gray-300 rounded-md px-2 py-0.5 text-xs">
            <span className="font-semibold">{t('density')}:</span>
            <span>{metrics.density.toFixed(1)}%</span>
          </div>

          {/* Vorkommen */}
          <div className="inline-flex items-center gap-1 bg-white border border-gray-300 rounded-md px-2 py-0.5 text-xs">
            <span className="font-semibold">{t('occurrences')}:</span>
            <span>{metrics.occurrences}x</span>
          </div>

          {/* Verteilung */}
          <div className={clsx(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
            metrics.distribution === 'gut' ? 'bg-green-50 text-green-700 border border-green-300' :
            metrics.distribution === 'mittel' ? 'bg-orange-50 text-orange-700 border border-orange-300' :
            'bg-red-50 text-red-700 border border-red-300'
          )}>
            <span className="font-semibold">{t('distributionLabel')}:</span>
            <span>{getDistributionLabel(metrics.distribution)}</span>
          </div>
        </div>
      </div>

      {/* Rechts: KI-Analysis-Box + Delete Button */}
      <div className="flex items-center gap-3">
        <KIAnalysisBox metrics={metrics} isLoading={isAnalyzing} />
        <button
          onClick={onRemove}
          className="bg-white text-gray-400 hover:text-red-500 p-1 rounded"
          aria-label={t('removeKeyword')}
        >
          <XMarkIcon className="h-4 w-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
});
