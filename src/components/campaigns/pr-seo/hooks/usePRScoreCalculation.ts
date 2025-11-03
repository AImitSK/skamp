// src/components/campaigns/pr-seo/hooks/usePRScoreCalculation.ts

import { useState, useEffect } from 'react';
import { SEOScoreCalculator } from '../utils/seo-score-calculator';
import { PRMetricsCalculator } from '../utils/pr-metrics-calculator';
import { seoKeywordService } from '@/lib/ai/seo-keyword-service';
import type { KeywordMetrics, PRScoreBreakdown, KeywordScoreData } from '../types';

/**
 * Hook für PR-Score-Berechnung
 */
export function usePRScoreCalculation(
  content: string,
  documentTitle: string,
  keywords: string[],
  keywordMetrics: KeywordMetrics[],
  onSeoScoreChange?: (scoreData: {
    totalScore: number;
    breakdown: PRScoreBreakdown;
    hints: string[];
    keywordMetrics: KeywordMetrics[];
  }) => void
) {
  const [prScore, setPrScore] = useState(0);
  const [scoreBreakdown, setScoreBreakdown] = useState<PRScoreBreakdown>({
    headline: 0,
    keywords: 0,
    structure: 0,
    relevance: 0,
    concreteness: 0,
    engagement: 0,
    social: 0
  });
  const [keywordScoreData, setKeywordScoreData] = useState<KeywordScoreData | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  /**
   * Berechnet PR-Score und Score-Breakdown bei Content-Änderung
   */
  useEffect(() => {
    // PR-Metriken berechnen
    const prMetrics = PRMetricsCalculator.calculate(content, documentTitle, keywords);

    // Keyword-Score-Daten erst berechnen
    const keywordScoreResult = seoKeywordService.calculateKeywordScore(
      keywords,
      content,
      keywordMetrics
    );
    setKeywordScoreData(keywordScoreResult);

    // Dann PR-Score mit Keyword-Score-Daten berechnen
    const {
      totalScore,
      breakdown,
      recommendations: newRecommendations
    } = SEOScoreCalculator.calculatePRScore(
      prMetrics,
      keywordMetrics,
      content,
      documentTitle,
      keywords,
      keywordScoreResult
    );

    setPrScore(totalScore);
    setScoreBreakdown(breakdown);
    setRecommendations(newRecommendations);

    // Score-Daten an Parent-Komponente weiterleiten
    if (onSeoScoreChange) {
      onSeoScoreChange({
        totalScore,
        breakdown,
        hints: newRecommendations,
        keywordMetrics
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, documentTitle, keywordMetrics, keywords]); // Nur die Basis-Dependencies ohne Functions

  return {
    prScore,
    scoreBreakdown,
    keywordScoreData,
    recommendations
  };
}
