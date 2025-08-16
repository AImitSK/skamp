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
  ChevronUpIcon
} from '@heroicons/react/24/outline';
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
}

interface PRSEOHeaderBarProps {
  title?: string;
  content: string;
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
  documentTitle?: string;
  className?: string;
}

// KI-Analysis-Box Komponente
interface KIAnalysisBoxProps {
  metrics: KeywordMetrics;
  isLoading: boolean;
}

function KIAnalysisBox({ metrics, isLoading }: KIAnalysisBoxProps) {
  // Badge mit Farbverlauf-Rand Design  
  const wrapperClasses = "relative inline-flex p-[1px] rounded-md bg-gradient-to-r from-indigo-500 to-purple-600";
  const innerClasses = "inline-flex items-center gap-2 px-3 py-1 rounded-[5px] text-xs bg-purple-50 text-purple-700";
  
  if (isLoading) {
    return (
      <div className={wrapperClasses}>
        <div className={innerClasses}>
          <div className="w-3 h-3 border border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <span>KI analysiert...</span>
        </div>
      </div>
    );
  }
  
  if (!metrics.semanticRelevance && !metrics.targetAudience && !metrics.tonality) {
    return (
      <div className={wrapperClasses}>
        <div className={innerClasses}>
          <SparklesIcon className="h-3 w-3" />
          <span>Bereit für Analyse</span>
        </div>
      </div>
    );
  }
  
  // Trend-Indikator für Relevanz (später implementierbar)
  const relevanceTrend = ""; // Später: "↑" oder "↓" basierend auf vorherigem Wert
  
  return (
    <div className={wrapperClasses}>
      <div className={innerClasses}>
        <SparklesIcon className="h-3 w-3" />
        <span className="font-semibold">Relevanz:</span>
        <span>{metrics.semanticRelevance || 0}%{relevanceTrend}</span>
      </div>
    </div>
  );
}

export function PRSEOHeaderBar({
  title = "PR-SEO Analyse",
  content,
  keywords,
  onKeywordsChange,
  documentTitle = '',
  className
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
    engagement: 0
  });
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
    
    
    return {
      headlineLength: title.length,
      headlineHasKeywords: keywords.some(kw => title.toLowerCase().includes(kw.toLowerCase())),
      headlineHasActiveVerb: /\b(startet|lanciert|präsentiert|entwickelt|erreicht|steigert|verbessert)\b/i.test(title),
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
  }, [keywords]);

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

  // PR-Score berechnen
  const calculatePRScore = useCallback((prMetrics: PRMetrics, keywordMetrics: KeywordMetrics[], text: string): { totalScore: number, breakdown: PRScoreBreakdown, recommendations: string[] } => {
    const recommendations: string[] = [];
    
    // Ermittle dominante Zielgruppe aus Keywords
    const targetAudiences = keywordMetrics
      .map(km => km.targetAudience)
      .filter((ta): ta is string => ta !== undefined && ta !== 'Unbekannt');
    const dominantAudience = targetAudiences.length > 0 ? targetAudiences[0] : 'Standard';
    
    // Nutze zielgruppenspezifische Schwellenwerte
    const thresholds = getThresholds(dominantAudience);
    
    // 25% Headline & Lead-Qualität
    let headlineScore = 0;
    if (prMetrics.headlineLength >= 30 && prMetrics.headlineLength <= 80) headlineScore += 40;
    else recommendations.push(`Headline sollte 30-80 Zeichen haben (aktuell: ${prMetrics.headlineLength})`);
    
    if (prMetrics.headlineHasKeywords) headlineScore += 30;
    else recommendations.push('Keywords in Headline verwenden');
    
    if (prMetrics.headlineHasActiveVerb) headlineScore += 30;
    else recommendations.push('Aktive Verben in Headline nutzen');

    // 20% Keyword-Performance
    let keywordScore = 0;
    if (keywordMetrics.length > 0 && keywords.length > 0) {
      const avgDensity = keywordMetrics.reduce((sum, km) => sum + km.density, 0) / keywordMetrics.length;
      const avgRelevance = keywordMetrics.reduce((sum, km) => sum + (km.semanticRelevance || 0), 0) / keywordMetrics.length;
      
      // Density-basierte Bewertung (50% des Keyword-Scores)
      if (avgDensity >= 0.5 && avgDensity <= 2.0) {
        keywordScore += 50;
      } else if (avgDensity >= 0.3 && avgDensity <= 3.0) {
        keywordScore += 30;
      } else if (avgDensity < 0.5) {
        keywordScore += 10;
        recommendations.push(`Keywords öfter verwenden (Dichte: ${avgDensity.toFixed(1)}% - optimal: 0.5-2.0%)`);
      } else {
        keywordScore += 10;
        recommendations.push(`Keyword-Häufigkeit reduzieren (Dichte: ${avgDensity.toFixed(1)}% - optimal: 0.5-2.0%)`);
      }
      
      // Relevanz-basierte Bewertung (50% des Keyword-Scores) - nur wenn KI-Analyse vorhanden
      if (avgRelevance > 0) {
        keywordScore += Math.min(50, (avgRelevance / 100) * 50);
      }
      
      // Spezifische Empfehlungen pro Keyword
      keywordMetrics.forEach(km => {
        if (km.density < 0.5) {
          recommendations.push(`"${km.keyword}" öfter verwenden (nur ${km.occurrences}x erwähnt)`);
        } else if (km.density > 2.5) {
          recommendations.push(`"${km.keyword}" weniger verwenden (${km.occurrences}x = ${km.density.toFixed(1)}%)`);
        }
        
        if (!km.inHeadline && !km.inFirstParagraph) {
          recommendations.push(`"${km.keyword}" in Headline oder ersten Absatz einbauen`);
        }
        
        if (km.distribution === 'schlecht' && km.occurrences < 3) {
          recommendations.push(`"${km.keyword}" mindestens 3x verwenden für bessere Verteilung`);
        } else if (km.distribution === 'schlecht' && km.occurrences >= 3) {
          recommendations.push(`"${km.keyword}" gleichmäßiger im Text verteilen`);
        }
        
        // KI-basierte Empfehlungen aus Keywords generieren
        if (km.semanticRelevance && km.semanticRelevance < 70) {
          recommendations.push(`[KI] "${km.keyword}" Relevanz erhöhen durch mehr thematische Verbindungen`);
        }
        
        if (km.tonality && km.targetAudience) {
          if (km.targetAudience === 'B2B' && km.tonality === 'Emotional') {
            recommendations.push(`[KI] "${km.keyword}" Tonalität für B2B-Zielgruppe zu emotional - sachlicher formulieren`);
          }
          if (km.targetAudience === 'B2C' && km.tonality === 'Sachlich') {
            recommendations.push(`[KI] "${km.keyword}" Tonalität für B2C-Zielgruppe zu sachlich - emotionaler gestalten`);
          }
          if (km.targetAudience === 'Verbraucher' && (km.tonality === 'Professionell' || km.tonality === 'Fachlich')) {
            recommendations.push(`[KI] "${km.keyword}" Tonalität für Verbraucher-Zielgruppe zu komplex - verständlicher formulieren`);
          }
        }
      });
    } else {
      recommendations.push('Keywords hinzufügen für bessere SEO-Bewertung');
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

    // 10% Zitate & CTA
    let engagementScore = 0;
    
    // CTA zählen aus Markup (markup-basiert)
    const ctaMatches = text.match(/<span[^>]*data-type="cta-text"[^>]*>/g) || [];
    const ctaCount = ctaMatches.length;
    
    if (prMetrics.quoteCount >= 1) {
      engagementScore += 40;
    } else {
      recommendations.push('Mindestens ein Zitat hinzufügen (Strg+Shift+Q)');
    }
    
    if (ctaCount >= 1) {
      engagementScore += 35;
    } else {
      recommendations.push('Call-to-Action Texte hinzufügen (Strg+Shift+C)');
    }
    
    if (prMetrics.hasActionVerbs) {
      engagementScore += 25;
    }
    

    const breakdown: PRScoreBreakdown = {
      headline: headlineScore,
      keywords: keywordScore,
      structure: structureScore,
      relevance: relevanceScore,
      concreteness: concretenessScore,
      engagement: engagementScore
    };

    // Ohne Keywords kein Score
    const totalScore = keywords.length === 0 ? 0 : Math.round(
      (breakdown.headline * 0.25) +
      (breakdown.keywords * 0.20) +
      (breakdown.structure * 0.20) +
      (breakdown.relevance * 0.15) +
      (breakdown.concreteness * 0.10) +
      (breakdown.engagement * 0.10)
    );

    return { totalScore, breakdown, recommendations };
  }, [keywords, getThresholds]);

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
        console.log('📡 Raw KI-Response:', data);
        
        // Check both possible response formats
        const responseText = data.generatedText || data.content;
        
        if (!data || !responseText) {
          console.warn('⚠️ KI-Response ist leer oder fehlerhaft:', data);
          return {
            semanticRelevance: 50,
            contextQuality: 50,
            relatedTerms: []
          };
        }
        
        try {
          // Versuche direktes JSON-Parse
          const result = JSON.parse(responseText);
          console.log(`✅ KI-Analyse für "${keyword}":`, result);
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
              console.log(`✅ KI-Analyse für "${keyword}" (extracted):`, result);
              return {
                semanticRelevance: Math.min(100, Math.max(0, result.semanticRelevance || 50)),
                contextQuality: Math.min(100, Math.max(0, result.contextQuality || 50)),
                targetAudience: result.targetAudience || 'Unbekannt',
                tonality: result.tonality || 'Neutral',
                relatedTerms: Array.isArray(result.relatedTerms) ? result.relatedTerms.slice(0, 3) : []
              };
            } else {
              console.warn('⚠️ Kein JSON in KI-Response gefunden:', responseText.substring(0, 200) + '...');
            }
          } catch (secondParseError) {
            console.warn('⚠️ KI-Response JSON-Parse Fehler:', secondParseError, 'Content:', responseText.substring(0, 200) + '...');
          }
        }
      } else {
        console.error('❌ KI-API HTTP Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ KI-Analyse Fehler:', error);
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

  // Keyword entfernen
  const handleRemoveKeyword = useCallback((keywordToRemove: string) => {
    const updatedKeywords = keywords.filter(k => k !== keywordToRemove);
    onKeywordsChange(updatedKeywords);
    setKeywordMetrics(prev => prev.filter(km => km.keyword !== keywordToRemove));
  }, [keywords, onKeywordsChange]);

  // Metriken aktualisieren bei Content-Änderung
  useEffect(() => {
    if (keywords.length === 0) return;

    // Basis-Metriken für alle Keywords neu berechnen
    const updatedMetrics = keywords.map(keyword => {
      const existing = keywordMetrics.find(km => km.keyword === keyword);
      const basicMetrics = calculateBasicMetrics(keyword, content);
      
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
  }, [content, keywords, calculateBasicMetrics]);

  // PR-Score berechnen
  useEffect(() => {
    const prMetrics = calculatePRMetrics(content, documentTitle);
    const { totalScore, breakdown, recommendations: newRecommendations } = calculatePRScore(prMetrics, keywordMetrics, content);
    
    setPrScore(totalScore);
    setScoreBreakdown(breakdown);
    setRecommendations(newRecommendations);
  }, [content, documentTitle, keywordMetrics, calculatePRMetrics, calculatePRScore]);

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
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        
        <Badge color={getScoreBadgeColor(prScore)} className="text-base font-semibold px-4 py-2">
          PR-Score: {prScore}/100
        </Badge>
      </div>

      {/* Keyword-Eingabe */}
      <div className="mb-4">
        <div className="flex gap-2">
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
            onClick={handleAddKeyword}
            disabled={!newKeyword.trim() || keywords.includes(newKeyword.trim()) || keywords.length >= 2}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap px-3 py-1.5 text-sm"
          >
            Hinzufügen
          </Button>
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
                    <span>{metrics.distribution}</span>
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
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Score-Aufschlüsselung in 3 Boxen */}
      {keywords.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Badge color={getScoreBadgeColor(scoreBreakdown.headline)} className="py-3 flex flex-col items-center">
              <div className="font-bold text-xl">
                {scoreBreakdown.headline}/100
              </div>
              <div className="text-xs mt-1">Headline</div>
            </Badge>
            <Badge color={getScoreBadgeColor(scoreBreakdown.keywords)} className="py-3 flex flex-col items-center">
              <div className="font-bold text-xl">
                {scoreBreakdown.keywords}/100
              </div>
              <div className="text-xs mt-1">Keywords</div>
            </Badge>
            <Badge color={getScoreBadgeColor(scoreBreakdown.structure)} className="py-3 flex flex-col items-center">
              <div className="font-bold text-xl">
                {scoreBreakdown.structure}/100
              </div>
              <div className="text-xs mt-1">Struktur</div>
            </Badge>
          </div>
          
          {/* Globale KI-Analyse für gesamten Text */}
          {keywordMetrics.length > 0 && keywordMetrics.some(km => km.targetAudience || km.tonality) && (
            <div className="relative p-[1px] rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 mb-4">
              <div className="bg-purple-50 rounded-[5px] p-3">
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
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empfehlungen */}
      {recommendations.length > 0 && keywords.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-start gap-2">
            <InformationCircleIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">Empfehlungen:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                {(showAllRecommendations ? recommendations : recommendations.slice(0, 3)).map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    {rec.startsWith('[KI]') ? (
                      <>
                        <Badge color="purple" className="text-xs mt-0.5 flex-shrink-0">KI</Badge>
                        <span>• {rec.replace('[KI] ', '')}</span>
                      </>
                    ) : (
                      <span>• {rec}</span>
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
                  className="text-xs text-blue-600 hover:text-blue-800 mt-2 flex items-center gap-1 transition-colors"
                >
                  {showAllRecommendations ? (
                    <>
                      weniger anzeigen
                      <ChevronUpIcon className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      {recommendations.length - 3} weitere anzeigen
                      <ChevronDownIcon className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* KI-Button rechtsbündig unter Empfehlungen */}
      {keywords.length > 0 && (
        <div className="flex justify-end mt-4">
          <Button
            type="button"
            onClick={handleRefreshAnalysis}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white whitespace-nowrap px-3 py-1.5 text-sm"
          >
            <SparklesIcon className="h-4 w-4" />
            {isAnalyzing ? 'Analysiert...' : 'KI-Analyse aktualisieren'}
          </Button>
        </div>
      )}
    </div>
  );
}