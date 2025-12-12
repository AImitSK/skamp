// src/components/inbox/AIInsightsPanel.tsx
"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { EmailMessage, EmailThread } from '@/types/inbox-enhanced';
import { firebaseAIService } from '@/lib/ai/firebase-ai-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import clsx from 'clsx';
import {
  SparklesIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  ExclamationTriangleIcon,
  TagIcon,
  ClockIcon,
  LightBulbIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface AIInsightsPanelProps {
  email: EmailMessage;
  thread: EmailThread;
  context?: {
    threadHistory?: string[];
    customerInfo?: string;
    campaignContext?: string;
  };
  onPriorityChange?: (priority: 'low' | 'normal' | 'high' | 'urgent') => void;
  collapsed?: boolean;
}

export function AIInsightsPanel({
  email,
  thread,
  context,
  onPriorityChange,
  collapsed = false
}: AIInsightsPanelProps) {
  const t = useTranslations('inbox.aiInsights');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [autoAnalyzeEnabled, setAutoAnalyzeEnabled] = useState(true);

  // Auto-analyze when email changes
  useEffect(() => {
    if (email && autoAnalyzeEnabled && !analysis) {
      performAnalysis();
    }
  }, [email, autoAnalyzeEnabled]);

  const performAnalysis = async () => {
    if (!email.textContent && !email.htmlContent) return;

    setLoading(true);
    setError(null);

    try {
      // Bereinige und kürze Content für AI-Analyse
      let content = email.textContent || email.htmlContent || '';

      // Entferne HTML-Tags, eingebettete Bilder und CSS wenn HTML-Content
      if (!email.textContent && email.htmlContent) {
        content = email.htmlContent
          .replace(/<img[^>]*>/gi, `[${t('imageMarker')}]`) // Ersetze Bilder
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Entferne CSS
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Entferne Scripts
          .replace(/<[^>]+>/g, ' ') // Entferne alle HTML-Tags
          .replace(/\s+/g, ' ') // Normalisiere Whitespace
          .trim();
      }

      // Kürze auf maximal 18000 Zeichen (Puffer für Context)
      if (content.length > 18000) {
        content = content.substring(0, 18000) + `... [${t('truncatedMarker')}]`;
      }

      const result = await firebaseAIService.fullEmailAnalysis(
        content,
        thread.subject,
        email.from.email,
        context
      );

      // Null-Check für result
      if (!result) {
        throw new Error(t('errors.noResults'));
      }

      setAnalysis(result);

      // Auto-apply insights if confidence is high
      if (result.priority?.confidence > 0.8 && onPriorityChange) {
        onPriorityChange(result.priority.priority);
      }

    } catch (err: any) {
      setError(err.message || t('errors.analysisFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return FaceSmileIcon;
      case 'negative': return FaceFrownIcon;
      case 'urgent': return ExclamationTriangleIcon;
      default: return FaceSmileIcon;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      case 'urgent': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isCollapsed) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">{t('title')}</span>
            {analysis?.sentiment && analysis?.priority && (
              <div className="flex items-center gap-1">
                <Badge color="green" className="text-xs">
                  {Math.round(analysis.sentiment.confidence * 100)}%
                </Badge>
                <Badge className={clsx("text-xs", getPriorityColor(analysis.priority.priority))}>
                  {t(`priority.${analysis.priority.priority}`)}
                </Badge>
              </div>
            )}
          </div>
          <Button
            plain
            onClick={() => setIsCollapsed(false)}
            className="p-1"
            title={t('actions.show')}
          >
            <EyeIcon className="h-4 w-4 text-purple-600" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-200">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-purple-600" />
          <h3 className="text-sm font-medium text-purple-700">{t('title')}</h3>
          {loading && (
            <ArrowPathIcon className="h-4 w-4 animate-spin text-purple-600" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            plain
            onClick={() => setAutoAnalyzeEnabled(!autoAnalyzeEnabled)}
            className={clsx(
              "text-xs px-2 py-1",
              autoAnalyzeEnabled ? "text-purple-700 bg-purple-100" : "text-gray-500"
            )}
            title={t('actions.toggleAuto')}
          >
            {t('actions.auto')}
          </Button>
          <Button
            plain
            onClick={performAnalysis}
            disabled={loading}
            className="p-1"
            title={t('actions.reanalyze')}
          >
            <ArrowPathIcon className={clsx("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button
            plain
            onClick={() => setIsCollapsed(true)}
            className="p-1"
            title={t('actions.collapse')}
          >
            <EyeSlashIcon className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={performAnalysis}
              className="mt-2 text-xs bg-red-100 text-red-700 hover:bg-red-200"
              plain
            >
              {t('actions.retry')}
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-purple-600">{t('status.analyzing')}</p>
            </div>
          </div>
        )}

        {analysis && !loading && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-white rounded-lg p-3 border">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <LightBulbIcon className="h-4 w-4" />
                {t('sections.summary')}
              </h4>
              <p className="text-sm text-gray-600">{analysis.summary}</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {/* Sentiment */}
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">{t('sections.sentiment')}</span>
                  <Badge className={clsx("text-xs", getSentimentColor(analysis.sentiment.sentiment))}>
                    {Math.round(analysis.sentiment.confidence * 100)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = getSentimentIcon(analysis.sentiment.sentiment);
                    return <Icon className="h-4 w-4 text-gray-600" />;
                  })()}
                  <span className="text-sm font-medium text-gray-900">
                    {t(`sentiment.${analysis.sentiment.sentiment}`)}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-xs text-gray-500">
                    {analysis.sentiment.emotionalTone.join(', ')}
                  </span>
                </div>
              </div>

              {/* Priority */}
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">{t('sections.priority')}</span>
                  <Badge className={clsx("text-xs border", getPriorityColor(analysis.priority.priority))}>
                    {Math.round(analysis.priority.confidence * 100)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {t(`priority.${analysis.priority.priority}`)}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-xs text-gray-500">
                    {t('sla', { hours: analysis.priority.slaRecommendation })}
                  </span>
                </div>
              </div>
            </div>

            {/* Intent & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">{t('sections.intent')}</span>
                  <Badge color="blue" className="text-xs">
                    {Math.round(analysis.intent.confidence * 100)}%
                  </Badge>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {t(`intent.${analysis.intent.intent}`)}
                </div>
                {analysis.intent.actionRequired && (
                  <Badge color="orange" className="text-xs mt-1">
                    {t('actionRequired')}
                  </Badge>
                )}
              </div>

              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">{t('sections.category')}</span>
                  <Badge color="green" className="text-xs">
                    {Math.round(analysis.category.confidence * 100)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {t(`category.${analysis.category.category}`)}
                  </span>
                </div>
                {analysis.category.suggestedAssignee && (
                  <div className="mt-1">
                    <span className="text-xs text-gray-500">
                      → {analysis.category.suggestedAssignee}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Key Insights */}
            {analysis.keyInsights?.length > 0 && (
              <div className="bg-white rounded-lg p-3 border">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('sections.keyInsights')}</h4>
                <ul className="space-y-1">
                  {analysis.keyInsights.map((insight: string, index: number) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Actions */}
            {analysis.intent.suggestedActions?.length > 0 && (
              <div className="bg-white rounded-lg p-3 border">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('sections.suggestedActions')}</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.intent.suggestedActions.map((action: string, index: number) => (
                    <Badge key={index} color="blue" className="text-xs">
                      {action}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Insights */}
            {analysis.customerInsights && (
              <div className="bg-white rounded-lg p-3 border">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('sections.customerInsights')}</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">{t('customerInsights.satisfaction')}:</span>
                    <span className="ml-2 font-medium">
                      {t(`customerInsights.satisfactionLevel.${analysis.customerInsights.satisfactionLevel}`)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('customerInsights.relationship')}:</span>
                    <span className="ml-2 font-medium">
                      {t(`customerInsights.relationshipStatus.${analysis.customerInsights.relationshipStatus}`)}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-gray-500 text-sm">{t('customerInsights.nextAction')}:</span>
                  <p className="text-sm font-medium mt-1">{analysis.customerInsights.nextBestAction}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {!analysis && !loading && (
          <div className="text-center py-6">
            <SparklesIcon className="h-8 w-8 text-purple-300 mx-auto mb-2" />
            <p className="text-sm text-purple-600 mb-3">{t('status.available')}</p>
            <Button
              onClick={performAnalysis}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <SparklesIcon className="h-4 w-4 mr-2" />
              {t('actions.analyze')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}