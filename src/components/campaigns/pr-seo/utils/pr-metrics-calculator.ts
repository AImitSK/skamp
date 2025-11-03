// src/components/campaigns/pr-seo/utils/pr-metrics-calculator.ts

import type { PRMetrics } from '../types';

/**
 * PR-Metriken-Calculator
 * Berechnet PR-spezifische Metriken (Struktur, Formatierung, Inhalt)
 */
export class PRMetricsCalculator {
  /**
   * Berechnet alle PR-Metriken für einen Text
   * @param text - Der HTML-Text-Inhalt
   * @param title - Der Titel/Headline
   * @param keywords - Die Keywords für Keyword-Checks
   * @returns PR-Metriken-Objekt
   */
  static calculate(text: string, title: string, keywords: string[]): PRMetrics {
    const cleanText = text.replace(/<[^>]*>/g, '');

    // Absätze korrekt aus HTML <p> Tags extrahieren
    const paragraphMatches = text.match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
    const paragraphs = paragraphMatches
      .map(p => p.replace(/<[^>]*>/g, '').trim())
      .filter(p => p.length > 0);

    // Zitate zählen (markup-basiert)
    const prQuoteMatches = text.match(/<blockquote[^>]*data-type="pr-quote"[^>]*>/g) || [];
    const regularQuoteMatches = text.match(/<blockquote(?![^>]*data-type)[^>]*>/g) || [];
    const quoteCount = prQuoteMatches.length + regularQuoteMatches.length;

    // Erweiterte aktive Verben-Erkennung
    const activeVerbs = this.getActiveVerbs();
    const hasActiveVerb = activeVerbs.some(verb =>
      new RegExp(`\\b${verb.replace(/\s+/g, '\\s+')}\\b`, 'i').test(title)
    );

    return {
      headlineLength: title.length,
      headlineHasKeywords: keywords.some(kw => title.toLowerCase().includes(kw.toLowerCase())),
      headlineHasActiveVerb: hasActiveVerb,
      leadLength: paragraphs[0]?.length || 0,
      leadHasNumbers: /\d+/.test(paragraphs[0] || ''),
      leadKeywordMentions: keywords.reduce((count, kw) =>
        count + (paragraphs[0]?.toLowerCase().split(kw.toLowerCase()).length - 1 || 0), 0
      ),
      quoteCount,
      avgQuoteLength: quoteCount > 0 ? 150 : 0, // Estimate
      hasActionVerbs: /\b(jetzt|heute|sofort|direkt|besuchen|kontaktieren|erfahren|downloaden)\b/i.test(cleanText),
      hasLearnMore: /\b(mehr erfahren|weitere informationen|details|jetzt lesen)\b/i.test(cleanText),
      avgParagraphLength: paragraphs.length > 0
        ? paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length
        : 0,
      hasBulletPoints: text.includes('<ul>') || text.includes('<ol>'),
      hasSubheadings: /<h[1-6]>/i.test(text),
      numberCount: (cleanText.match(/\d+/g) || []).length,
      hasSpecificDates: /\b\d{1,2}\.\d{1,2}\.\d{4}\b|\b\d{4}\b/.test(cleanText),
      hasCompanyNames: /\b[A-Z][a-z]+ (GmbH|AG|Inc|Corp|Ltd)\b/.test(cleanText) ||
                       /\b[A-Z]{2,}(\s+[A-Z][a-z]+){1,3}\b/.test(cleanText)
    };
  }

  /**
   * Liefert erweiterte deutsche aktive Verben für verschiedene PR-Typen
   * @returns Array mit aktiven Verben
   */
  static getActiveVerbs(): string[] {
    return [
      // Business/Corporate
      'startet', 'lanciert', 'präsentiert', 'entwickelt', 'investiert',
      'expandiert', 'gründet', 'übernimmt', 'kooperiert', 'digitalisiert',

      // Innovation/Tech
      'innoviert', 'automatisiert', 'revolutioniert', 'optimiert', 'transformiert',
      'implementiert', 'integriert', 'skaliert', 'modernisiert',

      // Marketing/Sales
      'führt ein', 'bringt heraus', 'veröffentlicht', 'kündigt an', 'erweitert',
      'verbessert', 'aktualisiert', 'steigert', 'erhöht',

      // Achievements
      'erreicht', 'gewinnt', 'erhält', 'wird ausgezeichnet', 'feiert',
      'verzeichnet', 'erzielt', 'übertrifft',

      // Weitere deutsche Business-Verben
      'realisiert', 'etabliert', 'verstärkt', 'ausbaut', 'schafft',
      'eröffnet', 'bietet', 'liefert', 'produziert', 'erschließt'
    ];
  }
}
