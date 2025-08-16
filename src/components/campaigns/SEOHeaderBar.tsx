// src/components/campaigns/SEOHeaderBar.tsx
// Vercel-Style SEO Header Integration - Minimal & Clean

"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PlusIcon, 
  XMarkIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { seoKeywordService } from '@/lib/ai/seo-keyword-service';
import type { KeywordResult, PerKeywordMetrics, PRMetrics } from '@/lib/ai/seo-keyword-service';

interface SEOHeaderBarProps {
  title?: string;
  content: string;
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
  className?: string;
  documentTitle?: string; // Titel für Empfehlungen
}

interface SEOMetrics {
  score: number;
  wordCount: number;
  keywordDensity: number;
  readability: number;
  readabilityLevel: string;
}

export function SEOHeaderBar({ 
  title = "PR-Kampagne erstellen",
  content, 
  keywords, 
  onKeywordsChange,
  className = "",
  documentTitle
}: SEOHeaderBarProps) {
  const [seoMetrics, setSeoMetrics] = useState<SEOMetrics>({
    score: 0,
    wordCount: 0,
    keywordDensity: 0,
    readability: 0,
    readabilityLevel: 'Unbekannt'
  });
  const [autoDetectedKeywords, setAutoDetectedKeywords] = useState<string[]>([]);
  const [showKeywordInput, setShowKeywordInput] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [keywordWarning, setKeywordWarning] = useState<string>('');
  const [perKeywordMetrics, setPerKeywordMetrics] = useState<Map<string, PerKeywordMetrics>>(new Map());
  const [prMetrics, setPrMetrics] = useState<PRMetrics | null>(null);
  const [prScore, setPrScore] = useState<{ totalScore: number; breakdown: any } | null>(null);

  // Metrics-Update ohne Auto-Detection
  useEffect(() => {
    console.log('📊 SEO Metrics Update:', { 
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 200) + '...',
      fullContent: content,
      contentType: typeof content,
      contentLines: content?.split('\n').length || 0,
      firstLine: content?.split('\n')[0] || '',
      lastLine: content?.split('\n').slice(-1)[0] || ''
    });
    
    if (!content || content.length < 50) {
      setSeoMetrics({ score: 0, wordCount: 0, keywordDensity: 0, readability: 0, readabilityLevel: 'Unbekannt' });
      return;
    }

    // HTML-Tags für Wortzählung entfernen
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
    
    console.log('📊 Word Count Calculation:', { 
      originalLength: content.length,
      textContent: textContent.substring(0, 100) + '...',
      wordCount 
    });
    
    const score = seoKeywordService.calculateSEOScore(content, keywords);
    const readabilityResult = seoKeywordService.calculateReadability(content);
    
    let keywordDensity = 0;
    if (keywords.length > 0) {
      const analytics = seoKeywordService.analyzeKeywords(content, keywords);
      // Filter unrealistische Werte (>15% deutet auf häufige Wörter hin)
      const validAnalytics = analytics.filter(a => a.density <= 15);
      if (validAnalytics.length > 0) {
        keywordDensity = validAnalytics.reduce((sum, a) => sum + a.density, 0) / validAnalytics.length;
      } else {
        // Falls alle Werte unrealistisch sind, zeige 0
        keywordDensity = 0;
      }
    }

    setSeoMetrics({
      score,
      wordCount,
      keywordDensity,
      readability: readabilityResult.score,
      readabilityLevel: readabilityResult.level
    });

    // Generiere Empfehlungen
    const newRecommendations = seoKeywordService.generateRecommendations(content, keywords, documentTitle);
    setRecommendations(newRecommendations);
  }, [content, keywords, documentTitle]);

  // Separate useEffect für Score-Updates nach manuellen Keyword-Änderungen
  useEffect(() => {
    if (content && keywords.length > 0) {
      const updatedScore = seoKeywordService.calculateSEOScore(content, keywords);
      const readabilityResult = seoKeywordService.calculateReadability(content);
      const analytics = seoKeywordService.analyzeKeywords(content, keywords);
      // Filter unrealistische Werte
      const validAnalytics = analytics.filter(a => a.density <= 15);
      const keywordDensity = validAnalytics.length > 0 
        ? validAnalytics.reduce((sum, a) => sum + a.density, 0) / validAnalytics.length
        : 0;
      
      setSeoMetrics(prev => ({
        ...prev,
        score: updatedScore,
        keywordDensity,
        readability: readabilityResult.score,
        readabilityLevel: readabilityResult.level
      }));
    }
  }, [keywords, content]);

  // SEO-Analyse aktualisieren mit KI für alle Keywords
  const handleRefreshKeywords = async () => {
    if (!content || content.length < 50) {
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('🔄 SEO-Analyse Update mit KI:', { 
        contentLength: content.length,
        keywordsCount: keywords.length,
        keywords: keywords
      });
      
      // PR-Metriken berechnen
      const newPrMetrics = seoKeywordService.calculatePRMetrics(content, documentTitle);
      setPrMetrics(newPrMetrics);
      
      // KI-Analyse für alle Keywords parallel
      const keywordAnalysisPromises = keywords.map(keyword => 
        seoKeywordService.analyzeKeywordWithAI(keyword, content)
      );
      
      const keywordAnalysisResults = await Promise.all(keywordAnalysisPromises);
      
      // Update Pro-Keyword-Metriken
      const newMetricsMap = new Map<string, PerKeywordMetrics>();
      keywordAnalysisResults.forEach(result => {
        newMetricsMap.set(result.keyword, result);
      });
      setPerKeywordMetrics(newMetricsMap);
      
      // Neuen PR-Score berechnen
      const scoreResult = seoKeywordService.calculatePRScore(
        content, 
        keywordAnalysisResults, 
        newPrMetrics
      );
      setPrScore(scoreResult);
      
      // Basis-Metriken auch aktualisieren (für Rückwärtskompatibilität)
      const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
      const readabilityResult = seoKeywordService.calculateReadability(content);
      
      let keywordDensity = 0;
      if (keywords.length > 0) {
        const avgDensity = keywordAnalysisResults.reduce((sum, m) => sum + m.density, 0) / keywordAnalysisResults.length;
        keywordDensity = avgDensity;
      }

      setSeoMetrics({
        score: scoreResult.totalScore,
        wordCount,
        keywordDensity,
        readability: readabilityResult.score,
        readabilityLevel: readabilityResult.level
      });

      // Empfehlungen aus PR-Score verwenden
      setRecommendations(scoreResult.recommendations);
      
      console.log('✅ SEO-Analyse mit KI aktualisiert:', { 
        prScore: scoreResult.totalScore, 
        wordCount, 
        keywordMetrics: keywordAnalysisResults,
        recommendations: scoreResult.recommendations.length 
      });
      
    } catch (error) {
      console.error('SEO analysis update failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddKeyword = async (keyword: string) => {
    const trimmedKeyword = keyword.trim();
    
    // Keyword-Limit prüfen (max. 2)
    if (keywords.length >= 2) {
      setKeywordWarning('Maximal 2 Keywords für optimale PR-Qualität. Entferne erst ein Keyword.');
      setTimeout(() => setKeywordWarning(''), 5000);
      return;
    }
    
    if (trimmedKeyword && !keywords.includes(trimmedKeyword)) {
      onKeywordsChange([...keywords, trimmedKeyword]);
      
      // KI-Analyse für neues Keyword starten
      if (content && content.length >= 50) {
        setIsAnalyzing(true);
        try {
          const analysis = await seoKeywordService.analyzeKeywordWithAI(trimmedKeyword, content);
          setPerKeywordMetrics(prev => new Map(prev).set(trimmedKeyword, analysis));
        } catch (error) {
          console.error('KI-Analyse fehlgeschlagen:', error);
        } finally {
          setIsAnalyzing(false);
        }
      }
    }
    setNewKeyword('');
    setShowKeywordInput(false);
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    onKeywordsChange(keywords.filter(k => k !== keywordToRemove));
    // Auch die Metriken für dieses Keyword entfernen
    setPerKeywordMetrics(prev => {
      const newMap = new Map(prev);
      newMap.delete(keywordToRemove);
      return newMap;
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword(newKeyword);
    } else if (e.key === 'Escape') {
      setNewKeyword('');
      setShowKeywordInput(false);
    }
  };

  const handleAutoDetectedKeywordClick = (keyword: string) => {
    if (!keywords.includes(keyword)) {
      onKeywordsChange([...keywords, keyword]);
    }
  };

  const getSEOScoreColor = (score: number): string => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSEOScoreBadgeColor = (score: number): 'green' | 'yellow' | 'red' => {
    if (score >= 70) return 'green';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  return (
    <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🔍 {title}
        </h3>
        
        {/* SEO Metrics */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{seoMetrics.wordCount}</span> Wörter
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{seoMetrics.keywordDensity.toFixed(1)}%</span> Keyword-Dichte
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{seoMetrics.readability}</span> Lesbarkeit
            <span className="ml-1 text-xs">({seoMetrics.readabilityLevel})</span>
          </div>
          <Badge color={getSEOScoreBadgeColor(seoMetrics.score)} className="text-xs">
            SEO-Score: {Math.round(seoMetrics.score)}
          </Badge>
          
          {/* Refresh Keywords Button */}
          <button
            type="button"
            onClick={handleRefreshKeywords}
            disabled={isAnalyzing || !content || content.length < 50}
            className={`
              p-2 rounded-md transition-colors
              ${isAnalyzing 
                ? 'text-blue-500 animate-spin' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title={content && content.length >= 50 ? "SEO-Analyse aktualisieren" : "Text zu kurz für SEO-Analyse"}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Keywords Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700 font-medium">Keywords:</span>
          
          {/* Active Keywords mit Pro-Keyword-Scores */}
          <div className="flex items-center gap-2 flex-wrap">
            {keywords.map((keyword, index) => {
              const metrics = perKeywordMetrics.get(keyword);
              const hasKIData = metrics?.semanticRelevance !== undefined;
              const scoreColor = hasKIData 
                ? (metrics.semanticRelevance! >= 70 ? 'green' : 
                   metrics.semanticRelevance! >= 40 ? 'yellow' : 'red')
                : 'blue';
              
              return (
                <div key={`active-${index}`} className="relative group">
                  <Badge
                    color={scoreColor as any}
                    className="text-xs px-2 py-1 cursor-pointer hover:bg-opacity-80 transition-all"
                  >
                    <span>{keyword}</span>
                    {hasKIData && (
                      <span className="ml-2 font-bold">
                        {metrics.semanticRelevance}%
                      </span>
                    )}
                    <XMarkIcon 
                      className="ml-1 h-3 w-3 hover:text-red-600 transition-colors" 
                      onClick={() => handleRemoveKeyword(keyword)}
                    />
                  </Badge>
                  
                  {/* Hover-Tooltip mit Details */}
                  {metrics && (
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 
                                    bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
                      <div className="text-xs space-y-1">
                        <div className="font-semibold mb-2">{keyword}</div>
                        <div>Dichte: {metrics.density.toFixed(1)}%</div>
                        <div>Vorkommen: {metrics.occurrences}x</div>
                        <div>In Headline: {metrics.inHeadline ? '✅' : '❌'}</div>
                        <div>Im Lead: {metrics.inFirstParagraph ? '✅' : '❌'}</div>
                        <div>Verteilung: {metrics.distribution}</div>
                        {hasKIData && (
                          <>
                            <div className="border-t pt-1 mt-1">
                              <div>Relevanz: {metrics.semanticRelevance}%</div>
                              <div>Qualität: {metrics.contextQuality}%</div>
                              <div>Stärke: {metrics.keywordStrength}</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Auto-Detected Keywords (als Vorschläge) */}
            {autoDetectedKeywords
              .filter(keyword => !keywords.includes(keyword))
              .slice(0, 3)
              .map((keyword, index) => (
                <Badge
                  key={`suggested-${index}`}
                  color="gray"
                  className="text-xs px-2 py-1 cursor-pointer hover:bg-gray-200 transition-colors border-dashed"
                  onClick={() => handleAutoDetectedKeywordClick(keyword)}
                >
                  + {keyword}
                </Badge>
              ))
            }

            {/* Keyword Input */}
            {showKeywordInput ? (
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={() => {
                  if (!newKeyword.trim()) {
                    setShowKeywordInput(false);
                  }
                }}
                placeholder="Keyword eingeben..."
                className="text-xs border border-gray-300 rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            ) : (
              <Button
                plain
                onClick={() => setShowKeywordInput(true)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                hinzufügen
              </Button>
            )}
          </div>
        </div>
        
        {/* Keyword Warning */}
        {keywordWarning && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">⚠️ {keywordWarning}</p>
          </div>
        )}
        
        {/* Analysis Status */}
        {isAnalyzing && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs">Analysiere mit KI...</span>
          </div>
        )}

        {/* SEO-Empfehlungen */}
        {recommendations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              💡 Verbesserungsvorschläge
            </h4>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li 
                  key={index}
                  className="text-sm text-gray-600 flex items-start gap-2 p-2 bg-blue-50 rounded-md"
                >
                  <span className="text-blue-600">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default SEOHeaderBar;