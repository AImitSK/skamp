'use client';

import { useState, useMemo } from 'react';
import { Heading, Subheading } from '@/components/ui/heading';
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
  UsersIcon,
  PlusIcon
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
      { name: 'Manuell', value: manual, color: '#005fab' },
      { name: 'Auto-Bestätigt', value: autoConfirmed, color: '#3397d7' },
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <Heading level={3}>Monitoring Übersicht</Heading>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              // Navigate zur ersten Campaign mit Empfänger Tab
              if (campaigns.length > 0) {
                window.location.href = `/dashboard/analytics/monitoring/${campaigns[0].id}?tab=recipients`;
              }
            }}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Veröffentlichung erfassen
          </Button>

          {pendingSuggestions.length > 0 && (
            <Button
              onClick={() => {
                // Navigate zur ersten Campaign mit Auto-Funde Tab
                const firstSuggestion = pendingSuggestions[0];
                const campaign = campaigns.find(c => c.id === firstSuggestion.campaignId);
                if (campaign) {
                  window.location.href = `/dashboard/analytics/monitoring/${campaign.id}?tab=suggestions`;
                }
              }}
              className="bg-[#005fab] hover:bg-[#004a8c] text-white"
            >
              <BellAlertIcon className="w-4 h-4 mr-2" />
              Veröffentlichung prüfen ({pendingSuggestions.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-600">Veröffentlichungen</Text>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {clippings.length}
              </div>
            </div>
            <NewspaperIcon className="h-8 w-8 text-[#005fab]" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-600">Zu prüfen</Text>
              <div className="text-2xl font-semibold text-orange-600 mt-1">
                {pendingSuggestions.length}
              </div>
            </div>
            <BellAlertIcon className="h-8 w-8 text-[#005fab]" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-600">Ø Reichweite</Text>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {formatNumber(avgReach)}
              </div>
            </div>
            <ChartBarIcon className="h-8 w-8 text-[#005fab]" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-600">Öffnungsrate</Text>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {emailStats.openRate}%
              </div>
            </div>
            <EyeIcon className="h-8 w-8 text-[#005fab]" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="h-5 w-5 text-[#005fab]" />
            <Subheading>Status-Verteilung</Subheading>
          </div>
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
          <div className="flex items-center gap-2 mb-4">
            <NewspaperIcon className="h-5 w-5 text-[#005fab]" />
            <Subheading>Top Medien</Subheading>
          </div>
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
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="h-5 w-5 text-[#005fab]" />
            <Subheading>Veröffentlichungen im Zeitverlauf (30 Tage)</Subheading>
          </div>
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
            <div className="flex items-center gap-2">
              <BellAlertIcon className="h-5 w-5 text-[#005fab]" />
              <Subheading>Pending Auto-Funde ({pendingSuggestions.length})</Subheading>
            </div>
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
          <div className="flex items-center gap-2">
            <NewspaperIcon className="h-5 w-5 text-[#005fab]" />
            <Subheading>Letzte Veröffentlichungen</Subheading>
          </div>
          <Button
            plain
            onClick={() => {
              // Navigate zur ersten Campaign mit Clipping-Archiv Tab
              if (campaigns.length > 0) {
                window.location.href = `/dashboard/analytics/monitoring/${campaigns[0].id}?tab=clippings`;
              }
            }}
          >
            Alle anzeigen ({clippings.length})
            <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {recentClippings.length > 0 ? (
          <div className="space-y-2">
            {recentClippings.map((clipping) => {
              // Finde Campaign für dieses Clipping
              const campaign = campaigns.find(c => c.id === clipping.campaignId);

              // Outlet-Avatar Initialen
              const outletInitial = clipping.outletName?.charAt(0).toUpperCase() || 'N';

              return (
                <a
                  key={clipping.id}
                  href={campaign ? `/dashboard/analytics/monitoring/${campaign.id}` : '#'}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 hover:shadow-sm rounded-lg transition-all border border-gray-200 group"
                >
                  {/* Outlet Avatar */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: '#005fab' }}
                  >
                    {outletInitial}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-gray-900 truncate text-sm group-hover:text-[#005fab] transition-colors">
                        {clipping.title}
                      </h4>
                      {clipping.reach && (
                        <span className="flex-shrink-0 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                          {formatNumber(clipping.reach)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="font-medium">{clipping.outletName}</span>
                      <span>•</span>
                      <span>
                        {clipping.publishedAt &&
                          formatDistanceToNow(clipping.publishedAt.toDate(), {
                            addSuffix: true,
                            locale: de
                          })}
                      </span>
                      {clipping.detectionMethod === 'automated' && (
                        <>
                          <span>•</span>
                          <Badge color="green" className="text-xs !py-0">🤖 Auto</Badge>
                        </>
                      )}
                    </div>
                  </div>
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
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-[#005fab]" />
            <Subheading>Empfänger-Performance</Subheading>
          </div>
          <Button
            plain
            onClick={() => {
              // Navigate zur ersten Campaign mit Empfänger Tab
              if (campaigns.length > 0) {
                window.location.href = `/dashboard/analytics/monitoring/${campaigns[0].id}?tab=recipients`;
              }
            }}
          >
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
            <div className="w-full bg-gray-100 rounded-full h-8 flex items-center relative">
              <div
                className="h-8 rounded-full transition-all"
                style={{ width: `${emailStats.openRate}%`, backgroundColor: '#3397d7' }}
              />
            </div>
          </div>

          {/* Progress Bar für Klickrate */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Text className="text-sm text-gray-600">Klickrate</Text>
              <Text className="text-sm font-semibold text-gray-900">{emailStats.clickRate}%</Text>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-8 flex items-center relative">
              <div
                className="h-8 rounded-full transition-all"
                style={{ width: `${emailStats.clickRate}%`, backgroundColor: '#005fab' }}
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
