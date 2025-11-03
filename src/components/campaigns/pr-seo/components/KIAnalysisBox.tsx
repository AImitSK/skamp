// src/components/campaigns/pr-seo/components/KIAnalysisBox.tsx
"use client";

import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import type { KIAnalysisBoxProps } from '../types';

/**
 * KI-Analysis-Box Komponente
 * Zeigt KI-Analyse-Status und Relevanz-Score an
 */
export const KIAnalysisBox = React.memo(function KIAnalysisBox({ metrics, isLoading }: KIAnalysisBoxProps) {
  const boxClasses = "inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs bg-purple-50 text-purple-700 border border-purple-300";

  if (isLoading) {
    return (
      <div className={boxClasses}>
        <div className="w-3 h-3 border border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <span>KI analysiert...</span>
      </div>
    );
  }

  const hasAIData =
    metrics.semanticRelevance !== undefined ||
    metrics.targetAudience !== undefined ||
    metrics.tonality !== undefined;

  if (!hasAIData) {
    return (
      <div className={boxClasses}>
        <SparklesIcon className="h-3 w-3" />
        <span>Bereit für Analyse</span>
      </div>
    );
  }

  return (
    <div className={boxClasses}>
      <SparklesIcon className="h-3 w-3" />
      <span className="font-semibold">Relevanz:</span>
      <span>{metrics.semanticRelevance || 0}%</span>
    </div>
  );
});
