/**
 * Matching-Kandidaten Liste (SuperAdmin Only)
 *
 * Zeigt alle Matching-Kandidaten (Journalisten die von 2+ Orgs erfasst wurden)
 * - Tabelle mit Filtern & Sortierung
 * - Score-Anzeige
 * - Status-Management
 * - Manueller Scan-Trigger
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { matchingService } from '@/lib/firebase/matching-service';
import {
  MatchingCandidate,
  MatchingCandidateFilters,
  MatchingCandidateSorting,
  MATCHING_STATUS_LABELS,
  MATCHING_STATUS_COLORS,
  MATCHING_DEFAULTS
} from '@/types/matching';
import CandidatesTable from './CandidatesTable';
import CandidateFilters from './CandidateFilters';

export default function MatchingCandidatesPage() {
  const router = useRouter();

  // State
  const [candidates, setCandidates] = useState<MatchingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Filters
  const [filters, setFilters] = useState<MatchingCandidateFilters>({
    status: ['pending'],
    minScore: MATCHING_DEFAULTS.MIN_SCORE
  });

  // Sorting
  const [sorting, setSorting] = useState<MatchingCandidateSorting>({
    field: 'score',
    direction: 'desc'
  });

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Development Mode
  const [devMode, setDevMode] = useState(
    process.env.NODE_ENV === 'development'
  );

  // Statistics
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    imported: number;
    skipped: number;
    rejected: number;
  }>({
    total: 0,
    pending: 0,
    imported: 0,
    skipped: 0,
    rejected: 0
  });

  /**
   * Lädt Kandidaten
   */
  const loadCandidates = async () => {
    try {
      setLoading(true);

      const appliedFilters = {
        ...filters,
        searchQuery: searchQuery || undefined
      };

      const results = await matchingService.getCandidates(
        appliedFilters,
        sorting,
        { limit: 100, offset: 0 }
      );

      setCandidates(results);

      // Statistiken berechnen
      const statusCounts = results.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setStats({
        total: results.length,
        pending: statusCounts.pending || 0,
        imported: statusCounts.imported || 0,
        skipped: statusCounts.skipped || 0,
        rejected: statusCounts.rejected || 0
      });
    } catch (error) {
      console.error('Error loading candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Führt Scan aus
   */
  const handleScan = async () => {
    try {
      setScanning(true);

      await matchingService.scanForCandidates({
        developmentMode: devMode,
        minScore: devMode ? MATCHING_DEFAULTS.DEV_MIN_SCORE : MATCHING_DEFAULTS.MIN_SCORE,
        minOrganizations: devMode ? MATCHING_DEFAULTS.DEV_MIN_ORGANIZATIONS : MATCHING_DEFAULTS.MIN_ORGANIZATIONS
      });

      // Reload nach Scan
      await loadCandidates();
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Scan fehlgeschlagen: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setScanning(false);
    }
  };

  /**
   * Initial Load
   */
  useEffect(() => {
    loadCandidates();
  }, [filters, sorting]);

  /**
   * Search mit Debounce
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== (filters.searchQuery || '')) {
        loadCandidates();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Matching-Kandidaten
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Journalisten die von mehreren Organisationen erfasst wurden
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Gesamt
          </div>
          <div className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
            {stats.total}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Pending
          </div>
          <div className="mt-1 text-2xl font-semibold text-yellow-600">
            {stats.pending}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Importiert
          </div>
          <div className="mt-1 text-2xl font-semibold text-green-600">
            {stats.imported}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Übersprungen
          </div>
          <div className="mt-1 text-2xl font-semibold text-zinc-500">
            {stats.skipped}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Abgelehnt
          </div>
          <div className="mt-1 text-2xl font-semibold text-red-600">
            {stats.rejected}
          </div>
        </div>
      </div>

      {/* Compact Toolbar */}
      <div className="mb-6">
        <CandidateFilters
          filters={filters}
          onFiltersChange={setFilters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          devMode={devMode}
          onDevModeChange={setDevMode}
          scanning={scanning}
          onScan={handleScan}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CandidatesTable
          candidates={candidates}
          loading={loading}
          sorting={sorting}
          onSortingChange={setSorting}
          onRefresh={loadCandidates}
        />
      </div>

      {/* Empty State */}
      {!loading && candidates.length === 0 && (
        <div className="mt-8 text-center">
          <MagnifyingGlassIcon className="mx-auto size-12 text-zinc-400" />
          <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">
            Keine Kandidaten gefunden
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {filters.status && filters.status.length > 0
              ? 'Versuche andere Filter oder führe einen neuen Scan aus.'
              : 'Führe einen Scan aus, um Kandidaten zu finden.'}
          </p>
          {filters.status?.length === 1 && filters.status[0] === 'pending' && (
            <div className="mt-6">
              <Button color="blue" onClick={handleScan}>
                <ArrowPathIcon className="size-4" />
                Jetzt scannen
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
