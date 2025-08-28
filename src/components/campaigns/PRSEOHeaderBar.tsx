// src/components/campaigns/PRSEOHeaderBar.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MagnifyingGlassIcon,
  SparklesIcon,
  XMarkIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';
import { seoKeywordService } from '@/lib/ai/seo-keyword-service';
import { HashtagDetector } from '@/lib/hashtag-detector';
import clsx from 'clsx';

interface KeywordMetrics {
  keyword: string;
  density: number;
  occurrences: number;
  inHeadline: boolean;
  inFirstParagraph: boolean;
  distribution: 'gut' | 'mittel' | 'schlecht';
  semanticRelevance?: number;
  contextQuality?: number;
  relatedTerms?: string[];
  // NEUE KI-Felder für 3.0
  targetAudience?: string;  // 'B2B', 'B2C', 'Verbraucher', etc.
  tonality?: string;        // 'Sachlich', 'Emotional', 'Verkäuferisch', etc.
}

interface PRMetrics {
  headlineLength: number;
  headlineHasKeywords: boolean;
  headlineHasActiveVerb: boolean;
  leadLength: number;
  leadHasNumbers: boolean;
  leadKeywordMentions: number;
  quoteCount: number;
  avgQuoteLength: number;
  hasActionVerbs: boolean;
  hasLearnMore: boolean;
  avgParagraphLength: number;
  hasBulletPoints: boolean;
  hasSubheadings: boolean;
  numberCount: number;
  hasSpecificDates: boolean;
  hasCompanyNames: boolean;
}

interface PRScoreBreakdown {
  headline: number;
  keywords: number;
  structure: number;
  relevance: number;
  concreteness: number;
  engagement: number;
  social: number;
}

// Neue Interfaces für Keyword-Bonus-System
interface KeywordScoreData {
  baseScore: number;
  aiBonus: number;
  totalScore: number;
  hasAIAnalysis: boolean;
  breakdown: {
    keywordPosition: number;
    keywordDistribution: number;
    keywordVariations: number;
    naturalFlow: number;
    contextRelevance: number;
    aiRelevanceBonus: number;
    fallbackBonus: number;
  };
}

interface PRSEOHeaderBarProps {
  title?: string;
  content: string;
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
  documentTitle?: string;
  className?: string;
  onSeoScoreChange?: (scoreData: {
    totalScore: number;
    breakdown: PRScoreBreakdown;
    hints: string[];
    keywordMetrics: KeywordMetrics[];
  }) => void;
  hashtags?: string[];
}

// KI-Analysis-Box Komponente
interface KIAnalysisBoxProps {
  metrics: KeywordMetrics;
  isLoading: boolean;
}

function KIAnalysisBox({ metrics, isLoading }: KIAnalysisBoxProps) {
  const boxClasses = "inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs bg-purple-50 text-purple-700 border border-purple-300";
  
  if (isLoading) {
    return (
      <div className={boxClasses}>
        <div className="w-3 h-3 border border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <span>KI analysiert...</span>
      </div>
    );
  }
  
  if (!metrics.semanticRelevance && !metrics.targetAudience && !metrics.tonality) {
    return (
      <div className={boxClasses}>
        <SparklesIcon className="h-3 w-3" />
        <span>Bereit für Analyse</span>
      </div>
    );
  }
  
  // Trend-Indikator für Relevanz (später implementierbar)
  const relevanceTrend = ""; // Später: "↑" oder "↓" basierend auf vorherigem Wert
  
  return (
    <div className={boxClasses}>
      <SparklesIcon className="h-3 w-3" />
      <span className="font-semibold">Relevanz:</span>
      <span>{metrics.semanticRelevance || 0}%{relevanceTrend}</span>
    </div>
  );
}

export function PRSEOHeaderBar({
  title = "PR-SEO Analyse",
  content,
  keywords,
  onKeywordsChange,
  documentTitle = '',
  className,
  onSeoScoreChange
}: PRSEOHeaderBarProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [keywordMetrics, setKeywordMetrics] = useState<KeywordMetrics[]>([]);
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
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  // Basis-Metriken berechnen (ohne KI)
  const calculateBasicMetrics = useCallback((keyword: string, text: string): Omit<KeywordMetrics, 'semanticRelevance' | 'contextQuality' | 'relatedTerms'> => {
    const cleanText = text.replace(/<[^>]*>/g, '').toLowerCase();
    const totalWords = cleanText.split(/\s+/).filter(word => word.length > 0).length;
    
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
    const matches = cleanText.match(regex) || [];
    const occurrences = matches.length;
    const density = totalWords > 0 ? (occurrences / totalWords) * 100 : 0;
    
    const firstParagraphText = cleanText.split('\n')[0] || '';
    const inFirstParagraph = regex.test(firstParagraphText);
    const inHeadline = regex.test(documentTitle.toLowerCase());
    
    // Verteilung analysieren
    const textParts = cleanText.split(/\s+/);
    const keywordPositions = textParts.map((word, index) => 
      regex.test(word) ? index / textParts.length : -1
    ).filter(pos => pos >= 0);
    
    let distribution: 'gut' | 'mittel' | 'schlecht' = 'schlecht';
    if (keywordPositions.length >= 3) {
      const spread = Math.max(...keywordPositions) - Math.min(...keywordPositions);
      distribution = spread > 0.4 ? 'gut' : spread > 0.2 ? 'mittel' : 'schlecht';
    } else if (keywordPositions.length >= 2) {
      distribution = 'mittel'; // Bei 2 Vorkommen = mittel
    }

    return {
      keyword,
      density,
      occurrences,
      inHeadline,
      inFirstParagraph,
      distribution
    };
  }, [documentTitle]);

  // Erweiterte deutsche aktive Verben für verschiedene PR-Typen
  const getActiveVerbs = useCallback(() => {
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
  }, []);

  // PR-spezifische Metriken berechnen
  const calculatePRMetrics = useCallback((text: string, title: string): PRMetrics => {
    const cleanText = text.replace(/<[^>]*>/g, '');
    
    // Absätze korrekt aus HTML <p> Tags extrahieren
    const paragraphMatches = text.match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
    const paragraphs = paragraphMatches.map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p.length > 0);
    
    
    // Zitate zählen (markup-basiert)
    const prQuoteMatches = text.match(/<blockquote[^>]*data-type="pr-quote"[^>]*>/g) || [];
    const regularQuoteMatches = text.match(/<blockquote(?![^>]*data-type)[^>]*>/g) || [];
    const quoteCount = prQuoteMatches.length + regularQuoteMatches.length;
    
    // CTA zählen (markup-basiert)  
    const ctaMatches = text.match(/<span[^>]*data-type="cta-text"[^>]*>/g) || [];
    const ctaCount = ctaMatches.length;
    
    // Erweiterte aktive Verben-Erkennung
    const activeVerbs = getActiveVerbs();
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
      avgParagraphLength: paragraphs.length > 0 ? paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length : 0,
      hasBulletPoints: text.includes('<ul>') || text.includes('<ol>'),
      hasSubheadings: /<h[1-6]>/i.test(text),
      numberCount: (cleanText.match(/\d+/g) || []).length,
      hasSpecificDates: /\b\d{1,2}\.\d{1,2}\.\d{4}\b|\b\d{4}\b/.test(cleanText),
      hasCompanyNames: /\b[A-Z][a-z]+ (GmbH|AG|Inc|Corp|Ltd)\b/.test(cleanText) || /\b[A-Z]{2,}(\s+[A-Z][a-z]+){1,3}\b/.test(cleanText)
    };
  }, [keywords, getActiveVerbs]);

  // Zielgruppen-basierte Schwellenwerte
  const getThresholds = useCallback((targetAudience: string) => {
    switch (targetAudience) {
      case 'B2B':
        return {
          paragraphLength: { min: 150, max: 500 },  // Längere Absätze OK
          sentenceComplexity: { max: 25 },          // Komplexere Sätze erlaubt
          technicalTerms: { bonus: 10 }             // Fachbegriffe positiv
        };
      case 'B2C':
        return {
          paragraphLength: { min: 80, max: 250 },   // Kürzere Absätze
          sentenceComplexity: { max: 15 },          // Einfachere Sätze
          technicalTerms: { penalty: 5 }            // Fachbegriffe negativ
        };
      case 'Verbraucher':
        return {
          paragraphLength: { min: 60, max: 200 },   // Sehr kurze Absätze
          sentenceComplexity: { max: 12 },          // Sehr einfache Sätze
          technicalTerms: { penalty: 10 }           // Fachbegriffe sehr negativ
        };
      default:
        return {
          paragraphLength: { min: 100, max: 300 },
          sentenceComplexity: { max: 20 },
          technicalTerms: { neutral: 0 }
        };
    }
  }, []);

  // PR-Typ-spezifische Bewertungsmodifikatoren
  const getPRTypeModifiers = useCallback((content: string, title: string) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').toLowerCase();
    const cleanTitle = title.toLowerCase();
    
    // Erkenne PR-Typ basierend auf Inhalt
    const prType = {
      isProduct: /\b(produkt|service|lösung|software|app|plattform|tool)\b/i.test(cleanContent),
      isFinancial: /\b(umsatz|gewinn|quartal|geschäftsjahr|bilanz|finanzen|ergebnis)\b/i.test(cleanContent),
      isPersonal: /\b(ernennung|beförderung|new hire|verstorben|nachruf|award)\b/i.test(cleanContent),
      isResearch: /\b(studie|umfrage|forschung|analyse|bericht|whitepaper)\b/i.test(cleanContent),
      isCrisis: /\b(entschuldigung|bedauern|korrektur|richtigstellung|stellungnahme)\b/i.test(cleanContent),
      isEvent: /\b(veranstaltung|konferenz|messe|webinar|event|termin)\b/i.test(cleanContent)
    };
    
    // Typ-spezifische Modifier für Headline-Bewertung
    let headlineModifier = 0;
    let verbImportance = 15; // Standard
    let recommendationSuffix = '';
    
    if (prType.isFinancial || prType.isResearch) {
      // Finanz/Research PR: Verben weniger wichtig, Zahlen wichtiger
      verbImportance = 5;
      headlineModifier = cleanTitle.match(/\d+/g) ? 10 : 0; // Zahlen-Bonus
      recommendationSuffix = ' (Zahlen und Fakten wichtiger als aktive Sprache)';
    } else if (prType.isPersonal) {
      // Personal PR: Verben optional, Titel/Namen wichtig
      verbImportance = 8;
      headlineModifier = /\b(dr\.|prof\.|ceo|cto|direktor)\b/i.test(cleanTitle) ? 8 : 0;
      recommendationSuffix = ' (bei Personal-PR sind Titel und Position wichtiger)';
    } else if (prType.isCrisis) {
      // Crisis PR: Sachlichkeit wichtiger als Dynamik
      verbImportance = 3;
      headlineModifier = /\b(erklärt|stellt klar|informiert)\b/i.test(cleanTitle) ? 12 : 0;
      recommendationSuffix = ' (bei Crisis-PR ist sachliche Kommunikation wichtiger)';
    } else if (prType.isProduct || prType.isEvent) {
      // Product/Event PR: Verben sehr wichtig für Action
      verbImportance = 25;
      recommendationSuffix = ' (bei Produkt/Event-PR verstärken aktive Verben die Wirkung)';
    }
    
    return { headlineModifier, verbImportance, recommendationSuffix, prType };
  }, []);

  // Social-Score berechnen (neue 5% Kategorie)
  const calculateSocialScore = useCallback((content: string, headline: string, hashtags?: string[]): number => {
    let score = 0;
    
    // 1. Headline Twitter-optimiert (< 280 Zeichen) = 40%
    if (headline.length <= 280) {
      score += 40;
    } else if (headline.length <= 320) {
      score += 25;
    } else {
      score += 10; // Zu lang für Social Media
    }
    
    // 2. Hashtags vorhanden = 35%
    const detectedHashtags = hashtags || HashtagDetector.detectHashtags(content);
    if (detectedHashtags.length >= 3) {
      score += 35;
    } else if (detectedHashtags.length >= 2) {
      score += 25;
    } else if (detectedHashtags.length >= 1) {
      score += 15;
    }
    
    // 3. Hashtag-Qualität = 25%
    if (detectedHashtags.length > 0) {
      const quality = HashtagDetector.assessHashtagQuality(detectedHashtags, keywords);
      score += Math.min(25, (quality.averageScore / 100) * 25);
    }
    
    return Math.min(100, score);
  }, [keywords]);

  // PR-Score berechnen
  const calculatePRScore = useCallback((prMetrics: PRMetrics, keywordMetrics: KeywordMetrics[], text: string, currentKeywordScoreData?: KeywordScoreData | null): { totalScore: number, breakdown: PRScoreBreakdown, recommendations: string[] } => {
    const recommendations: string[] = [];
    
    // Ermittle dominante Zielgruppe aus Keywords
    const targetAudiences = keywordMetrics
      .map(km => km.targetAudience)
      .filter((ta): ta is string => ta !== undefined && ta !== 'Unbekannt');
    const dominantAudience = targetAudiences.length > 0 ? targetAudiences[0] : 'Standard';
    
    // Nutze zielgruppenspezifische Schwellenwerte
    const thresholds = getThresholds(dominantAudience);
    
    // PR-Typ-spezifische Modifikatoren ermitteln
    const prTypeModifiers = getPRTypeModifiers(text, documentTitle);
    
    // 25% Headline & Lead-Qualität - MODERNISIERTE FLEXIBLE BEWERTUNG
    let headlineScore = 60; // Solider Basis-Score für jede Headline
    
    // Längen-Bewertung (wichtiger als Verben):
    if (prMetrics.headlineLength >= 30 && prMetrics.headlineLength <= 80) {
      headlineScore += 20; // Optimal
    } else if (prMetrics.headlineLength >= 25 && prMetrics.headlineLength <= 90) {
      headlineScore += 15; // Gut
    } else if (prMetrics.headlineLength >= 20 && prMetrics.headlineLength <= 100) {
      headlineScore += 10; // Okay
    } else {
      headlineScore -= 10; // Negative Bewertung für schlechte Längen
      if (prMetrics.headlineLength < 20) {
        recommendations.push(`Headline zu kurz: ${prMetrics.headlineLength} Zeichen (optimal: 30-80)`);
      } else {
        recommendations.push(`Headline zu lang: ${prMetrics.headlineLength} Zeichen (optimal: 30-80)`);
      }
    }
    
    // Keywords-Bonus (wichtiger als Verben):
    if (prMetrics.headlineHasKeywords) {
      headlineScore += 15;
    } else {
      recommendations.push('Keywords in Headline verwenden für bessere SEO-Performance');
    }
    
    // Aktive Verben als Bonus (nicht Pflicht!) - PR-Typ und Tonalitäts-bewusst:
    if (prMetrics.headlineHasActiveVerb) {
      // Nutze PR-Typ-spezifische Verb-Wichtigkeit
      headlineScore += prTypeModifiers.verbImportance;
    } else {
      // Kontext-sensitive Empfehlungen basierend auf PR-Typ
      if (prTypeModifiers.verbImportance >= 20) {
        recommendations.push(`Aktive Verben empfohlen${prTypeModifiers.recommendationSuffix}`);
      } else if (prTypeModifiers.verbImportance >= 10) {
        recommendations.push(`Aktive Verben können Headlines verstärken${prTypeModifiers.recommendationSuffix}`);
      } else if (prTypeModifiers.verbImportance <= 5) {
        // Keine Empfehlung für niedrige Verb-Wichtigkeit (Finanz/Research/Crisis PR)
      } else {
        recommendations.push(`Aktive Verben optional${prTypeModifiers.recommendationSuffix}`);
      }
    }
    
    // PR-Typ-spezifische Headline-Modifikatoren anwenden
    headlineScore += prTypeModifiers.headlineModifier;
    
    // Keyword-Stuffing-Prüfung (negative Bewertung)
    const keywordMentions = keywords.reduce((count, kw) => 
      count + (prMetrics.headlineLength > 0 ? (documentTitle.toLowerCase().split(kw.toLowerCase()).length - 1) : 0), 0
    );
    if (keywordMentions > 2) {
      headlineScore -= 15;
      recommendations.push('Keyword-Stuffing in Headline vermeiden - natürlicher formulieren');
    }
    
    // Finale Headline-Score Normalisierung (40-100 Range)
    headlineScore = Math.max(40, Math.min(100, headlineScore));

    // 20% Keyword-Performance - NEUE BONUS-SYSTEM LOGIK
    let keywordScore = 0;
    let keywordScoreResult: any = null;
    
    // Keyword-Score aus übergebenem Score-Daten übernehmen wenn verfügbar
    if (currentKeywordScoreData) {
      keywordScore = currentKeywordScoreData.totalScore;
      keywordScoreResult = currentKeywordScoreData;
    } else {
      // Fallback: Verwende neues Bonus-System für Keyword-Bewertung
      keywordScoreResult = seoKeywordService.calculateKeywordScore(keywords, text, keywordMetrics);
      keywordScore = keywordScoreResult.totalScore;
    }
    
    // Generiere spezifische Empfehlungen basierend auf Bonus-System
    if (keywordScoreResult && keywordScoreResult.baseScore < 30) {
      recommendations.push('Keywords besser positionieren: In Headline und ersten Absatz einbauen');
    }
    
    if (keywordScoreResult && keywordScoreResult.breakdown.keywordDistribution < 10) {
      recommendations.push('Keywords gleichmäßiger im Text verteilen');
    }
    
    if (keywordScoreResult && keywordScoreResult.breakdown.naturalFlow < 5) {
      recommendations.push('Keyword-Stuffing vermeiden - natürlichere Einbindung');
    }
    
    if (keywordScoreResult && keywordScoreResult.hasAIAnalysis && keywordScoreResult.aiBonus < 20) {
      recommendations.push('[KI] Thematische Relevanz der Keywords zum Content verbesser');
    } else if (keywordScoreResult && !keywordScoreResult.hasAIAnalysis && keywordScoreResult.breakdown.fallbackBonus < 20) {
      recommendations.push('KI-Analyse aktualisieren für erweiterte Keyword-Bewertung');
    }
    
    // Spezifische Empfehlungen pro Keyword (wenn Keywords vorhanden)
    if (keywords.length > 0) {
      keywordMetrics.forEach(km => {
        // Erweiterte Keyword-spezifische Empfehlungen
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
        
        // KI-basierte Empfehlungen (erweitert)
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
          if (km.targetAudience === 'Verbraucher' && (km.tonality === 'Professionell' || km.tonality === 'Fachlich')) {
            recommendations.push(`[KI] "${km.keyword}" verständlicher formulieren für Verbraucher`);
          }
        }
      });
    } else {
      recommendations.push('Keywords hinzufügen für SEO-Bewertung (maximal 2)');
    }

    // Social-Media-Empfehlungen (neue Kategorie)
    const detectedHashtags = HashtagDetector.detectHashtags(text);
    
    if (documentTitle.length > 280) {
      recommendations.push('Headline für Twitter kürzen: Unter 280 Zeichen für optimale Social-Media-Reichweite');
    } else if (documentTitle.length > 320) {
      recommendations.push('Headline etwas kürzen für bessere Social-Media-Tauglichkeit');
    }
    
    if (detectedHashtags.length === 0) {
      recommendations.push('2-3 relevante Hashtags hinzufügen für Social-Media-Optimierung');
    } else if (detectedHashtags.length < 2) {
      recommendations.push('Weitere Hashtags ergänzen (optimal: 2-3 pro Post)');
    }
    
    // Hashtag-Qualität bewerten
    if (detectedHashtags.length > 0) {
      const hashtagQuality = HashtagDetector.assessHashtagQuality(detectedHashtags, keywords);
      if (hashtagQuality.averageScore < 60) {
        recommendations.push('Verwende branchenrelevante und keyword-bezogene Hashtags');
      }
    }

    // 20% Struktur & Lesbarkeit (zielgruppenspezifisch)
    let structureScore = 0;
    
    // Absatzlänge bewerten (zielgruppenbasiert)
    if (prMetrics.avgParagraphLength >= thresholds.paragraphLength.min && 
        prMetrics.avgParagraphLength <= thresholds.paragraphLength.max) {
      structureScore += 30; // Optimal für Zielgruppe
    } else if (prMetrics.avgParagraphLength >= (thresholds.paragraphLength.min * 0.7) && 
               prMetrics.avgParagraphLength <= (thresholds.paragraphLength.max * 1.3)) {
      structureScore += 20; // Akzeptabel
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
    
    // Lead-Länge bewerten (flexiblere Bewertung)
    if (prMetrics.leadLength >= 80 && prMetrics.leadLength <= 250) {
      structureScore += 25;
    } else if (prMetrics.leadLength >= 40 && prMetrics.leadLength <= 400) {
      structureScore += 15; // Teilpunkte für ok Länge
    } else {
      recommendations.push(`Lead-Absatz sollte 80-250 Zeichen haben (aktuell: ${prMetrics.leadLength})`);
    }
    

    // 15% Semantische Relevanz (KI)
    const relevanceScore = keywordMetrics.length > 0 ? 
      keywordMetrics.reduce((sum, km) => sum + (km.contextQuality || 50), 0) / keywordMetrics.length : 0;

    // 10% Konkretheit
    let concretenessScore = 0;
    if (prMetrics.numberCount >= 2) concretenessScore += 40;
    if (prMetrics.hasSpecificDates) concretenessScore += 30;
    if (prMetrics.hasCompanyNames) concretenessScore += 30;
    
    if (prMetrics.numberCount < 2 && !prMetrics.hasSpecificDates && !prMetrics.hasCompanyNames) {
      recommendations.push('Konkrete Zahlen, Daten und Firmennamen verwenden');
    }

    // 10% Zitate & CTA - NEUE FLEXIBLE "ODER"-LOGIK
    let engagementScore = 40; // Solider Basis-Score für jeden Text
    
    // CTA zählen aus Markup (markup-basiert)
    const ctaMatches = text.match(/<span[^>]*data-type="cta-text"[^>]*>/g) || [];
    const ctaCount = ctaMatches.length;
    
    // Erweiterte CTA-Erkennung
    const hasStandardCTA = ctaCount >= 1;
    const hasContactInfo = /\b(kontakt|telefon|email|@|\.de|\.com)\b/i.test(text.replace(/<[^>]*>/g, ''));
    const hasUrls = /\b(http|www\.|\.de|\.com)\b/i.test(text.replace(/<[^>]*>/g, ''));
    const hasActionWords = /\b(jetzt|heute|sofort|direkt|besuchen|kontaktieren|erfahren|downloaden|buchen|anmelden|registrieren)\b/i.test(text.replace(/<[^>]*>/g, ''));
    
    // Erweiterte Zitat-Erkennung
    const hasBlockquotes = prMetrics.quoteCount >= 1;
    const hasQuotationMarks = text.replace(/<[^>]*>/g, '').includes('"') || text.replace(/<[^>]*>/g, '').includes('„') || text.replace(/<[^>]*>/g, '').includes('"');
    const hasAttributions = /\b(sagt|erklärt|betont|kommentiert|so|laut)\b/i.test(text.replace(/<[^>]*>/g, ''));
    
    // Kombiniere alle CTA-Varianten
    const hasAnyCTA = hasStandardCTA || hasContactInfo || hasUrls || hasActionWords;
    const hasAnyQuote = hasBlockquotes || (hasQuotationMarks && hasAttributions);
    
    // Einzelne Features belohnen (ODER-Logik):
    if (hasAnyQuote) {
      engagementScore += 30; // Zitat = +30
    } else {
      recommendations.push('Zitat oder Aussage hinzufügen (Strg+Shift+Q oder "..." mit Attribution)');
    }
    
    if (hasAnyCTA) {
      engagementScore += 30; // CTA = +30  
    } else {
      recommendations.push('Call-to-Action hinzufügen (Strg+Shift+C, Kontaktdaten oder Handlungsaufforderung)');
    }
    
    // Aktive Sprache belohnen
    if (prMetrics.hasActionVerbs) {
      engagementScore += 20; // Aktive Sprache = +20
    }
    
    // Bonus für perfekte Kombination (UND-Bonus):
    if (hasAnyQuote && hasAnyCTA) {
      engagementScore += 10; // Bonus für beide = +10
    }
    
    // Emotionale Elemente erkennen (moderat)
    const hasEmotionalElements = /[!]{1,2}\s/g.test(text.replace(/<[^>]*>/g, ''));
    if (hasEmotionalElements) {
      engagementScore += 5; // Leichter Bonus für emotionale Sprache
    }
    
    // Cap bei 100 Punkten
    engagementScore = Math.min(100, engagementScore);
    

    // Social-Score berechnen (neue 5% Kategorie)
    const socialScore = calculateSocialScore(text, documentTitle);

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
      (breakdown.headline * 0.20) +      // 20% (reduziert von 25%)
      (breakdown.keywords * 0.20) +      // 20%
      (breakdown.structure * 0.20) +     // 20%
      (breakdown.relevance * 0.15) +     // 15%
      (breakdown.concreteness * 0.10) +  // 10%
      (breakdown.engagement * 0.10) +    // 10%
      (breakdown.social * 0.05)          // 5% (neu)
    );

    return { totalScore, breakdown, recommendations };
  }, [keywords, getThresholds, getPRTypeModifiers, calculateSocialScore]);

  // KI-Analyse für einzelnes Keyword
  const analyzeKeywordWithAI = useCallback(async (keyword: string, text: string): Promise<Partial<KeywordMetrics>> => {
    try {
      setIsAnalyzing(true);
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Du bist ein SEO-Analyst. Analysiere das Keyword "${keyword}" im folgenden PR-Text und bewerte es objektiv.

Text:
"""
${text}
"""

Aufgabe:
1. Semantische Relevanz (0-100): Wie gut passt das Keyword zum Inhalt?
2. Kontext-Qualität (0-100): Wie natürlich ist das Keyword eingebunden?
3. Zielgruppe: Erkenne die Hauptzielgruppe (B2B, B2C, Verbraucher, Fachpublikum, etc.)
4. Tonalität: Erkenne den Schreibstil (Sachlich, Emotional, Verkäuferisch, Professionell, etc.)
5. Verwandte Begriffe: 3 Begriffe die im Text vorkommen und zum Keyword passen

Antworte NUR mit diesem JSON-Format (ohne Markdown, HTML oder zusätzlichen Text).
Gib ECHTE BEWERTUNGEN, keine Beispielwerte!
Beispiel-Format (nutze deine eigenen Werte):
{"semanticRelevance": DEIN_WERT, "contextQuality": DEIN_WERT, "targetAudience": "DEINE_ANALYSE", "tonality": "DEINE_ANALYSE", "relatedTerms": ["ECHTER_BEGRIFF1", "ECHTER_BEGRIFF2", "ECHTER_BEGRIFF3"]}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check both possible response formats
        const responseText = data.generatedText || data.content;
        
        if (!data || !responseText) {
          return {
            semanticRelevance: 50,
            contextQuality: 50,
            relatedTerms: []
          };
        }
        
        try {
          // Versuche direktes JSON-Parse
          const result = JSON.parse(responseText);
          return {
            semanticRelevance: Math.min(100, Math.max(0, result.semanticRelevance || 50)),
            contextQuality: Math.min(100, Math.max(0, result.contextQuality || 50)),
            targetAudience: result.targetAudience || 'Unbekannt',
            tonality: result.tonality || 'Neutral',
            relatedTerms: Array.isArray(result.relatedTerms) ? result.relatedTerms.slice(0, 3) : []
          };
        } catch (parseError) {
          // Fallback: Versuche JSON aus Text zu extrahieren
          try {
            const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              return {
                semanticRelevance: Math.min(100, Math.max(0, result.semanticRelevance || 50)),
                contextQuality: Math.min(100, Math.max(0, result.contextQuality || 50)),
                targetAudience: result.targetAudience || 'Unbekannt',
                tonality: result.tonality || 'Neutral',
                relatedTerms: Array.isArray(result.relatedTerms) ? result.relatedTerms.slice(0, 3) : []
              };
            } else {
            }
          } catch (secondParseError) {
          }
        }
      } else {
      }
    } catch (error) {
    } finally {
      setIsAnalyzing(false);
    }

    // Fallback-Werte
    return {
      semanticRelevance: 50,
      contextQuality: 50,
      targetAudience: 'Unbekannt',
      tonality: 'Neutral',
      relatedTerms: []
    };
  }, []);

  // Keyword hinzufügen mit sofortiger KI-Analyse
  const handleAddKeyword = useCallback(async () => {
    const keyword = newKeyword.trim();
    if (!keyword || keywords.includes(keyword) || keywords.length >= 2) return;

    // Basis-Metriken sofort berechnen
    const basicMetrics = calculateBasicMetrics(keyword, content);
    const updatedKeywords = [...keywords, keyword];
    onKeywordsChange(updatedKeywords);
    setNewKeyword('');

    // Temporäre Metriken setzen
    const tempMetrics = [...keywordMetrics, basicMetrics];
    setKeywordMetrics(tempMetrics);

    // KI-Analyse im Hintergrund
    const aiMetrics = await analyzeKeywordWithAI(keyword, content);
    const fullMetrics = { ...basicMetrics, ...aiMetrics };
    
    // Finale Metriken aktualisieren
    setKeywordMetrics(prev => 
      prev.map(km => km.keyword === keyword ? fullMetrics : km)
    );
  }, [newKeyword, keywords, content, calculateBasicMetrics, analyzeKeywordWithAI, onKeywordsChange, keywordMetrics]);

  // Alle Keywords mit KI analysieren
  const handleRefreshAnalysis = useCallback(async () => {
    if (keywords.length === 0) return;

    setIsAnalyzing(true);
    const promises = keywords.map(async keyword => {
      const basicMetrics = calculateBasicMetrics(keyword, content);
      const aiMetrics = await analyzeKeywordWithAI(keyword, content);
      return { ...basicMetrics, ...aiMetrics };
    });

    const results = await Promise.all(promises);
    setKeywordMetrics(results);
    setIsAnalyzing(false);
  }, [keywords, content, calculateBasicMetrics, analyzeKeywordWithAI]);

  // Initiale KI-Analyse beim Laden von Keywords aus der Datenbank
  useEffect(() => {
    // Nur ausführen wenn Keywords vorhanden sind und noch keine Metriken existieren
    if (keywords.length > 0 && keywordMetrics.length === 0 && content) {
      handleRefreshAnalysis();
    }
  }, [keywords.length, content]); // Nicht handleRefreshAnalysis als dependency, um Endlosschleife zu vermeiden

  // Keyword entfernen
  const handleRemoveKeyword = useCallback((keywordToRemove: string) => {
    const updatedKeywords = keywords.filter(k => k !== keywordToRemove);
    onKeywordsChange(updatedKeywords);
    setKeywordMetrics(prev => prev.filter(km => km.keyword !== keywordToRemove));
  }, [keywords, onKeywordsChange]);

  // Metriken aktualisieren bei Content-Änderung - ohne circular dependencies
  useEffect(() => {
    if (keywords.length === 0) return;

    // Basis-Metriken für alle Keywords neu berechnen (inline um Dependencies zu vermeiden)
    const updatedMetrics = keywords.map(keyword => {
      const existing = keywordMetrics.find(km => km.keyword === keyword);
      
      // Inline basic metrics calculation
      const cleanText = content.replace(/<[^>]*>/g, '').toLowerCase();
      const totalWords = cleanText.split(/\s+/).filter(word => word.length > 0).length;
      
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
      const matches = cleanText.match(regex) || [];
      const occurrences = matches.length;
      const density = totalWords > 0 ? (occurrences / totalWords) * 100 : 0;
      
      const firstParagraphText = cleanText.split('\n')[0] || '';
      const inFirstParagraph = regex.test(firstParagraphText);
      const inHeadline = regex.test(documentTitle.toLowerCase());
      
      // Verteilung analysieren
      const textParts = cleanText.split(/\s+/);
      const keywordPositions = textParts.map((word, index) => 
        regex.test(word) ? index / textParts.length : -1
      ).filter(pos => pos >= 0);
      
      let distribution: 'gut' | 'mittel' | 'schlecht' = 'schlecht';
      if (keywordPositions.length >= 3) {
        const spread = Math.max(...keywordPositions) - Math.min(...keywordPositions);
        distribution = spread > 0.4 ? 'gut' : spread > 0.2 ? 'mittel' : 'schlecht';
      } else if (keywordPositions.length >= 2) {
        distribution = 'mittel';
      }

      const basicMetrics = {
        keyword,
        density,
        occurrences,
        inHeadline,
        inFirstParagraph,
        distribution
      };
      
      // Behalte KI-Daten falls vorhanden
      return {
        ...basicMetrics,
        semanticRelevance: existing?.semanticRelevance,
        contextQuality: existing?.contextQuality,
        targetAudience: existing?.targetAudience,
        tonality: existing?.tonality,
        relatedTerms: existing?.relatedTerms
      };
    });

    setKeywordMetrics(updatedMetrics);
  }, [content, keywords, documentTitle]); // Nur Basis-Dependencies ohne Functions

  // PR-Score und Keyword-Score berechnen - ohne circular dependencies
  useEffect(() => {
    // Direkte Berechnung ohne useCallback dependencies um Endlosschleife zu vermeiden
    const prMetrics = calculatePRMetrics(content, documentTitle);
    
    // Keyword-Score-Daten erst berechnen
    const keywordScoreResult = seoKeywordService.calculateKeywordScore(keywords, content, keywordMetrics);
    setKeywordScoreData(keywordScoreResult);
    
    // Dann PR-Score mit Keyword-Score-Daten berechnen (inline um Dependencies zu vermeiden)
    const { totalScore, breakdown, recommendations: newRecommendations } = calculatePRScore(prMetrics, keywordMetrics, content, keywordScoreResult);
    
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
  }, [content, documentTitle, keywordMetrics, keywords]); // Nur die Basis-Dependencies ohne Functions

  // Score-Farbe bestimmen
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'green';
    if (score >= 40) return 'orange';
    return 'red';
  };

  const getScoreBadgeColor = (score: number): 'green' | 'yellow' | 'red' | 'zinc' => {
    if (score === 0 && keywords.length === 0) return 'zinc';
    if (score >= 76) return 'green';
    if (score >= 51) return 'yellow'; 
    return 'red';
  };

  return (
    <div className={clsx('bg-gray-50 rounded-lg p-4 border border-gray-200', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {keywords.length > 0 && (
            <button
              type="button"
              onClick={handleRefreshAnalysis}
              disabled={isAnalyzing}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="KI-Analyse aktualisieren"
            >
              <ArrowPathIcon className={clsx('h-5 w-5 text-gray-600', isAnalyzing && 'animate-spin')} />
            </button>
          )}
          <Badge color={getScoreBadgeColor(prScore)} className="text-base font-semibold px-4 py-2">
            PR-Score: {prScore}/100
          </Badge>
        </div>
      </div>

      {/* Keyword-Eingabe - halbe Breite */}
      <div className="mb-4">
        <div className="flex">
          <div className="flex gap-2 w-1/2">
            <Input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
              placeholder={keywords.length >= 2 ? "Maximum 2 Keywords erreicht" : "Keyword hinzufügen..."}
              disabled={keywords.length >= 2}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => {
                if (newKeyword.trim() && !keywords.includes(newKeyword.trim()) && keywords.length < 2) {
                  handleAddKeyword();
                }
              }}
              color="secondary"
              className="whitespace-nowrap px-3 py-1.5 text-sm"
            >
              Hinzufügen
            </Button>
          </div>
        </div>
      </div>

      {/* Keywords - NEW One-Line Layout */}
      {keywords.length > 0 && (
        <div className="space-y-2 mb-4">
          {keywordMetrics.map((metrics) => (
            <div key={metrics.keyword} className="flex items-center bg-white rounded-md p-3 gap-4">
              {/* Links: Keyword + Basis-Metriken */}
              <div className="flex items-center gap-3 flex-1">
                <div className="text-base font-medium text-gray-900">
                  {metrics.keyword}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="inline-flex items-center gap-1 bg-white border border-gray-300 rounded-md px-2 py-0.5 text-xs">
                    <span className="font-semibold">Dichte:</span>
                    <span>{metrics.density.toFixed(1)}%</span>
                  </div>
                  <div className="inline-flex items-center gap-1 bg-white border border-gray-300 rounded-md px-2 py-0.5 text-xs">
                    <span className="font-semibold">Vorkommen:</span>
                    <span>{metrics.occurrences}x</span>
                  </div>
                  <div className={clsx(
                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs",
                    metrics.distribution === 'gut' ? 'bg-green-50 text-green-700 border border-green-300' :
                    metrics.distribution === 'mittel' ? 'bg-orange-50 text-orange-700 border border-orange-300' : 
                    'bg-red-50 text-red-700 border border-red-300'
                  )}>
                    <span className="font-semibold">Verteilung:</span>
                    <span>{metrics.distribution === 'schlecht' ? 'schlecht' : metrics.distribution}</span>
                  </div>
                </div>
              </div>
              
              {/* Rechts: KI-Analysis-Box + Delete Button */}
              <div className="flex items-center gap-3">
                <KIAnalysisBox metrics={metrics} isLoading={isAnalyzing} />
                <button
                  onClick={() => handleRemoveKeyword(metrics.keyword)}
                  className="bg-white text-gray-400 hover:text-red-500 p-1 rounded"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Score-Aufschlüsselung in 4 Boxen + Keyword-Score-Status */}
      {keywords.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="bg-gray-100 rounded-md p-3 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                scoreBreakdown.headline >= 70 ? 'bg-green-500' :
                scoreBreakdown.headline >= 40 ? 'bg-orange-500' : 'bg-red-500'
              }`}></div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">
                  Headline: {scoreBreakdown.headline}/100
                </div>
              </div>
            </div>
            <div className="bg-gray-100 rounded-md p-3 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                scoreBreakdown.keywords >= 70 ? 'bg-green-500' :
                scoreBreakdown.keywords >= 40 ? 'bg-orange-500' : 'bg-red-500'
              }`}></div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">
                  Keywords: {scoreBreakdown.keywords}/100
                </div>
              </div>
            </div>
            <div className="bg-gray-100 rounded-md p-3 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                scoreBreakdown.structure >= 70 ? 'bg-green-500' :
                scoreBreakdown.structure >= 40 ? 'bg-orange-500' : 'bg-red-500'
              }`}></div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">
                  Struktur: {Math.round(scoreBreakdown.structure)}/100
                </div>
              </div>
            </div>
            <div className="bg-gray-100 rounded-md p-3 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                scoreBreakdown.social >= 70 ? 'bg-green-500' :
                scoreBreakdown.social >= 40 ? 'bg-orange-500' : 'bg-red-500'
              }`}></div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900 inline">
                  Social: {Math.round(scoreBreakdown.social)}/100
                </div>
              </div>
            </div>
          </div>
          
          {/* Keyword-Score-Status Anzeige - AUSGEBLENDET (zu technisch für User) */}
          {false && keywordScoreData && (
            <div className="bg-blue-50 rounded-md p-3 mb-3">
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <CpuChipIcon className="h-4 w-4" />
                <div className="flex items-center gap-4">
                  <span>
                    <strong>Keyword-Score:</strong> {keywordScoreData?.totalScore}/100
                  </span>
                  {keywordScoreData?.hasAIAnalysis ? (
                    <span>
                      <strong>KI-Bonus:</strong> {keywordScoreData?.aiBonus}/40
                    </span>
                  ) : (
                    <span>
                      <strong>Fallback-Bonus:</strong> {keywordScoreData?.aiBonus}/40
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Social-Score Details - AUSGEBLENDET (zu kompliziert für User) */}
          {false && (() => {
            const detectedHashtags = HashtagDetector.detectHashtags(content);
            const hashtagQuality = detectedHashtags.length > 0 ? HashtagDetector.assessHashtagQuality(detectedHashtags, keywords) : null;
            
            if (detectedHashtags.length > 0 || documentTitle.length > 0) {
              return (
                <div className="bg-blue-50 rounded-md p-3 mb-3">
                  <div className="flex items-center gap-2 text-xs text-blue-700">
                    <HashtagIcon className="h-4 w-4" />
                    <div className="flex items-center gap-4">
                      <span>
                        <strong>Headline-Länge:</strong> {documentTitle.length} Zeichen
                        {documentTitle.length <= 280 ? ' ✓' : ' (zu lang für Twitter)'}
                      </span>
                      {detectedHashtags.length > 0 && (
                        <>
                          <span>
                            <strong>Hashtags:</strong> {detectedHashtags.length} gefunden
                          </span>
                          {hashtagQuality && (
                            <span>
                              <strong>Qualität:</strong> {hashtagQuality?.averageScore.toFixed(1)}/100
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {detectedHashtags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {detectedHashtags.slice(0, 5).map((tag, index) => (
                        <span key={index} className="inline-block bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                      {detectedHashtags.length > 5 && (
                        <span className="text-xs text-blue-600">+{detectedHashtags.length - 5} weitere</span>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}

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

      {/* Empfehlungen */}
      {recommendations.length > 0 && keywords.length > 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded-md">
          <div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                Empfehlungen: ({recommendations.length})
              </p>
              <ul className="text-xs text-gray-700 space-y-2">
                {(showAllRecommendations ? recommendations : recommendations.slice(0, 3)).map((rec, index) => (
                  <li key={index} className="flex items-start justify-between gap-2 leading-relaxed">
                    <span className="leading-relaxed">• {rec.replace('[KI] ', '')}</span>
                    {rec.startsWith('[KI]') && (
                      <Badge color="purple" className="text-[9px] px-1 py-0 mt-0.5 flex-shrink-0 leading-none h-3">KI</Badge>
                    )}
                  </li>
                ))}
              </ul>
              {recommendations.length > 3 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAllRecommendations(!showAllRecommendations);
                  }}
                  className="text-xs text-gray-600 hover:text-gray-800 mt-2 flex items-center gap-1 transition-colors"
                >
                  {showAllRecommendations ? (
                    <>
                      weniger anzeigen
                      <ChevronUpIcon className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">{recommendations.length - 3} weitere anzeigen</span>
                      <ChevronDownIcon className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
}