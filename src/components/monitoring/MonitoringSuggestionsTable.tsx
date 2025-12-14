'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MonitoringSuggestion, MonitoringSource } from '@/types/monitoring';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  RssIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import {
  SentimentPositiveIcon,
  SentimentNeutralIcon,
  SentimentNegativeIcon
} from '@/components/ui/sentiment-icons';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Field, Label } from '@/components/ui/fieldset';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { clippingService, type DuplicateCheckResult } from '@/lib/firebase/clipping-service';

interface Props {
  suggestions: MonitoringSuggestion[];
  campaignId: string;
  organizationId: string;
  onConfirm: (suggestion: MonitoringSuggestion, sentiment: 'positive' | 'neutral' | 'negative') => Promise<void>;
  onMarkSpam: (suggestion: MonitoringSuggestion) => Promise<void>;
  loading: boolean;
}

// SentimentButton Komponente
function SentimentButton({
  sentiment,
  selected,
  onClick,
  label
}: {
  sentiment: 'positive' | 'neutral' | 'negative';
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  const colors = {
    positive: selected
      ? 'bg-green-100 border-green-500 text-green-700'
      : 'bg-white border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-300',
    neutral: selected
      ? 'bg-gray-200 border-gray-500 text-gray-700'
      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400',
    negative: selected
      ? 'bg-red-100 border-red-500 text-red-700'
      : 'bg-white border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-300'
  };

  const renderIcon = () => {
    switch (sentiment) {
      case 'positive':
        return <SentimentPositiveIcon className="size-5" />;
      case 'neutral':
        return <SentimentNeutralIcon className="size-5" />;
      case 'negative':
        return <SentimentNegativeIcon className="size-5" />;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-colors ${colors[sentiment]}`}
    >
      {renderIcon()}
      <span className="font-medium">{label}</span>
    </button>
  );
}

export function MonitoringSuggestionsTable({
  suggestions,
  campaignId,
  organizationId,
  onConfirm,
  onMarkSpam,
  loading
}: Props) {
  const t = useTranslations('monitoring.suggestionsTable');
  const tCommon = useTranslations('common');

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<MonitoringSuggestion | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Duplikat-Prüfung wenn Dialog geöffnet wird
  useEffect(() => {
    if (!confirmDialogOpen || !selectedSuggestion || !organizationId) {
      setDuplicateCheck(null);
      return;
    }

    const checkDuplicate = async () => {
      setCheckingDuplicate(true);
      try {
        const result = await clippingService.checkForDuplicate(
          selectedSuggestion.articleUrl,
          campaignId,
          { organizationId }
        );
        setDuplicateCheck(result);
      } catch (error) {
        console.error('Duplikat-Prüfung fehlgeschlagen:', error);
        setDuplicateCheck(null);
      } finally {
        setCheckingDuplicate(false);
      }
    };

    checkDuplicate();
  }, [confirmDialogOpen, selectedSuggestion, campaignId, organizationId]);

  const openConfirmDialog = (suggestion: MonitoringSuggestion) => {
    setSelectedSuggestion(suggestion);
    setSelectedSentiment('neutral');
    setDuplicateCheck(null);
    setConfirmDialogOpen(true);
  };

  const handleConfirmWithSentiment = async () => {
    if (!selectedSuggestion) return;

    setProcessingId(selectedSuggestion.id || null);
    setConfirmDialogOpen(false);
    try {
      await onConfirm(selectedSuggestion, selectedSentiment);
    } finally {
      setProcessingId(null);
      setSelectedSuggestion(null);
    }
  };

  const handleMarkSpam = async (suggestion: MonitoringSuggestion) => {
    if (!confirm('Als Spam markieren? Optional kann ein Spam-Pattern erstellt werden.')) return;

    setProcessingId(suggestion.id || null);
    try {
      await onMarkSpam(suggestion);
    } finally {
      setProcessingId(null);
    }
  };

  const getSourceIcon = (type: MonitoringSource['type']) => {
    if (type === 'google_news') return <GlobeAltIcon className="size-4" />;
    if (type === 'rss_feed') return <RssIcon className="size-4" />;
    return <GlobeAltIcon className="size-4" />;
  };

  const getConfidenceBadge = (confidence: MonitoringSuggestion['confidence']) => {
    const colorMap = {
      low: 'zinc',
      medium: 'yellow',
      high: 'green',
      very_high: 'blue'
    } as const;

    return <Badge color={colorMap[confidence] as any}>{t(`confidence.${confidence}`)}</Badge>;
  };

  const getStatusBadge = (status: MonitoringSuggestion['status']) => {
    const statusMap: Record<MonitoringSuggestion['status'], string> = {
      pending: 'yellow',
      auto_confirmed: 'green',
      confirmed: 'green',
      spam: 'red'
    };

    return <Badge color={(statusMap[status] || 'zinc') as any}>{t(`status.${status}`)}</Badge>;
  };

  // Gruppiere nach Status
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const autoConfirmedSuggestions = suggestions.filter(s => s.status === 'auto_confirmed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <Text className="ml-3">{t('loading')}</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Suggestions - Wichtigste zuerst */}
      {pendingSuggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            <Text className="font-semibold text-gray-900">
              {t('sections.pending', { count: pendingSuggestions.length })}
            </Text>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.article')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.sources')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.confidence')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingSuggestions.map((suggestion) => (
                  <tr key={suggestion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <a
                          href={suggestion.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {suggestion.articleTitle}
                        </a>
                        {suggestion.articleExcerpt && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {suggestion.articleExcerpt}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {t('foundAgo', { time: formatDistanceToNow(suggestion.createdAt.toDate(), { locale: de, addSuffix: true }) })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {suggestion.sources.map((source, idx) => (
                            <Badge key={idx} color="blue" className="flex items-center gap-1">
                              {getSourceIcon(source.type)}
                              <span className="truncate max-w-[120px]" title={source.sourceName}>
                                {source.sourceName}
                              </span>
                              <span className="text-xs">({source.matchScore}%)</span>
                            </Badge>
                          ))}
                        </div>
                        <Text className="text-xs text-gray-500">
                          {t('matchScores', { avg: suggestion.avgMatchScore.toFixed(0), max: suggestion.highestMatchScore })}
                        </Text>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getConfidenceBadge(suggestion.confidence)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => openConfirmDialog(suggestion)}
                          disabled={processingId === suggestion.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircleIcon className="size-4" />
                          {t('actions.accept')}
                        </Button>
                        <Button
                          onClick={() => handleMarkSpam(suggestion)}
                          disabled={processingId === suggestion.id}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <ExclamationTriangleIcon className="size-4" />
                          {t('actions.spam')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auto-Confirmed Suggestions - Zur Info */}
      {autoConfirmedSuggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="h-5 w-5 text-green-600" />
            <Text className="font-semibold text-gray-900">
              {t('sections.autoImported', { count: autoConfirmedSuggestions.length })}
            </Text>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.article')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.sources')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {autoConfirmedSuggestions.map((suggestion) => (
                  <tr key={suggestion.id} className="bg-green-50/30">
                    <td className="px-6 py-4">
                      <div>
                        <a
                          href={suggestion.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {suggestion.articleTitle}
                        </a>
                        {suggestion.articleExcerpt && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {suggestion.articleExcerpt}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {suggestion.autoConfirmedAt && t('importedAgo', { time: formatDistanceToNow(suggestion.autoConfirmedAt.toDate(), { locale: de, addSuffix: true }) })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {suggestion.sources.map((source, idx) => (
                          <Badge key={idx} color="green" className="flex items-center gap-1">
                            {getSourceIcon(source.type)}
                            <span className="truncate max-w-[120px]" title={source.sourceName}>
                              {source.sourceName}
                            </span>
                            <span className="text-xs">({source.matchScore}%)</span>
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(suggestion.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {suggestions.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <SparklesIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <Text className="text-gray-500 font-medium">{t('empty.title')}</Text>
          <Text className="text-sm text-gray-400 mt-2">
            {t('empty.description')}
          </Text>
        </div>
      )}

      {/* Bestätigungs-Dialog mit Sentiment-Auswahl */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>{t('confirmDialog.title')}</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            {selectedSuggestion && (
              <div>
                <Text className="font-medium text-gray-900">{selectedSuggestion.articleTitle}</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  {selectedSuggestion.sources[0]?.sourceName || t('confirmDialog.unknownSource')}
                </Text>
              </div>
            )}

            {/* Duplikat-Prüfung Status */}
            {checkingDuplicate && (
              <Text className="text-sm text-gray-500">{t('confirmDialog.checkingDuplicate')}</Text>
            )}

            {/* Duplikat-Warnung */}
            {duplicateCheck?.isDuplicate && duplicateCheck.existingClipping && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <Text className="font-medium text-amber-800">
                      {t('confirmDialog.duplicateWarning.title')}
                    </Text>
                    <Text className="text-sm text-amber-700 mt-1">
                      {t('confirmDialog.duplicateWarning.description')}
                    </Text>
                    <div className="mt-2 bg-white rounded border border-amber-200 p-3">
                      <Text className="font-medium text-gray-900">
                        {duplicateCheck.existingClipping.title}
                      </Text>
                      <div className="flex items-center gap-2 mt-1">
                        <Text className="text-sm text-gray-600">
                          {duplicateCheck.existingClipping.outletName}
                        </Text>
                        <Badge color="blue">
                          {duplicateCheck.existingClipping.detectionMethod === 'manual'
                            ? t('confirmDialog.duplicateWarning.manuallyRecorded')
                            : t('confirmDialog.duplicateWarning.alreadyImported')}
                        </Badge>
                        {duplicateCheck.existingClipping.reach && (
                          <Text className="text-sm text-gray-500">
                            {t('confirmDialog.duplicateWarning.reach', { reach: duplicateCheck.existingClipping.reach.toLocaleString('de-DE') })}
                          </Text>
                        )}
                      </div>
                    </div>
                    <Text className="text-xs text-amber-600 mt-2">
                      {t('confirmDialog.duplicateWarning.consequence')}
                    </Text>
                  </div>
                </div>
              </div>
            )}

            <Field>
              <Label>{t('confirmDialog.sentiment')}</Label>
              <div className="flex gap-3 mt-2">
                <SentimentButton
                  sentiment="positive"
                  selected={selectedSentiment === 'positive'}
                  onClick={() => setSelectedSentiment('positive')}
                  label={t('confirmDialog.sentimentOptions.positive')}
                />
                <SentimentButton
                  sentiment="neutral"
                  selected={selectedSentiment === 'neutral'}
                  onClick={() => setSelectedSentiment('neutral')}
                  label={t('confirmDialog.sentimentOptions.neutral')}
                />
                <SentimentButton
                  sentiment="negative"
                  selected={selectedSentiment === 'negative'}
                  onClick={() => setSelectedSentiment('negative')}
                  label={t('confirmDialog.sentimentOptions.negative')}
                />
              </div>
            </Field>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setConfirmDialogOpen(false)}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleConfirmWithSentiment}
            disabled={processingId !== null || checkingDuplicate}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {t('confirmDialog.createClipping')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
