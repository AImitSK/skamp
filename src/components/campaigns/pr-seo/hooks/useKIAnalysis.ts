// src/components/campaigns/pr-seo/hooks/useKIAnalysis.ts

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/api-client';
import type { KeywordMetrics } from '../types';

/**
 * Hook für KI-basierte Keyword-Analyse über Genkit
 */
export function useKIAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /**
   * Analysiert ein Keyword mit KI (Genkit Flow)
   * @param keyword - Das zu analysierende Keyword
   * @param text - Der Text-Kontext
   * @returns KI-Metriken (Semantische Relevanz, Kontext-Qualität, etc.)
   */
  const analyzeKeyword = useCallback(async (
    keyword: string,
    text: string
  ): Promise<Partial<KeywordMetrics>> => {
    try {
      setIsAnalyzing(true);

      // ══════════════════════════════════════════════════════════════
      // GENKIT FLOW AUFRUF über API Route
      // ══════════════════════════════════════════════════════════════
      const data = await apiClient.post<any>('/api/ai/analyze-keyword-seo', {
        keyword,
        text
      });

      // Neue strukturierte Response (bereits geparst!)
      if (data && data.success) {
        return {
          semanticRelevance: Math.min(100, Math.max(0, data.semanticRelevance || 50)),
          contextQuality: Math.min(100, Math.max(0, data.contextQuality || 50)),
          targetAudience: data.targetAudience || 'Unbekannt',
          tonality: data.tonality || 'Neutral',
          relatedTerms: Array.isArray(data.relatedTerms) ? data.relatedTerms.slice(0, 3) : []
        };
      }
    } catch (error) {
      console.error('❌ SEO-Analyse Fehler:', error);
    } finally {
      setIsAnalyzing(false);
    }

    // Fallback-Werte bei Fehler
    return {
      semanticRelevance: 50,
      contextQuality: 50,
      targetAudience: 'Unbekannt',
      tonality: 'Neutral',
      relatedTerms: []
    };
  }, []);

  return {
    analyzeKeyword,
    isAnalyzing
  };
}
