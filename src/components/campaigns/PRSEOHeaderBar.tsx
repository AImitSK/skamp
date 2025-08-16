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
  InformationCircleIcon
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
      distribution = spread > 0.6 ? 'gut' : spread > 0.3 ? 'mittel' : 'schlecht';
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
    const paragraphs = cleanText.split('\n').filter(p => p.trim().length > 0);
    
    // Zitate zählen (markup-basiert)
    const quoteCount = (text.match(/<blockquote[^>]*data-type="pr-quote"[^>]*>/g) || []).length;
    
    // CTA zählen (markup-basiert)  
    const ctaCount = (text.match(/<span[^>]*data-type="cta-text"[^>]*>/g) || []).length;
    
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
      hasCompanyNames: /\b[A-Z][a-z]+ (GmbH|AG|Inc|Corp|Ltd)\b/.test(cleanText)
    };
  }, [keywords]);

  // PR-Score berechnen
  const calculatePRScore = useCallback((prMetrics: PRMetrics, keywordMetrics: KeywordMetrics[]): { totalScore: number, breakdown: PRScoreBreakdown, recommendations: string[] } => {
    const recommendations: string[] = [];
    
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
    if (keywordMetrics.length > 0) {
      const avgDensity = keywordMetrics.reduce((sum, km) => sum + km.density, 0) / keywordMetrics.length;
      const avgRelevance = keywordMetrics.reduce((sum, km) => sum + (km.semanticRelevance || 50), 0) / keywordMetrics.length;
      
      if (avgDensity >= 0.5 && avgDensity <= 2.0) keywordScore += 50;
      else recommendations.push(`Keyword-Dichte optimieren (aktuell: ${avgDensity.toFixed(1)}%)`);
      
      keywordScore += Math.min(50, avgRelevance / 2);
    } else {
      recommendations.push('Keywords hinzufügen für bessere SEO-Bewertung');
    }

    // 20% Struktur & Lesbarkeit
    let structureScore = 0;
    if (prMetrics.avgParagraphLength >= 100 && prMetrics.avgParagraphLength <= 200) structureScore += 30;
    if (prMetrics.hasBulletPoints) structureScore += 20;
    if (prMetrics.hasSubheadings) structureScore += 25;
    if (prMetrics.leadLength >= 120 && prMetrics.leadLength <= 200) structureScore += 25;
    else recommendations.push('Lead-Absatz sollte 120-200 Zeichen haben');

    // 15% Semantische Relevanz (KI)
    const relevanceScore = keywordMetrics.length > 0 ? 
      keywordMetrics.reduce((sum, km) => sum + (km.contextQuality || 50), 0) / keywordMetrics.length : 0;

    // 10% Konkretheit
    let concretenessScore = 0;
    if (prMetrics.numberCount >= 3) concretenessScore += 40;
    if (prMetrics.hasSpecificDates) concretenessScore += 30;
    if (prMetrics.hasCompanyNames) concretenessScore += 30;
    else recommendations.push('Konkrete Zahlen, Daten und Firmennamen verwenden');

    // 10% Zitate & CTA
    let engagementScore = 0;
    if (prMetrics.quoteCount >= 1) engagementScore += 50;
    else recommendations.push('Mindestens ein Zitat hinzufügen');
    
    if (prMetrics.hasActionVerbs) engagementScore += 25;
    if (prMetrics.hasLearnMore) engagementScore += 25;

    const breakdown: PRScoreBreakdown = {
      headline: headlineScore,
      keywords: keywordScore,
      structure: structureScore,
      relevance: relevanceScore,
      concreteness: concretenessScore,
      engagement: engagementScore
    };

    const totalScore = Math.round(
      (breakdown.headline * 0.25) +
      (breakdown.keywords * 0.20) +
      (breakdown.structure * 0.20) +
      (breakdown.relevance * 0.15) +
      (breakdown.concreteness * 0.10) +
      (breakdown.engagement * 0.10)
    );

    return { totalScore, breakdown, recommendations };
  }, []);

  // KI-Analyse für einzelnes Keyword
  const analyzeKeywordWithAI = useCallback(async (keyword: string, text: string): Promise<Partial<KeywordMetrics>> => {
    try {
      setIsAnalyzing(true);
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analysiere das Keyword "${keyword}" im folgenden PR-Text:

${text}

Bewerte auf einer Skala von 0-100:
1. Semantische Relevanz: Wie gut passt das Keyword zum Inhalt?
2. Kontext-Qualität: Wie natürlich ist das Keyword im Text eingebunden?
3. Verwandte Begriffe: Nenne 3 verwandte Begriffe, die im Text vorkommen

Antworte im JSON-Format:
{
  "semanticRelevance": 85,
  "contextQuality": 78,
  "relatedTerms": ["Begriff1", "Begriff2", "Begriff3"]
}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📡 Raw KI-Response:', data);
        
        if (!data || !data.content) {
          console.warn('⚠️ KI-Response ist leer oder fehlerhaft:', data);
          return {
            semanticRelevance: 50,
            contextQuality: 50,
            relatedTerms: []
          };
        }
        
        try {
          // Versuche JSON zu parsen
          const jsonMatch = data.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            console.log(`✅ KI-Analyse für "${keyword}":`, result);
            return {
              semanticRelevance: Math.min(100, Math.max(0, result.semanticRelevance || 50)),
              contextQuality: Math.min(100, Math.max(0, result.contextQuality || 50)),
              relatedTerms: Array.isArray(result.relatedTerms) ? result.relatedTerms.slice(0, 3) : []
            };
          } else {
            console.warn('⚠️ Kein JSON in KI-Response gefunden:', data.content);
          }
        } catch (parseError) {
          console.warn('⚠️ KI-Response JSON-Parse Fehler:', parseError, 'Content:', data.content);
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
        relatedTerms: existing?.relatedTerms
      };
    });

    setKeywordMetrics(updatedMetrics);
  }, [content, keywords, calculateBasicMetrics]);

  // PR-Score berechnen
  useEffect(() => {
    const prMetrics = calculatePRMetrics(content, documentTitle);
    const { totalScore, breakdown, recommendations: newRecommendations } = calculatePRScore(prMetrics, keywordMetrics);
    
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

  const getScoreBadgeColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-800';
    if (score >= 40) return 'bg-orange-100 text-orange-800'; 
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className={clsx('bg-[#f1f0e2] rounded-lg p-4 border border-gray-200', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <Badge className={getScoreBadgeColor(prScore)}>
            PR-Score: {prScore}/100
          </Badge>
        </div>
        
        {keywords.length > 0 && (
          <Button
            type="button"
            onClick={handleRefreshAnalysis}
            disabled={isAnalyzing}
            size="sm"
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
          >
            <SparklesIcon className="h-4 w-4" />
            {isAnalyzing ? 'Analysiert...' : 'KI-Analyse aktualisieren'}
          </Button>
        )}
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
            size="sm"
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            Hinzufügen
          </Button>
        </div>
        
        {keywords.length >= 2 && (
          <p className="text-xs text-gray-600 mt-1">
            Maximum 2 Keywords für fokussierte PR-Texte erreicht.
          </p>
        )}
      </div>

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="space-y-2 mb-4">
          {keywordMetrics.map((metrics) => (
            <div key={metrics.keyword} className="flex items-center justify-between bg-white rounded-md p-3">
              <div className="flex items-center gap-3">
                <Badge className={getScoreBadgeColor(metrics.semanticRelevance || 50)}>
                  {metrics.keyword}
                </Badge>
                
                <div className="flex gap-4 text-sm text-gray-600">
                  <span title="Dichte">
                    {metrics.density.toFixed(1)}%
                  </span>
                  <span title="Vorkommen">
                    {metrics.occurrences}x
                  </span>
                  {metrics.semanticRelevance && (
                    <span title="KI-Relevanz" className="text-blue-600">
                      {metrics.semanticRelevance}%
                    </span>
                  )}
                  <span title="Verteilung" className={clsx(
                    metrics.distribution === 'gut' ? 'text-green-600' :
                    metrics.distribution === 'mittel' ? 'text-orange-600' : 'text-red-600'
                  )}>
                    {metrics.distribution}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => handleRemoveKeyword(metrics.keyword)}
                className="text-gray-400 hover:text-red-500"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Score-Aufschlüsselung */}
      {keywords.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className={clsx('font-semibold', getScoreColor(scoreBreakdown.headline) === 'green' ? 'text-green-600' : getScoreColor(scoreBreakdown.headline) === 'orange' ? 'text-orange-600' : 'text-red-600')}>
              {scoreBreakdown.headline}/100
            </div>
            <div className="text-gray-600">Headline</div>
          </div>
          <div className="text-center">
            <div className={clsx('font-semibold', getScoreColor(scoreBreakdown.keywords) === 'green' ? 'text-green-600' : getScoreColor(scoreBreakdown.keywords) === 'orange' ? 'text-orange-600' : 'text-red-600')}>
              {scoreBreakdown.keywords}/100
            </div>
            <div className="text-gray-600">Keywords</div>
          </div>
          <div className="text-center">
            <div className={clsx('font-semibold', getScoreColor(scoreBreakdown.structure) === 'green' ? 'text-green-600' : getScoreColor(scoreBreakdown.structure) === 'orange' ? 'text-orange-600' : 'text-red-600')}>
              {scoreBreakdown.structure}/100
            </div>
            <div className="text-gray-600">Struktur</div>
          </div>
        </div>
      )}

      {/* Empfehlungen */}
      {recommendations.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-start gap-2">
            <InformationCircleIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">Empfehlungen:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}