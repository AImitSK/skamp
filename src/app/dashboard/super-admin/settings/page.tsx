/**
 * SuperAdmin Settings Seite
 *
 * Dashboard für SuperAdmin mit:
 * - Links zu allen SuperAdmin-Features
 * - Matching System Verwaltung
 * - Test-Daten Management
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// TODO: Tabs functionality temporarily removed due to import issues
// import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  BeakerIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { matchingService } from '@/lib/firebase/matching-service';
import type { MatchingScanJob } from '@/types/matching';
import MatchingTestSection from './MatchingTestSection';
import ConflictReviewSection from './ConflictReviewSection';

export default function SuperAdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<MatchingScanJob | null>(null);

  /**
   * Lädt letzten Scan-Job
   */
  const loadLastScan = async () => {
    try {
      const job = await matchingService.getLastScanJob();
      setLastScan(job);
    } catch (error) {
      console.error('Error loading last scan:', error);
    }
  };

  useEffect(() => {
    loadLastScan();
  }, []);

  /**
   * Test-Daten Funktionalität entfernt - wurde durch das neue Intelligent Matching System ersetzt
   */
  const handleSeedTestData = async () => {
    toast.error('Test-Daten Funktionalität wurde entfernt. Verwende das neue Intelligent Matching System.');
  };

  const handleCleanupTestData = async () => {
    toast.error('Test-Daten Funktionalität wurde entfernt. Verwende das neue Intelligent Matching System.');
  };

  /**
   * Triggert Matching-Scan (direkt via Client SDK)
   */
  const handleTriggerScan = async () => {
    const toastId = toast.loading('Starte Matching-Scan...');
    setLoading(true);

    try {
      const job = await matchingService.scanForCandidates({
        developmentMode: false
      });

      toast.success(
        `Scan abgeschlossen! ${job.stats?.candidatesCreated || 0} neue, ${job.stats?.candidatesUpdated || 0} aktualisierte Kandidaten`,
        { id: toastId, duration: 5000 }
      );
      await loadLastScan();
    } catch (error) {
      console.error('Scan failed:', error);
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          SuperAdmin Einstellungen
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Verwaltung und Test-Tools für SuperAdmin-Features
        </p>
      </div>

      {/* Matching System Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <UsersIcon className="size-5" />
          Matching System
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Navigation Cards */}
          <div className="space-y-4">
            <button
              onClick={() => router.push('/dashboard/super-admin/matching/candidates')}
              className="w-full p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500 transition-colors text-left"
            >
              <div className="flex items-start justify-between mb-2">
                <UsersIcon className="size-6 text-blue-600" />
                <span className="text-xs text-zinc-500">→</span>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                Matching-Kandidaten
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Journalisten reviewen die von mehreren Organisationen erfasst wurden
              </p>
            </button>

            <button
              onClick={() => router.push('/dashboard/super-admin/matching/analytics')}
              className="w-full p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500 transition-colors text-left"
            >
              <div className="flex items-start justify-between mb-2">
                <ChartBarIcon className="size-6 text-blue-600" />
                <span className="text-xs text-zinc-500">→</span>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                Analytics Dashboard
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Statistiken, Metriken und Score-Verteilung
              </p>
            </button>
          </div>

          {/* Status & Actions */}
          <div className="space-y-4">
            {/* Last Scan Status */}
            {lastScan && (
              <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-2 mb-3">
                  <ClockIcon className="size-5 text-zinc-500" />
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    Letzter Scan
                  </h3>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Status:</span>
                    <span className={`
                      inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
                      ${lastScan.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                      ${lastScan.status === 'running' ? 'bg-blue-100 text-blue-800' : ''}
                      ${lastScan.status === 'failed' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {lastScan.status === 'completed' && <CheckCircleIcon className="size-3" />}
                      {lastScan.status === 'failed' && <ExclamationCircleIcon className="size-3" />}
                      {lastScan.status}
                    </span>
                  </div>

                  {lastScan.stats && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Erstellt:</span>
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {lastScan.stats.candidatesCreated || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Aktualisiert:</span>
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {lastScan.stats.candidatesUpdated || 0}
                        </span>
                      </div>
                    </>
                  )}

                  {lastScan.startedAt && (
                    <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      {new Date(lastScan.startedAt.toDate()).toLocaleString('de-DE')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manual Scan Button */}
            <Button
              color="blue"
              onClick={handleTriggerScan}
              disabled={loading}
              className="w-full"
            >
              <ArrowPathIcon className={`size-5 ${loading ? 'animate-spin' : ''}`} />
              Scan jetzt ausführen
            </Button>
          </div>
        </div>
      </div>

      {/* Intelligent Matching Tools */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <BeakerIcon className="size-5" />
          Intelligent Matching System
        </h2>

        <div className="space-y-6">
          {/* Matching Tests Section */}
          <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
              Matching Algorithm Tests
            </h3>
            <MatchingTestSection />
          </div>

          {/* Conflict Review Section */}
          <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
              Conflict Review
            </h3>
            <ConflictReviewSection />
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="text-xs text-zinc-500 pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Cog6ToothIcon className="size-4" />
          <span>SuperAdmin Dashboard v1.0</span>
        </div>
      </div>
    </div>
  );
}
