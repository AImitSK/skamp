// src/components/campaigns/pr-seo/utils/seo-score-calculator.ts

import { HashtagDetector } from '@/lib/hashtag-detector';
import { seoKeywordService } from '@/lib/ai/seo-keyword-service';
import type { PRMetrics, KeywordMetrics, PRScoreBreakdown, KeywordScoreData } from '../types';
import { PRTypeDetector } from './pr-type-detector';

/**
 * SEO-Score-Calculator
 * Berechnet den Gesamt-PR-Score basierend auf verschiedenen Kategorien
 */
export class SEOScoreCalculator {
  /**
   * Berechnet den Gesamt-PR-Score
   * @param prMetrics - PR-spezifische Metriken
   * @param keywordMetrics - Keyword-Metriken
   * @param text - Der HTML-Text-Inhalt
   * @param documentTitle - Der Titel
   * @param keywords - Die Keywords
   * @param keywordScoreData - Optional: Vorberechnete Keyword-Score-Daten
   * @returns Score, Breakdown und Empfehlungen
   */
  static calculatePRScore(
    prMetrics: PRMetrics,
    keywordMetrics: KeywordMetrics[],
    text: string,
    documentTitle: string,
    keywords: string[],
    keywordScoreData?: KeywordScoreData | null
  ): { totalScore: number; breakdown: PRScoreBreakdown; recommendations: string[] } {
    const recommendations: string[] = [];

    // Ermittle dominante Zielgruppe aus Keywords
    const targetAudiences = keywordMetrics
      .map(km => km.targetAudience)
      .filter((ta): ta is string => ta !== undefined && ta !== 'Unbekannt');
    const dominantAudience = targetAudiences.length > 0 ? targetAudiences[0] : 'Standard';

    // Nutze zielgruppenspezifische Schwellenwerte
    const thresholds = PRTypeDetector.getThresholds(dominantAudience);

    // PR-Typ-spezifische Modifikatoren ermitteln
    const prTypeModifiers = PRTypeDetector.getModifiers(text, documentTitle);

    // === 20% Headline & Lead-Qualität ===
    const headlineScore = this.calculateHeadlineScore(
      prMetrics,
      keywords,
      documentTitle,
      prTypeModifiers,
      recommendations
    );

    // === 20% Keyword-Performance ===
    const keywordScore = this.calculateKeywordScore(
      keywords,
      text,
      keywordMetrics,
      keywordScoreData,
      recommendations
    );

    // === 20% Struktur & Lesbarkeit ===
    const structureScore = this.calculateStructureScore(
      prMetrics,
      thresholds,
      dominantAudience,
      recommendations
    );

    // === 15% Semantische Relevanz (KI) ===
    const relevanceScore = keywordMetrics.length > 0
      ? keywordMetrics.reduce((sum, km) => sum + (km.contextQuality || 50), 0) / keywordMetrics.length
      : 0;

    // === 10% Konkretheit ===
    const concretenessScore = this.calculateConcretenessScore(prMetrics, recommendations);

    // === 10% Zitate & CTA ===
    const engagementScore = this.calculateEngagementScore(prMetrics, text, recommendations);

    // === 5% Social-Media-Optimierung ===
    const socialScore = this.calculateSocialScore(text, documentTitle, keywords, recommendations);

    const breakdown: PRScoreBreakdown = {
      headline: headlineScore,
      keywords: keywordScore,
      structure: structureScore,
      relevance: relevanceScore,
      concreteness: concretenessScore,
      engagement: engagementScore,
      social: socialScore
    };

    // Ohne Keywords kein Score
    const totalScore = keywords.length === 0 ? 0 : Math.round(
      (breakdown.headline * 0.20) +      // 20%
      (breakdown.keywords * 0.20) +      // 20%
      (breakdown.structure * 0.20) +     // 20%
      (breakdown.relevance * 0.15) +     // 15%
      (breakdown.concreteness * 0.10) +  // 10%
      (breakdown.engagement * 0.10) +    // 10%
      (breakdown.social * 0.05)          // 5%
    );

    return { totalScore, breakdown, recommendations };
  }

  /**
   * Berechnet Headline-Score (20%)
   */
  private static calculateHeadlineScore(
    prMetrics: PRMetrics,
    keywords: string[],
    documentTitle: string,
    prTypeModifiers: any,
    recommendations: string[]
  ): number {
    let headlineScore = 60; // Solider Basis-Score

    // Längen-Bewertung
    if (prMetrics.headlineLength >= 30 && prMetrics.headlineLength <= 80) {
      headlineScore += 20;
    } else if (prMetrics.headlineLength >= 25 && prMetrics.headlineLength <= 90) {
      headlineScore += 15;
    } else if (prMetrics.headlineLength >= 20 && prMetrics.headlineLength <= 100) {
      headlineScore += 10;
    } else {
      headlineScore -= 10;
      if (prMetrics.headlineLength < 20) {
        recommendations.push(`Headline zu kurz: ${prMetrics.headlineLength} Zeichen (optimal: 30-80)`);
      } else {
        recommendations.push(`Headline zu lang: ${prMetrics.headlineLength} Zeichen (optimal: 30-80)`);
      }
    }

    // Keywords-Bonus
    if (prMetrics.headlineHasKeywords) {
      headlineScore += 15;
    } else {
      recommendations.push('Keywords in Headline verwenden für bessere SEO-Performance');
    }

    // Aktive Verben als Bonus (PR-Typ-bewusst)
    if (prMetrics.headlineHasActiveVerb) {
      headlineScore += prTypeModifiers.verbImportance;
    } else {
      if (prTypeModifiers.verbImportance >= 20) {
        recommendations.push(`Aktive Verben empfohlen${prTypeModifiers.recommendationSuffix}`);
      } else if (prTypeModifiers.verbImportance >= 10) {
        recommendations.push(`Aktive Verben können Headlines verstärken${prTypeModifiers.recommendationSuffix}`);
      }
    }

    // PR-Typ-spezifische Modifikatoren
    headlineScore += prTypeModifiers.headlineModifier;

    // Keyword-Stuffing-Prüfung
    const keywordMentions = keywords.reduce((count, kw) =>
      count + (documentTitle.toLowerCase().split(kw.toLowerCase()).length - 1), 0
    );
    if (keywordMentions > 2) {
      headlineScore -= 15;
      recommendations.push('Keyword-Stuffing in Headline vermeiden - natürlicher formulieren');
    }

    return Math.max(40, Math.min(100, headlineScore));
  }

  /**
   * Berechnet Keyword-Score (20%)
   */
  private static calculateKeywordScore(
    keywords: string[],
    text: string,
    keywordMetrics: KeywordMetrics[],
    keywordScoreData: KeywordScoreData | null | undefined,
    recommendations: string[]
  ): number {
    if (keywords.length === 0) {
      recommendations.push('Keywords hinzufügen für SEO-Bewertung (maximal 2)');
      return 0;
    }

    // Keyword-Score aus übergebenem Score-Daten oder neu berechnen
    const scoreResult = keywordScoreData || seoKeywordService.calculateKeywordScore(keywords, text, keywordMetrics);
    const keywordScore = scoreResult.totalScore;

    // Generiere spezifische Empfehlungen
    if (scoreResult.baseScore < 30) {
      recommendations.push('Keywords besser positionieren: In Headline und ersten Absatz einbauen');
    }
    if (scoreResult.breakdown.keywordDistribution < 10) {
      recommendations.push('Keywords gleichmäßiger im Text verteilen');
    }
    if (scoreResult.breakdown.naturalFlow < 5) {
      recommendations.push('Keyword-Stuffing vermeiden - natürlichere Einbindung');
    }
    if (scoreResult.hasAIAnalysis && scoreResult.aiBonus < 20) {
      recommendations.push('[KI] Thematische Relevanz der Keywords zum Content verbessern');
    } else if (!scoreResult.hasAIAnalysis && scoreResult.breakdown.fallbackBonus < 20) {
      recommendations.push('KI-Analyse aktualisieren für erweiterte Keyword-Bewertung');
    }

    // Keyword-spezifische Empfehlungen
    keywordMetrics.forEach(km => {
      if (km.density < 0.3 && km.occurrences === 0) {
        recommendations.push(`"${km.keyword}" im Text verwenden (nicht gefunden)`);
      } else if (km.density < 0.3) {
        recommendations.push(`"${km.keyword}" öfter verwenden (nur ${km.occurrences}x - optimal: 2-5x)`);
      } else if (km.density > 3.0) {
        recommendations.push(`"${km.keyword}" weniger verwenden (${km.occurrences}x = ${km.density.toFixed(1)}% - zu häufig)`);
      }

      if (!km.inHeadline && !km.inFirstParagraph) {
        recommendations.push(`"${km.keyword}" in Headline oder ersten Absatz einbauen`);
      }

      if (km.distribution === 'schlecht' && km.occurrences >= 2) {
        recommendations.push(`"${km.keyword}" gleichmäßiger im Text verteilen`);
      }

      // KI-basierte Empfehlungen
      if (km.semanticRelevance && km.semanticRelevance < 60) {
        recommendations.push(`[KI] "${km.keyword}" thematische Relevanz stärken (${km.semanticRelevance}%)`);
      }
      if (km.contextQuality && km.contextQuality < 60) {
        recommendations.push(`[KI] "${km.keyword}" natürlicher in Kontext einbinden (${km.contextQuality}%)`);
      }

      // Zielgruppen-spezifische Empfehlungen
      if (km.tonality && km.targetAudience) {
        if (km.targetAudience === 'B2B' && km.tonality === 'Emotional') {
          recommendations.push(`[KI] "${km.keyword}" sachlicher formulieren für B2B-Zielgruppe`);
        }
        if (km.targetAudience === 'B2C' && km.tonality === 'Sachlich') {
          recommendations.push(`[KI] "${km.keyword}" emotionaler gestalten für B2C-Zielgruppe`);
        }
      }
    });

    return keywordScore;
  }

  /**
   * Berechnet Struktur-Score (20%)
   */
  private static calculateStructureScore(
    prMetrics: PRMetrics,
    thresholds: any,
    dominantAudience: string,
    recommendations: string[]
  ): number {
    let structureScore = 0;

    // Absatzlänge bewerten (zielgruppenbasiert)
    if (prMetrics.avgParagraphLength >= thresholds.paragraphLength.min &&
        prMetrics.avgParagraphLength <= thresholds.paragraphLength.max) {
      structureScore += 30;
    } else if (prMetrics.avgParagraphLength >= (thresholds.paragraphLength.min * 0.7) &&
               prMetrics.avgParagraphLength <= (thresholds.paragraphLength.max * 1.3)) {
      structureScore += 20;
    } else if (prMetrics.avgParagraphLength > thresholds.paragraphLength.max) {
      recommendations.push(`[KI] Absätze für ${dominantAudience}-Zielgruppe kürzen (aktuell: ${prMetrics.avgParagraphLength.toFixed(0)} Zeichen - optimal: ${thresholds.paragraphLength.min}-${thresholds.paragraphLength.max})`);
    } else if (prMetrics.avgParagraphLength < thresholds.paragraphLength.min && prMetrics.avgParagraphLength > 0) {
      recommendations.push(`[KI] Absätze für ${dominantAudience}-Zielgruppe ausführlicher gestalten (aktuell: ${prMetrics.avgParagraphLength.toFixed(0)} Zeichen - optimal: ${thresholds.paragraphLength.min}-${thresholds.paragraphLength.max})`);
    }

    // Bullet Points (optional)
    if (prMetrics.hasBulletPoints) {
      structureScore += 20;
    }

    // Zwischenüberschriften (optional)
    if (prMetrics.hasSubheadings) {
      structureScore += 25;
    }

    // Lead-Länge bewerten
    if (prMetrics.leadLength >= 80 && prMetrics.leadLength <= 250) {
      structureScore += 25;
    } else if (prMetrics.leadLength >= 40 && prMetrics.leadLength <= 400) {
      structureScore += 15;
    } else {
      recommendations.push(`Lead-Absatz sollte 80-250 Zeichen haben (aktuell: ${prMetrics.leadLength})`);
    }

    return structureScore;
  }

  /**
   * Berechnet Konkretheit-Score (10%)
   */
  private static calculateConcretenessScore(
    prMetrics: PRMetrics,
    recommendations: string[]
  ): number {
    let concretenessScore = 0;

    if (prMetrics.numberCount >= 2) concretenessScore += 40;
    if (prMetrics.hasSpecificDates) concretenessScore += 30;
    if (prMetrics.hasCompanyNames) concretenessScore += 30;

    if (prMetrics.numberCount < 2 && !prMetrics.hasSpecificDates && !prMetrics.hasCompanyNames) {
      recommendations.push('Konkrete Zahlen, Daten und Firmennamen verwenden');
    }

    return concretenessScore;
  }

  /**
   * Berechnet Engagement-Score (10%)
   */
  private static calculateEngagementScore(
    prMetrics: PRMetrics,
    text: string,
    recommendations: string[]
  ): number {
    let engagementScore = 40; // Basis-Score

    // CTA-Erkennung
    const ctaMatches = text.match(/<span[^>]*data-type="cta-text"[^>]*>/g) || [];
    const hasStandardCTA = ctaMatches.length >= 1;
    const hasContactInfo = /\b(kontakt|telefon|email|@|\.de|\.com)\b/i.test(text.replace(/<[^>]*>/g, ''));
    const hasUrls = /\b(http|www\.|\.de|\.com)\b/i.test(text.replace(/<[^>]*>/g, ''));
    const hasActionWords = /\b(jetzt|heute|sofort|direkt|besuchen|kontaktieren|erfahren|downloaden|buchen|anmelden|registrieren)\b/i.test(text.replace(/<[^>]*>/g, ''));
    const hasAnyCTA = hasStandardCTA || hasContactInfo || hasUrls || hasActionWords;

    // Zitat-Erkennung
    const hasBlockquotes = prMetrics.quoteCount >= 1;
    const hasQuotationMarks = text.replace(/<[^>]*>/g, '').includes('"') ||
                              text.replace(/<[^>]*>/g, '').includes('„') ||
                              text.replace(/<[^>]*>/g, '').includes('"');
    const hasAttributions = /\b(sagt|erklärt|betont|kommentiert|so|laut)\b/i.test(text.replace(/<[^>]*>/g, ''));
    const hasAnyQuote = hasBlockquotes || (hasQuotationMarks && hasAttributions);

    // Einzelne Features belohnen
    if (hasAnyQuote) {
      engagementScore += 30;
    } else {
      recommendations.push('Zitat oder Aussage hinzufügen (Strg+Shift+Q oder "..." mit Attribution)');
    }

    if (hasAnyCTA) {
      engagementScore += 30;
    } else {
      recommendations.push('Call-to-Action hinzufügen (Strg+Shift+C, Kontaktdaten oder Handlungsaufforderung)');
    }

    // Aktive Sprache belohnen
    if (prMetrics.hasActionVerbs) {
      engagementScore += 20;
    }

    // Bonus für perfekte Kombination
    if (hasAnyQuote && hasAnyCTA) {
      engagementScore += 10;
    }

    return Math.min(100, engagementScore);
  }

  /**
   * Berechnet Social-Media-Score (5%)
   */
  private static calculateSocialScore(
    text: string,
    documentTitle: string,
    keywords: string[],
    recommendations: string[]
  ): number {
    let score = 0;

    // Headline Twitter-optimiert (< 280 Zeichen)
    if (documentTitle.length <= 280) {
      score += 40;
    } else if (documentTitle.length <= 320) {
      score += 25;
      recommendations.push('Headline etwas kürzen für bessere Social-Media-Tauglichkeit');
    } else {
      score += 10;
      recommendations.push('Headline für Twitter kürzen: Unter 280 Zeichen für optimale Social-Media-Reichweite');
    }

    // Hashtags vorhanden
    const detectedHashtags = HashtagDetector.detectHashtags(text);
    if (detectedHashtags.length >= 3) {
      score += 35;
    } else if (detectedHashtags.length >= 2) {
      score += 25;
    } else if (detectedHashtags.length >= 1) {
      score += 15;
      recommendations.push('Weitere Hashtags ergänzen (optimal: 2-3 pro Post)');
    } else {
      recommendations.push('2-3 relevante Hashtags hinzufügen für Social-Media-Optimierung');
    }

    // Hashtag-Qualität
    if (detectedHashtags.length > 0) {
      const quality = HashtagDetector.assessHashtagQuality(detectedHashtags, keywords);
      score += Math.min(25, (quality.averageScore / 100) * 25);

      if (quality.averageScore < 60) {
        recommendations.push('Verwende branchenrelevante und keyword-bezogene Hashtags');
      }
    }

    return Math.min(100, score);
  }
}
