// src/components/campaigns/pr-seo/utils/keyword-metrics-calculator.ts

import type { KeywordMetrics } from '../types';

/**
 * Keyword-Metriken-Calculator
 * Berechnet Basis-Metriken für Keywords (ohne KI)
 */
export class KeywordMetricsCalculator {
  /**
   * Berechnet Basis-Metriken für ein Keyword
   * @param keyword - Das zu analysierende Keyword
   * @param text - Der HTML-Text-Inhalt
   * @param documentTitle - Der Titel des Dokuments
   * @returns Basis-Metriken (ohne KI-Felder)
   */
  static calculateBasicMetrics(
    keyword: string,
    text: string,
    documentTitle: string
  ): Omit<KeywordMetrics, 'semanticRelevance' | 'contextQuality' | 'relatedTerms' | 'targetAudience' | 'tonality'> {
    const cleanText = text.replace(/<[^>]*>/g, '').toLowerCase();
    const totalWords = cleanText.split(/\s+/).filter(word => word.length > 0).length;

    // Keyword-Vorkommen zählen
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
    const matches = cleanText.match(regex) || [];
    const occurrences = matches.length;
    const density = totalWords > 0 ? (occurrences / totalWords) * 100 : 0;

    // Position-Checks
    const firstParagraphText = cleanText.split('\n')[0] || '';
    const inFirstParagraph = regex.test(firstParagraphText);
    const inHeadline = regex.test(documentTitle.toLowerCase());

    // Verteilung analysieren
    const distribution = this.calculateDistribution(cleanText, regex);

    return {
      keyword,
      density,
      occurrences,
      inHeadline,
      inFirstParagraph,
      distribution
    };
  }

  /**
   * Berechnet die Verteilung eines Keywords im Text
   * @param cleanText - Der bereinigte Text
   * @param regex - RegEx für Keyword-Suche
   * @returns Verteilungs-Rating
   */
  private static calculateDistribution(
    cleanText: string,
    regex: RegExp
  ): 'gut' | 'mittel' | 'schlecht' {
    const textParts = cleanText.split(/\s+/);
    const keywordPositions = textParts
      .map((word, index) => regex.test(word) ? index / textParts.length : -1)
      .filter(pos => pos >= 0);

    if (keywordPositions.length >= 3) {
      const spread = Math.max(...keywordPositions) - Math.min(...keywordPositions);
      return spread > 0.4 ? 'gut' : spread > 0.2 ? 'mittel' : 'schlecht';
    } else if (keywordPositions.length >= 2) {
      return 'mittel';
    }

    return 'schlecht';
  }

  /**
   * Aktualisiert Basis-Metriken, behält aber KI-Daten
   * @param keyword - Das Keyword
   * @param text - Der Text
   * @param documentTitle - Der Titel
   * @param existingMetrics - Bestehende Metriken mit KI-Daten
   * @returns Aktualisierte Metriken (KI-Daten bleiben erhalten)
   */
  static updateMetrics(
    keyword: string,
    text: string,
    documentTitle: string,
    existingMetrics?: KeywordMetrics
  ): KeywordMetrics {
    const basicMetrics = this.calculateBasicMetrics(keyword, text, documentTitle);

    return {
      ...basicMetrics,
      semanticRelevance: existingMetrics?.semanticRelevance,
      contextQuality: existingMetrics?.contextQuality,
      targetAudience: existingMetrics?.targetAudience,
      tonality: existingMetrics?.tonality,
      relatedTerms: existingMetrics?.relatedTerms
    };
  }
}
