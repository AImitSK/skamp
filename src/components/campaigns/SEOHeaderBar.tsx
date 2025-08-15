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
  DocumentTextIcon
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

  // Auto-Keyword-Detection mit Debouncing
  useEffect(() => {
    console.log('🔍 SEO HeaderBar: Content check:', { 
      contentLength: content?.length || 0, 
      content: content?.substring(0, 100) + '...' 
    });
    
    if (!content || content.length < 50) {
      setSeoMetrics({ score: 0, wordCount: 0, keywordDensity: 0 });
      setAutoDetectedKeywords([]);
      return;
    }

    // Update metrics immediately for wordCount
    const wordCount = content.split(/\s+/).length;
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

    setIsAnalyzing(true);

    const sessionId = 'seo-header-detection';
    seoKeywordService.detectKeywordsDebounced(
      content,
      sessionId,
      (result: KeywordResult) => {
        setAutoDetectedKeywords(result.keywords);
        setIsAnalyzing(false);
        
        // Update score with auto-detected keywords if no manual keywords
        if (keywords.length === 0) {
          const updatedScore = seoKeywordService.calculateSEOScore(content, result.keywords);
          setSeoMetrics(prev => ({
            ...prev,
            score: updatedScore
          }));
        }
      },
      { debounceMs: 2000 }
    );

    return () => {
      seoKeywordService.clearDebounceTimers();
    };
  }, [content, keywords]);

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