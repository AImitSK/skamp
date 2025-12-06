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
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Field, Label } from '@/components/ui/fieldset';
import {
  SentimentPositiveIcon,
  SentimentNeutralIcon,
  SentimentNegativeIcon
} from '@/components/ui/sentiment-icons';
import { MediaClipping, MonitoringSuggestion, CampaignMonitoringTracker, MonitoringChannel } from '@/types/monitoring';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { SignalIcon, RssIcon, GlobeAltIcon, XCircleIcon, CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface ProjectMonitoringOverviewProps {
  clippings: MediaClipping[];
  suggestions: MonitoringSuggestion[];
  sends: any[];
  campaigns: any[]; // Campaign list for deep linking
  tracker?: CampaignMonitoringTracker | null; // Crawler-Status
  onViewAllClippings: () => void;
  onViewAllRecipients: () => void;
  onViewSuggestion: (suggestion: MonitoringSuggestion) => void;
  onConfirmSuggestion?: (suggestionId: string, sentiment?: 'positive' | 'neutral' | 'negative') => void;
  onRejectSuggestion?: (suggestionId: string) => void;
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

export function ProjectMonitoringOverview({
  clippings,
  suggestions,
  sends,
  campaigns,
  tracker,
  onViewAllClippings,
  onViewAllRecipients,
  onViewSuggestion,
  onConfirmSuggestion,
  onRejectSuggestion
}: ProjectMonitoringOverviewProps) {
  // State für Sentiment-Dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<MonitoringSuggestion | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');

  // State für Crawler-Status Modal
  const [crawlerModalOpen, setCrawlerModalOpen] = useState(false);

  // Pending Suggestions
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  // Dialog öffnen
  const openConfirmDialog = (suggestion: MonitoringSuggestion) => {
    setSelectedSuggestion(suggestion);
    setSelectedSentiment('neutral');
    setConfirmDialogOpen(true);
  };

  // Bestätigung mit Sentiment
  const handleConfirmWithSentiment = () => {
    if (selectedSuggestion && onConfirmSuggestion) {
      onConfirmSuggestion(selectedSuggestion.id!, selectedSentiment);
      setConfirmDialogOpen(false);
      setSelectedSuggestion(null);
    }
  };

  // Status Distribution Data
  const statusData = useMemo(() => {
    // detectionMethod ist: 'manual' | 'google_news' | 'rss' | 'web_scraping' | 'imported'
    // Alles außer 'manual' und 'imported' zählt als automatisch
    const autoConfirmed = clippings.filter(c =>
      c.detectionMethod === 'google_news' ||
      c.detectionMethod === 'rss' ||
      c.detectionMethod === 'web_scraping'
    ).length;
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

      {/* Crawler Status Badge */}
      {tracker && (
        <div
          className="flex items-center justify-between bg-gray-50 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setCrawlerModalOpen(true)}
        >
          <div className="flex items-center gap-3">
            <SignalIcon className={`h-5 w-5 ${tracker.isActive ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <Text className="text-sm font-medium text-gray-900">Automatisches Monitoring</Text>
              <Text className="text-xs text-gray-500">
                {tracker.lastCrawlAt
                  ? `Letzter Crawl: ${format(tracker.lastCrawlAt.toDate(), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr`
                  : 'Noch kein Crawl durchgeführt'
                }
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tracker.isActive ? (
              <Badge color="green" className="text-xs">
                <CheckCircleSolidIcon className="h-3 w-3 mr-1" />
                Aktiv
              </Badge>
            ) : (
              <Badge color="zinc" className="text-xs">Inaktiv</Badge>
            )}
            <Text className="text-xs text-gray-400">Klicken für Details</Text>
          </div>
        </div>
      )}

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
                      onClick={() => openConfirmDialog(suggestion)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Bestätigen
                    </Button>
                  )}
                  {onRejectSuggestion && (
                    <Button
                      plain
                      onClick={() => onRejectSuggestion(suggestion.id!)}
                      className="!text-red-600 hover:!text-red-700 px-3 py-1.5 text-sm"
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
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 hover:border-zinc-300 rounded-lg transition-all border border-gray-200 group"
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
                      {(clipping.detectionMethod === 'google_news' ||
                        clipping.detectionMethod === 'rss' ||
                        clipping.detectionMethod === 'web_scraping') && (
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

      {/* Bestätigungs-Dialog mit Sentiment-Auswahl */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Clipping übernehmen</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            {selectedSuggestion && (
              <div>
                <Text className="font-medium text-gray-900">{selectedSuggestion.articleTitle}</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  {selectedSuggestion.sources[0]?.sourceName || 'Unbekannte Quelle'}
                </Text>
              </div>
            )}

            <Field>
              <Label>Sentiment</Label>
              <div className="flex gap-3 mt-2">
                <SentimentButton
                  sentiment="positive"
                  selected={selectedSentiment === 'positive'}
                  onClick={() => setSelectedSentiment('positive')}
                  label="Positiv"
                />
                <SentimentButton
                  sentiment="neutral"
                  selected={selectedSentiment === 'neutral'}
                  onClick={() => setSelectedSentiment('neutral')}
                  label="Neutral"
                />
                <SentimentButton
                  sentiment="negative"
                  selected={selectedSentiment === 'negative'}
                  onClick={() => setSelectedSentiment('negative')}
                  label="Negativ"
                />
              </div>
            </Field>
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setConfirmDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirmWithSentiment}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Clipping erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Crawler-Status Modal */}
      <Dialog open={crawlerModalOpen} onClose={() => setCrawlerModalOpen(false)} size="2xl">
        <DialogTitle>
          <div className="flex items-center gap-2">
            <SignalIcon className={`h-5 w-5 ${tracker?.isActive ? 'text-green-600' : 'text-gray-400'}`} />
            Crawler-Status
          </div>
        </DialogTitle>
        <DialogBody>
          {tracker && (
            <div className="space-y-6">
              {/* Status-Übersicht */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <Text className="text-xs text-gray-500 uppercase">Letzter Crawl</Text>
                  <Text className="text-lg font-semibold text-gray-900">
                    {tracker.lastCrawlAt
                      ? format(tracker.lastCrawlAt.toDate(), 'dd.MM.yyyy \'um\' HH:mm \'Uhr\'', { locale: de })
                      : 'Noch nicht durchgeführt'
                    }
                  </Text>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <Text className="text-xs text-gray-500 uppercase">Nächster Crawl</Text>
                  <Text className="text-lg font-semibold text-gray-900">
                    {tracker.nextCrawlAt
                      ? format(tracker.nextCrawlAt.toDate(), 'dd.MM.yyyy \'um\' HH:mm \'Uhr\'', { locale: de })
                      : 'Nicht geplant'
                    }
                  </Text>
                </div>
              </div>

              {/* Statistiken */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Text className="text-2xl font-bold text-blue-600">{tracker.channels?.length || 0}</Text>
                  <Text className="text-xs text-gray-600">Channels</Text>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Text className="text-2xl font-bold text-green-600">{tracker.totalArticlesFound || 0}</Text>
                  <Text className="text-xs text-gray-600">Funde gesamt</Text>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Text className="text-2xl font-bold text-purple-600">{tracker.totalAutoConfirmed || 0}</Text>
                  <Text className="text-xs text-gray-600">Auto-Bestätigt</Text>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <Text className="text-2xl font-bold text-orange-600">{tracker.totalSpamMarked || 0}</Text>
                  <Text className="text-xs text-gray-600">Als Spam</Text>
                </div>
              </div>

              {/* Channel-Tabelle */}
              <div>
                <Subheading className="mb-3">Überwachte Channels</Subheading>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Funde</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Letzter Check</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tracker.channels && tracker.channels.length > 0 ? (
                        tracker.channels.map((channel: MonitoringChannel, idx: number) => (
                          <tr key={channel.id || idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {channel.type === 'rss_feed' ? (
                                  <RssIcon className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                ) : (
                                  <GlobeAltIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                )}
                                <Text className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                  {channel.publicationName}
                                </Text>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge color={channel.type === 'rss_feed' ? 'orange' : 'blue'} className="text-xs">
                                {channel.type === 'rss_feed' ? 'RSS Feed' : 'Google News'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {channel.isActive ? (
                                <CheckCircleSolidIcon className="h-5 w-5 text-green-500 mx-auto" />
                              ) : channel.wasFound ? (
                                <CheckCircleSolidIcon className="h-5 w-5 text-blue-500 mx-auto" title="Fund - deaktiviert" />
                              ) : channel.errorCount > 0 ? (
                                <XCircleIcon className="h-5 w-5 text-red-500 mx-auto" title={channel.lastError} />
                              ) : (
                                <div className="h-5 w-5 border-2 border-gray-300 rounded-full mx-auto" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Text className={`text-sm font-semibold ${channel.articlesFound > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                {channel.articlesFound}
                              </Text>
                            </td>
                            <td className="px-4 py-3">
                              <Text className="text-xs text-gray-500">
                                {channel.lastChecked
                                  ? formatDistanceToNow(channel.lastChecked.toDate(), { addSuffix: true, locale: de })
                                  : '-'
                                }
                              </Text>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            <Text>Keine Channels konfiguriert</Text>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setCrawlerModalOpen(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
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
