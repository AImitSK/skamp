'use client';

import { MediaClipping } from '@/types/monitoring';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ClippingArchiveProps {
  clippings: MediaClipping[];
}

export function ClippingArchive({ clippings }: ClippingArchiveProps) {
  const totalReach = clippings.reduce((sum, c) => sum + (c.reach || 0), 0);
  const totalAVE = clippings.reduce((sum, c) => sum + (c.ave || 0), 0);

  const sentimentCounts = {
    positive: clippings.filter(c => c.sentiment === 'positive').length,
    neutral: clippings.filter(c => c.sentiment === 'neutral').length,
    negative: clippings.filter(c => c.sentiment === 'negative').length
  };

  const getSentimentEmoji = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'neutral': return '😐';
      case 'negative': return '😞';
    }
  };

  const getSentimentColor = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return 'green';
      case 'neutral': return 'zinc';
      case 'negative': return 'red';
    }
  };

  return (
    <div className="space-y-6">
      {clippings.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Text className="text-sm text-gray-600">Gesamtreichweite</Text>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {totalReach.toLocaleString('de-DE')}
              </div>
            </div>

            {totalAVE > 0 && (
              <div>
                <Text className="text-sm text-gray-600">Gesamt-AVE</Text>
                <div className="text-2xl font-semibold text-gray-900 mt-1">
                  {totalAVE.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>
            )}

            <div>
              <Text className="text-sm text-gray-600">Sentiment</Text>
              <div className="flex gap-3 mt-1">
                <span className="text-gray-900">😊 {sentimentCounts.positive}</span>
                <span className="text-gray-900">😐 {sentimentCounts.neutral}</span>
                <span className="text-gray-900">😞 {sentimentCounts.negative}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {clippings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Text className="text-gray-500">Noch keine Veröffentlichungen erfasst</Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clippings.map((clipping) => (
            <div
              key={clipping.id}
              className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Text className="font-medium text-gray-900 mb-1">
                    {clipping.title}
                  </Text>
                  <Text className="text-sm text-gray-600 mb-2">
                    {clipping.outletName} • {new Date(clipping.publishedAt.toDate()).toLocaleDateString('de-DE')}
                  </Text>
                </div>
                <Badge color={getSentimentColor(clipping.sentiment)}>
                  {getSentimentEmoji(clipping.sentiment)}
                </Badge>
              </div>

              {clipping.excerpt && (
                <Text className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {clipping.excerpt}
                </Text>
              )}

              <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
                {clipping.reach && (
                  <span>👁️ {clipping.reach.toLocaleString('de-DE')}</span>
                )}
                {clipping.ave && (
                  <span>💰 {clipping.ave.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                )}
                <Badge color="zinc">{clipping.outletType}</Badge>
              </div>

              <a
                href={clipping.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Artikel ansehen →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}