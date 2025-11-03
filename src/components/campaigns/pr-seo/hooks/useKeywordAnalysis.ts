// src/components/campaigns/pr-seo/hooks/useKeywordAnalysis.ts

import { useState, useCallback, useEffect } from 'react';
import { KeywordMetricsCalculator } from '../utils/keyword-metrics-calculator';
import { useKIAnalysis } from './useKIAnalysis';
import type { KeywordMetrics } from '../types';

/**
 * Hook für Keyword-Management und Analyse
 */
export function useKeywordAnalysis(
  keywords: string[],
  content: string,
  documentTitle: string,
  onKeywordsChange: (keywords: string[]) => void
) {
  const [keywordMetrics, setKeywordMetrics] = useState<KeywordMetrics[]>([]);
  const { analyzeKeyword, isAnalyzing } = useKIAnalysis();

  /**
   * Fügt ein neues Keyword hinzu und analysiert es mit KI
   */
  const addKeyword = useCallback(async (keyword: string) => {
    if (!keyword || keywords.includes(keyword) || keywords.length >= 2) return;

    // Basis-Metriken sofort berechnen
    const basicMetrics = KeywordMetricsCalculator.calculateBasicMetrics(
      keyword,
      content,
      documentTitle
    );

    const updatedKeywords = [...keywords, keyword];
    onKeywordsChange(updatedKeywords);

    // Temporäre Metriken setzen
    const tempMetrics = [...keywordMetrics, basicMetrics];
    setKeywordMetrics(tempMetrics);

    // KI-Analyse im Hintergrund
    const aiMetrics = await analyzeKeyword(keyword, content);
    const fullMetrics = { ...basicMetrics, ...aiMetrics };

    // Finale Metriken aktualisieren
    setKeywordMetrics(prev =>
      prev.map(km => km.keyword === keyword ? fullMetrics : km)
    );
  }, [keywords, content, documentTitle, onKeywordsChange, keywordMetrics, analyzeKeyword]);

  /**
   * Entfernt ein Keyword
   */
  const removeKeyword = useCallback((keywordToRemove: string) => {
    const updatedKeywords = keywords.filter(k => k !== keywordToRemove);
    onKeywordsChange(updatedKeywords);
    setKeywordMetrics(prev => prev.filter(km => km.keyword !== keywordToRemove));
  }, [keywords, onKeywordsChange]);

  /**
   * Aktualisiert die KI-Analyse für alle Keywords
   */
  const refreshAnalysis = useCallback(async () => {
    if (keywords.length === 0) return;

    const promises = keywords.map(async keyword => {
      const basicMetrics = KeywordMetricsCalculator.calculateBasicMetrics(
        keyword,
        content,
        documentTitle
      );
      const aiMetrics = await analyzeKeyword(keyword, content);
      return { ...basicMetrics, ...aiMetrics };
    });

    const results = await Promise.all(promises);
    setKeywordMetrics(results);
  }, [keywords, content, documentTitle, analyzeKeyword]);

  /**
   * Initiale KI-Analyse beim Laden von Keywords aus der Datenbank
   */
  useEffect(() => {
    // Nur ausführen wenn Keywords vorhanden sind und noch keine Metriken existieren
    if (keywords.length > 0 && keywordMetrics.length === 0 && content) {
      refreshAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywords.length, content]); // Nicht refreshAnalysis als dependency, um Endlosschleife zu vermeiden

  /**
   * Metriken aktualisieren bei Content-Änderung (ohne KI)
   */
  useEffect(() => {
    if (keywords.length === 0) return;

    // Basis-Metriken für alle Keywords neu berechnen
    const updatedMetrics = keywords.map(keyword => {
      const existing = keywordMetrics.find(km => km.keyword === keyword);
      return KeywordMetricsCalculator.updateMetrics(
        keyword,
        content,
        documentTitle,
        existing
      );
    });

    setKeywordMetrics(updatedMetrics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, keywords, documentTitle]); // Nur Basis-Dependencies ohne Functions

  return {
    keywordMetrics,
    addKeyword,
    removeKeyword,
    refreshAnalysis,
    isAnalyzing
  };
}
