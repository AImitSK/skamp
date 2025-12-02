/**
 * Matching Analytics Dashboard
 *
 * Zeigt Statistiken und Metriken zum Matching-System:
 * - KPI-Karten (Pending, Imported, Skipped, Rejected)
 * - Score-Verteilung
 * - Top-Organisationen
 * - Letzter Scan Status
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChartBarIcon,
  ClockIcon,
  BuildingOfficeIcon,
  TrophyIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { matchingService } from '@/lib/firebase/matching-service';
import type { MatchingCandidate, MatchingScanJob } from '@/types/matching';

interface AnalyticsData {
  total: number;
  byStatus: {
    pending: number;
    imported: number;
    skipped: number;
    rejected: number;
  };
  byScore: {
    '90-100': number;
    '80-89': number;
    '70-79': number;
    '60-69': number;
    '50-59': number;
    '<50': number;
  };
  topOrganizations: Array<{
    organizationId: string;
    organizationName: string;
    count: number;
  }>;
  lastScan: MatchingScanJob | null;
  averageScore: number;
}

export default function MatchingAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  /**
   * Lädt Analytics-Daten
   */
  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Alle Kandidaten laden (ohne Filter, Standard-Sortierung, hohes Limit)
      const candidates = await matchingService.getCandidates(
        undefined,
        undefined,
        { limit: 1000, offset: 0 }
      );

      // Statistiken berechnen
      const byStatus = {
        pending: 0,
        imported: 0,
        skipped: 0,
        rejected: 0
      };

      const byScore = {
        '90-100': 0,
        '80-89': 0,
        '70-79': 0,
        '60-69': 0,
        '50-59': 0,
        '<50': 0
      };

      let totalScore = 0;
      const orgCounts = new Map<string, { name: string; count: number }>();

      candidates.forEach(candidate => {
        // Status
        byStatus[candidate.status]++;

        // Score
        totalScore += candidate.score;
        if (candidate.score >= 90) byScore['90-100']++;
        else if (candidate.score >= 80) byScore['80-89']++;
        else if (candidate.score >= 70) byScore['70-79']++;
        else if (candidate.score >= 60) byScore['60-69']++;
        else if (candidate.score >= 50) byScore['50-59']++;
        else byScore['<50']++;

        // Organisationen
        candidate.variants.forEach(variant => {
          const existing = orgCounts.get(variant.organizationId);
          if (existing) {
            existing.count++;
          } else {
            orgCounts.set(variant.organizationId, {
              name: variant.organizationName,
              count: 1
            });
          }
        });
      });

      // Top Organisationen
      const topOrganizations = Array.from(orgCounts.entries())
        .map(([id, data]) => ({
          organizationId: id,
          organizationName: data.name,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Letzter Scan
      const lastScan = await matchingService.getLastScanJob();

      setAnalytics({
        total: candidates.length,
        byStatus,
        byScore,
        topOrganizations,
        lastScan,
        averageScore: candidates.length > 0 ? Math.round(totalScore / candidates.length) : 0
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ArrowPathIcon className="size-12 text-zinc-400 animate-spin mx-auto" />
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Lade Analytics...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Keine Daten verfügbar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Matching Analytics
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Statistiken und Metriken zum Matching-System
        </p>
      </div>

      {/* Status KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Gesamt
          </div>
          <div className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
            {analytics.total}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Pending
          </div>
          <div className="mt-1 text-2xl font-semibold text-yellow-600">
            {analytics.byStatus.pending}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {analytics.total > 0
              ? Math.round((analytics.byStatus.pending / analytics.total) * 100)
              : 0}%
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Importiert
          </div>
          <div className="mt-1 text-2xl font-semibold text-green-600">
            {analytics.byStatus.imported}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {analytics.total > 0
              ? Math.round((analytics.byStatus.imported / analytics.total) * 100)
              : 0}%
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Übersprungen
          </div>
          <div className="mt-1 text-2xl font-semibold text-zinc-500">
            {analytics.byStatus.skipped}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {analytics.total > 0
              ? Math.round((analytics.byStatus.skipped / analytics.total) * 100)
              : 0}%
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Abgelehnt
          </div>
          <div className="mt-1 text-2xl font-semibold text-red-600">
            {analytics.byStatus.rejected}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {analytics.total > 0
              ? Math.round((analytics.byStatus.rejected / analytics.total) * 100)
              : 0}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Score Distribution */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="size-5 text-zinc-500" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Score-Verteilung
            </h2>
          </div>

          <div className="space-y-3">
            {Object.entries(analytics.byScore).map(([range, count]) => {
              const percentage = analytics.total > 0
                ? Math.round((count / analytics.total) * 100)
                : 0;

              return (
                <div key={range}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {range} Punkte
                    </span>
                    <span className="text-sm text-zinc-500">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Durchschnittlicher Score
            </div>
            <div className="text-2xl font-semibold text-zinc-900 dark:text-white">
              {analytics.averageScore} / 100
            </div>
          </div>
        </div>

        {/* Top Organizations */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrophyIcon className="size-5 text-zinc-500" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Top Organisationen
            </h2>
          </div>

          <div className="space-y-3">
            {analytics.topOrganizations.slice(0, 10).map((org, index) => (
              <div
                key={org.organizationId}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`
                    flex-shrink-0 size-6 rounded-full flex items-center justify-center text-xs font-semibold
                    ${index === 0 ? 'bg-yellow-500 text-white' : ''}
                    ${index === 1 ? 'bg-zinc-400 text-white' : ''}
                    ${index === 2 ? 'bg-orange-600 text-white' : ''}
                    ${index > 2 ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400' : ''}
                  `}>
                    {index + 1}
                  </div>
                  <BuildingOfficeIcon className="size-4 text-zinc-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                    {org.organizationName}
                  </span>
                </div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-white ml-2">
                  {org.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Last Scan Info */}
      {analytics.lastScan && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="size-5 text-zinc-500" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Letzter Scan
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                Status
              </div>
              <div className="mt-1">
                <span className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${analytics.lastScan.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                  ${analytics.lastScan.status === 'running' ? 'bg-blue-100 text-blue-800' : ''}
                  ${analytics.lastScan.status === 'failed' ? 'bg-red-100 text-red-800' : ''}
                `}>
                  {analytics.lastScan.status}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                Kandidaten erstellt
              </div>
              <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
                {analytics.lastScan.stats?.candidatesCreated || 0}
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                Kandidaten aktualisiert
              </div>
              <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
                {analytics.lastScan.stats?.candidatesUpdated || 0}
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                Dauer
              </div>
              <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
                {analytics.lastScan.duration
                  ? `${Math.round(analytics.lastScan.duration / 1000)}s`
                  : '—'}
              </div>
            </div>
          </div>

          {analytics.lastScan.startedAt && (
            <div className="mt-4 text-xs text-zinc-500">
              Gestartet: {new Date(analytics.lastScan.startedAt.toDate()).toLocaleString('de-DE')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
