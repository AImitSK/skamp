'use client';

import { useState } from 'react';
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
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
  suggestions: MonitoringSuggestion[];
  onConfirm: (suggestion: MonitoringSuggestion) => Promise<void>;
  onMarkSpam: (suggestion: MonitoringSuggestion) => Promise<void>;
  loading: boolean;
}

export function MonitoringSuggestionsTable({
  suggestions,
  onConfirm,
  onMarkSpam,
  loading
}: Props) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleConfirm = async (suggestion: MonitoringSuggestion) => {
    setProcessingId(suggestion.id || null);
    try {
      await onConfirm(suggestion);
    } finally {
      setProcessingId(null);
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
    const colors = {
      low: 'zinc',
      medium: 'yellow',
      high: 'green',
      very_high: 'blue'
    };

    const labels = {
      low: 'Niedrig',
      medium: 'Mittel',
      high: 'Hoch',
      very_high: 'Sehr Hoch'
    };

    return <Badge color={colors[confidence]}>{labels[confidence]}</Badge>;
  };

  const getStatusBadge = (status: MonitoringSuggestion['status']) => {
    switch (status) {
      case 'pending':
        return <Badge color="yellow">Ausstehend</Badge>;
      case 'auto_confirmed':
        return <Badge color="green">Auto-Import</Badge>;
      case 'confirmed':
        return <Badge color="green">Bestätigt</Badge>;
      case 'spam':
        return <Badge color="red">Spam</Badge>;
      default:
        return <Badge color="zinc">{status}</Badge>;
    }
  };

  // Gruppiere nach Status
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const autoConfirmedSuggestions = suggestions.filter(s => s.status === 'auto_confirmed');
  const otherSuggestions = suggestions.filter(s => !['pending', 'auto_confirmed'].includes(s.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <Text className="ml-3">Lade Vorschläge...</Text>
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
              Zur Überprüfung ({pendingSuggestions.length})
            </Text>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artikel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quellen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
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
                          Gefunden {formatDistanceToNow(suggestion.createdAt.toDate(), { locale: de, addSuffix: true })}
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
                          Ø {suggestion.avgMatchScore.toFixed(0)}% | Max {suggestion.highestMatchScore}%
                        </Text>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getConfidenceBadge(suggestion.confidence)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          color="green"
                          onClick={() => handleConfirm(suggestion)}
                          disabled={processingId === suggestion.id}
                        >
                          <CheckCircleIcon className="size-4" />
                          Übernehmen
                        </Button>
                        <Button
                          color="red"
                          onClick={() => handleMarkSpam(suggestion)}
                          disabled={processingId === suggestion.id}
                        >
                          <ExclamationTriangleIcon className="size-4" />
                          Spam
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
              Automatisch importiert ({autoConfirmedSuggestions.length})
            </Text>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artikel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quellen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                          Importiert {suggestion.autoConfirmedAt && formatDistanceToNow(suggestion.autoConfirmedAt.toDate(), { locale: de, addSuffix: true })}
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

      {/* Other Suggestions (Spam, etc.) */}
      {otherSuggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Text className="font-semibold text-gray-900">
              Weitere Vorschläge ({otherSuggestions.length})
            </Text>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artikel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {otherSuggestions.map((suggestion) => (
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
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(suggestion.createdAt.toDate(), { locale: de, addSuffix: true })}
                        </p>
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
          <Text className="text-gray-500 font-medium">Keine automatisch gefundenen Artikel</Text>
          <Text className="text-sm text-gray-400 mt-2">
            Sobald der Crawler aktiv ist, werden hier Vorschläge angezeigt
          </Text>
        </div>
      )}
    </div>
  );
}
