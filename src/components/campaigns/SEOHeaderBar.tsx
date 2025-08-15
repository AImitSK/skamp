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
import type { KeywordResult } from '@/lib/ai/seo-keyword-service';

interface SEOHeaderBarProps {
  title?: string;
  content: string;
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
  className?: string;
}

interface SEOMetrics {
  score: number;
  wordCount: number;
  keywordDensity: number;
}

export function SEOHeaderBar({ 
  title = "PR-Kampagne erstellen",
  content, 
  keywords, 
  onKeywordsChange,
  className = ""
}: SEOHeaderBarProps) {
  const [seoMetrics, setSeoMetrics] = useState<SEOMetrics>({
    score: 0,
    wordCount: 0,
    keywordDensity: 0
  });
  const [autoDetectedKeywords, setAutoDetectedKeywords] = useState<string[]>([]);
  const [showKeywordInput, setShowKeywordInput] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Metrics-Update ohne Auto-Detection
  useEffect(() => {
    console.log('📊 SEO Metrics Update:', { 
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 100) + '...'
    });
    
    if (!content || content.length < 50) {
      setSeoMetrics({ score: 0, wordCount: 0, keywordDensity: 0 });
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
    
    let keywordDensity = 0;
    if (keywords.length > 0) {
      const analytics = seoKeywordService.analyzeKeywords(content, keywords);
      keywordDensity = analytics.reduce((sum, a) => sum + a.density, 0) / analytics.length;
    }

    setSeoMetrics({
      score,
      wordCount,
      keywordDensity
    });
  }, [content, keywords]);

  // Separate useEffect für Score-Updates nach manuellen Keyword-Änderungen
  useEffect(() => {
    if (content && keywords.length > 0) {
      const updatedScore = seoKeywordService.calculateSEOScore(content, keywords);
      const analytics = seoKeywordService.analyzeKeywords(content, keywords);
      const keywordDensity = analytics.reduce((sum, a) => sum + a.density, 0) / analytics.length;
      
      setSeoMetrics(prev => ({
        ...prev,
        score: updatedScore,
        keywordDensity
      }));
    }
  }, [keywords, content]);

  // Manuelle Keyword-Erkennung
  const handleRefreshKeywords = async () => {
    if (!content || content.length < 50) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await seoKeywordService.detectKeywords(content);
      console.log('🎯 Manual keyword detection:', result.keywords);
      
      // Nur als Vorschläge setzen, NICHT automatisch als aktive Keywords
      setAutoDetectedKeywords(result.keywords);
      
      // NICHT automatisch hinzufügen - nur als Vorschläge anzeigen
      // Benutzer muss manuell auf die Vorschläge klicken
    } catch (error) {
      console.error('Keyword detection failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddKeyword = (keyword: string) => {
    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword && !keywords.includes(trimmedKeyword)) {
      onKeywordsChange([...keywords, trimmedKeyword]);
    }
    setNewKeyword('');
    setShowKeywordInput(false);
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    onKeywordsChange(keywords.filter(k => k !== keywordToRemove));
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
            <span className="font-medium">{(seoMetrics.keywordDensity * 100).toFixed(1)}%</span> Keyword-Dichte
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
            title={content && content.length >= 50 ? "Keywords automatisch erkennen" : "Text zu kurz für Keyword-Analyse"}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Keywords Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700 font-medium">Keywords:</span>
          
          {/* Active Keywords */}
          <div className="flex items-center gap-2 flex-wrap">
            {keywords.map((keyword, index) => (
              <Badge
                key={`active-${index}`}
                color="blue"
                className="text-xs px-2 py-1 cursor-pointer hover:bg-blue-200 transition-colors"
              >
                {keyword}
                <XMarkIcon 
                  className="ml-1 h-3 w-3 hover:text-red-600 transition-colors" 
                  onClick={() => handleRemoveKeyword(keyword)}
                />
              </Badge>
            ))}

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
        
        {/* Analysis Status */}
        {isAnalyzing && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs">Analysiere...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SEOHeaderBar;