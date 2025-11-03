// src/components/campaigns/pr-seo/PRSEOHeaderBar.tsx
"use client";

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { MagnifyingGlassIcon, ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

// Hooks
import { useKeywordAnalysis } from './hooks/useKeywordAnalysis';
import { usePRScoreCalculation } from './hooks/usePRScoreCalculation';

// Components
import { KeywordInput } from './components/KeywordInput';
import { KeywordMetricsCard } from './components/KeywordMetricsCard';
import { ScoreBreakdownGrid } from './components/ScoreBreakdownGrid';
import { RecommendationsList } from './components/RecommendationsList';

// Types
import type { PRSEOHeaderBarProps } from './types';

/**
 * PRSEOHeaderBar - Hauptkomponente für PR-SEO-Analyse
 *
 * Refactored Version - modularisiert in Utils, Hooks und Sub-Komponenten
 */
export function PRSEOHeaderBar({
  title = "PR-SEO Analyse",
  content,
  keywords,
  onKeywordsChange,
  documentTitle = '',
  className,
  onSeoScoreChange
}: PRSEOHeaderBarProps) {
  // === Custom Hooks ===

  // Keyword-Analyse Hook (Management + KI-Analyse)
  const {
    keywordMetrics,
    addKeyword,
    removeKeyword,
    refreshAnalysis,
    isAnalyzing
  } = useKeywordAnalysis(keywords, content, documentTitle, onKeywordsChange);

  // PR-Score-Berechnung Hook
  const {
    prScore,
    scoreBreakdown,
    keywordScoreData,
    recommendations
  } = usePRScoreCalculation(content, documentTitle, keywords, keywordMetrics, onSeoScoreChange);

  // === Computed Values ===

  const scoreBadgeColor = useMemo((): 'green' | 'yellow' | 'red' | 'zinc' => {
    if (prScore === 0 && keywords.length === 0) return 'zinc';
    if (prScore >= 76) return 'green';
    if (prScore >= 51) return 'yellow';
    return 'red';
  }, [prScore, keywords.length]);

  // === Render ===

  return (
    <div className={clsx('bg-gray-50 rounded-lg p-4 border border-gray-200', className)}>
      {/* Header mit Score */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh-Button (nur bei Keywords) */}
          {keywords.length > 0 && (
            <button
              type="button"
              onClick={refreshAnalysis}
              disabled={isAnalyzing}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="KI-Analyse aktualisieren"
            >
              <ArrowPathIcon className={clsx('h-5 w-5 text-gray-600', isAnalyzing && 'animate-spin')} />
            </button>
          )}

          {/* Score-Badge */}
          <Badge color={scoreBadgeColor} className="text-base font-semibold px-4 py-2">
            PR-Score: {prScore}/100
          </Badge>
        </div>
      </div>

      {/* Keyword-Eingabe */}
      <div className="mb-4">
        <div className="flex">
          <KeywordInput
            keywords={keywords}
            onAddKeyword={addKeyword}
            maxKeywords={2}
          />
        </div>
      </div>

      {/* Keyword-Metriken-Liste */}
      {keywords.length > 0 && (
        <div className="space-y-2 mb-4">
          {keywordMetrics.map((metrics) => (
            <KeywordMetricsCard
              key={metrics.keyword}
              metrics={metrics}
              isAnalyzing={isAnalyzing}
              onRemove={() => removeKeyword(metrics.keyword)}
            />
          ))}
        </div>
      )}

      {/* Score-Aufschlüsselung + KI-Info */}
      {keywords.length > 0 && (
        <>
          {/* Score-Breakdown Grid (4 Boxen) */}
          <ScoreBreakdownGrid breakdown={scoreBreakdown} />

          {/* Globale KI-Analyse für gesamten Text */}
          {keywordMetrics.length > 0 && keywordMetrics.some(km => km.targetAudience || km.tonality) && (
            <div className="bg-purple-50 rounded-md p-3 mb-3">
              <div className="flex items-center gap-2 text-xs text-purple-700">
                <SparklesIcon className="h-4 w-4" />
                <div className="flex items-center gap-4">
                  {keywordMetrics[0]?.targetAudience && (
                    <span>
                      <strong>Zielgruppe:</strong> {keywordMetrics[0].targetAudience}
                    </span>
                  )}
                  {keywordMetrics[0]?.tonality && (
                    <span>
                      <strong>Tonalität:</strong> {keywordMetrics[0].tonality}
                    </span>
                  )}
                  {keywordScoreData?.hasAIAnalysis && (
                    <span>
                      <strong>KI-Score:</strong> {keywordScoreData.aiBonus}/40
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empfehlungen-Liste */}
      {recommendations.length > 0 && keywords.length > 0 && (
        <RecommendationsList recommendations={recommendations} />
      )}
    </div>
  );
}
