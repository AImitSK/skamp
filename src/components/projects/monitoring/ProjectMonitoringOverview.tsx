'use client';

import { useState, useMemo } from 'react';
import { Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import {
  NewspaperIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  EyeIcon,
  BellAlertIcon,
  ChartBarIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { MediaClipping, MonitoringSuggestion } from '@/types/monitoring';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface ProjectMonitoringOverviewProps {
  clippings: MediaClipping[];
  suggestions: MonitoringSuggestion[];
  sends: any[];
  campaigns: any[]; // Campaign list for deep linking
  onViewAllClippings: () => void;
  onViewAllRecipients: () => void;
  onViewSuggestion: (suggestion: MonitoringSuggestion) => void;
  onConfirmSuggestion?: (suggestionId: string) => void;
  onRejectSuggestion?: (suggestionId: string) => void;
}

export function ProjectMonitoringOverview({
  clippings,
  suggestions,
  sends,
  campaigns,
  onViewAllClippings,
  onViewAllRecipients,
  onViewSuggestion,
  onConfirmSuggestion,
  onRejectSuggestion
}: ProjectMonitoringOverviewProps) {
  // Pending Suggestions
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  // Status Distribution Data
  const statusData = useMemo(() => {
    const autoConfirmed = clippings.filter(c => c.detectionMethod === 'automated').length;
    const manual = clippings.filter(c => c.detectionMethod === 'manual').length;
    const pending = pendingSuggestions.length;

    return [
      { name: 'Auto-Bestätigt', value: autoConfirmed, color: '#10b981' },
      { name: 'Manuell', value: manual, color: '#3b82f6' },
      { name: 'Prüfen', value: pending, color: '#f59e0b' }
    ].filter(item => item.value > 0);
  }, [clippings, pendingSuggestions]);

  // Top Publications Data
  const topPublicationsData = useMemo(() => {
    const publicationCounts: Record<string, number> = {};

    clippings.forEach(clip => {
      const outlet = clip.outletName || 'Unbekannt';
      publicationCounts[outlet] = (publicationCounts[outlet] || 0) + 1;
    });

    return Object.entries(publicationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [clippings]);

  // Timeline Data (letzte 30 Tage)
  const timelineData = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Gruppiere nach Wochen
    const weekData: Record<string, number> = {};

    clippings.forEach(clip => {
      if (!clip.publishedAt) return;

      const publishDate = clip.publishedAt.toDate();
      if (publishDate < thirtyDaysAgo) return;

      // Berechne Kalenderwoche
      const weekNum = getWeekNumber(publishDate);
      const year = publishDate.getFullYear();
      const key = `KW${weekNum}`;

      weekData[key] = (weekData[key] || 0) + 1;
    });

    // Konvertiere zu Array und sortiere
    return Object.entries(weekData)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => {
        const weekA = parseInt(a.week.replace('KW', ''));
        const weekB = parseInt(b.week.replace('KW', ''));
        return weekA - weekB;
      });
  }, [clippings]);

  // Email Stats
  const emailStats = useMemo(() => {
    const total = sends.length;
    const opened = sends.filter(s => s.status === 'opened' || s.status === 'clicked').length;
    const clicked = sends.filter(s => s.status === 'clicked').length;

    return {
      total,
      opened,
      clicked,
      openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
      clickRate: total > 0 ? Math.round((clicked / total) * 100) : 0
    };
  }, [sends]);

  // Top 5 Recent Clippings
  const recentClippings = useMemo(() => {
    return [...clippings]
      .sort((a, b) => {
        const dateA = a.publishedAt?.toDate() || new Date(0);
        const dateB = b.publishedAt?.toDate() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [clippings]);

  // Average Reach
  const avgReach = useMemo(() => {
    if (clippings.length === 0) return 0;
    const totalReach = clippings.reduce((sum, c) => sum + (c.reach || 0), 0);
    return Math.round(totalReach / clippings.length);
  }, [clippings]);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-600">Veröffentlichungen</Text>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {clippings.length}
              </div>
            </div>
            <NewspaperIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-600">Zu prüfen</Text>
              <div className="text-2xl font-semibold text-orange-600 mt-1">
                {pendingSuggestions.length}
              </div>
            </div>
            <BellAlertIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-600">Ø Reichweite</Text>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {formatNumber(avgReach)}
              </div>
            </div>
            <ChartBarIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-600">Öffnungsrate</Text>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {emailStats.openRate}%
              </div>
            </div>
            <EyeIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Subheading className="mb-4">📊 Status-Verteilung</Subheading>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-1 gap-2 mt-4">
                {statusData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                      <Text className="text-sm text-gray-600">{item.name}</Text>
                    </div>
                    <Text className="text-sm font-semibold text-gray-900">{item.value}</Text>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Text>Noch keine Daten vorhanden</Text>
            </div>
          )}
        </div>

        {/* Top Publications Bar Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Subheading className="mb-4">📰 Top Medien</Subheading>
          {topPublicationsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topPublicationsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#005fab" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Text>Noch keine Veröffentlichungen</Text>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Chart */}
      {timelineData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Subheading className="mb-4">📈 Veröffentlichungen im Zeitverlauf (30 Tage)</Subheading>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#005fab"
                fill="#add8f0"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pending Auto-Funde */}
      {pendingSuggestions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Subheading>🔔 Pending Auto-Funde ({pendingSuggestions.length})</Subheading>
            <Button
              plain
              onClick={() => onViewSuggestion(pendingSuggestions[0])}
            >
              Alle anzeigen
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {pendingSuggestions.slice(0, 3).map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Text className="font-medium text-gray-900 truncate">
                      {suggestion.articleTitle}
                    </Text>
                    <Badge color="orange" className="text-xs">
                      Match {suggestion.highestMatchScore}%
                    </Badge>
                  </div>
                  <Text className="text-sm text-gray-600 truncate">
                    {suggestion.sources.map(s => s.sourceName).join(', ')}
                  </Text>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {onConfirmSuggestion && (
                    <Button
                      size="sm"
                      color="green"
                      onClick={() => onConfirmSuggestion(suggestion.id!)}
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Bestätigen
                    </Button>
                  )}
                  {onRejectSuggestion && (
                    <Button
                      size="sm"
                      plain
                      onClick={() => onRejectSuggestion(suggestion.id!)}
                      className="!text-red-600 hover:!text-red-700"
                    >
                      Ablehnen
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Clippings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Subheading>📰 Letzte Veröffentlichungen</Subheading>
          <Button plain onClick={onViewAllClippings}>
            Alle anzeigen ({clippings.length})
            <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {recentClippings.length > 0 ? (
          <div className="space-y-3">
            {recentClippings.map((clipping) => {
              // Finde Campaign für dieses Clipping
              const campaign = campaigns.find(c => c.id === clipping.campaignId);

              return (
                <a
                  key={clipping.id}
                  href={campaign ? `/dashboard/analytics/monitoring/${campaign.id}` : '#'}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100 block"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Text className="font-medium text-gray-900">
                        {clipping.outletName}
                      </Text>
                      {clipping.detectionMethod === 'automated' && (
                        <Badge color="green" className="text-xs">Auto</Badge>
                      )}
                    </div>
                    <Text className="text-sm text-gray-600 truncate">
                      {clipping.title}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      {clipping.publishedAt &&
                        formatDistanceToNow(clipping.publishedAt.toDate(), {
                          addSuffix: true,
                          locale: de
                        })}
                      {clipping.reach && ` • Reichweite: ${formatNumber(clipping.reach)}`}
                    </Text>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
                </a>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <NewspaperIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <Text>Noch keine Veröffentlichungen</Text>
          </div>
        )}
      </div>

      {/* Recipients Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Subheading>👥 Empfänger-Performance</Subheading>
          <Button plain onClick={onViewAllRecipients}>
            Detaillierte Liste
            <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Progress Bar für Öffnungsrate */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Text className="text-sm text-gray-600">Öffnungsrate</Text>
              <Text className="text-sm font-semibold text-gray-900">{emailStats.openRate}%</Text>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-blue-600 transition-all"
                style={{ width: `${emailStats.openRate}%` }}
              />
            </div>
          </div>

          {/* Progress Bar für Klickrate */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Text className="text-sm text-gray-600">Klickrate</Text>
              <Text className="text-sm font-semibold text-gray-900">{emailStats.clickRate}%</Text>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-green-600 transition-all"
                style={{ width: `${emailStats.clickRate}%` }}
              />
            </div>
          </div>

          {/* Stats Summary */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <Text className="text-sm text-gray-600">
              {emailStats.total} versandt
            </Text>
            <Text className="text-sm text-gray-600">
              {emailStats.opened} geöffnet
            </Text>
            <Text className="text-sm text-gray-600">
              {emailStats.clicked} geklickt
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Functions
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
