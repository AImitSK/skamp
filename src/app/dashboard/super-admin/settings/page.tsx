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
   * Erstellt Test-Daten für das Intelligent Matching System
   */
  const handleSeedTestData = async () => {
    if (!confirm('Test-Daten erstellen? Dies erstellt 3 Test-Organisationen und 6 Test-Kontakte für das Intelligent Matching System.')) {
      return;
    }

    const toastId = toast.loading('Erstelle Test-Daten...');
    setLoading(true);

    try {
      const { seedTestData } = await import('@/lib/matching/seed-test-data');
      const result = await seedTestData();

      toast.success(
        `Test-Daten erstellt! ${result.organizations} Orgs, ${result.contacts} Kontakte`,
        { id: toastId, duration: 5000 }
      );
    } catch (error) {
      console.error('Seed failed:', error);
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Löscht Test-Daten
   */
  const handleCleanupTestData = async () => {
    if (!confirm('Test-Daten löschen? Dies entfernt alle Test-Organisationen, Kontakte und Matching-Kandidaten.')) {
      return;
    }

    const toastId = toast.loading('Lösche Test-Daten...');
    setLoading(true);

    try {
      const { cleanupTestData } = await import('@/lib/matching/cleanup-test-data');
      const result = await cleanupTestData();

      toast.success(
        `Test-Daten gelöscht! ${result.organizations} Orgs, ${result.contacts} Kontakte, ${result.candidates || 0} Kandidaten`,
        { id: toastId, duration: 5000 }
      );
      await loadLastScan(); // Refresh scan status
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Erstellt massive Test-Daten (350+ Journalisten)
   */
  const handleSeedMassiveTestData = async () => {
    if (!confirm('Massive Test-Daten erstellen? Dies erstellt 35+ Companies, 60+ Publications und 350+ Journalisten für realistisches Testing.')) {
      return;
    }

    const toastId = toast.loading('Erstelle massive Test-Daten... Dies kann 30-60 Sekunden dauern.');
    setLoading(true);

    try {
      const response = await fetch('/api/matching/seed-massive', { method: 'POST' });
      const result = await response.json();

      if (result.success) {
        toast.success(
          `Massive Test-Daten erstellt! ${result.stats.companies} Companies, ${result.stats.publications} Publications, ${result.stats.contacts}+ Journalisten`,
          { id: toastId, duration: 8000 }
        );
      } else {
        throw new Error(result.error || 'Unbekannter Fehler');
      }
    } catch (error) {
      console.error('Massive seed failed:', error);
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Erstellt realistische Test-Daten (200+ Szenarien)
   */
  const handleSeedRealisticTestData = async () => {
    if (!confirm('Realistische Test-Daten erstellen? Dies erstellt 10 Organisationen mit 200+ Test-Szenarien für umfassendes Matching-Testing.')) {
      return;
    }

    const toastId = toast.loading('Erstelle realistische Test-Daten... Dies kann 60-90 Sekunden dauern.');
    setLoading(true);

    try {
      const response = await fetch('/api/matching/seed-realistic', { method: 'POST' });
      const result = await response.json();

      if (result.success) {
        toast.success(
          `Realistische Test-Daten erstellt! ${result.stats.organizations} Orgs, ${result.stats.contacts} Kontakte für Matching-Tests`,
          { id: toastId, duration: 8000 }
        );
      } else {
        throw new Error(result.error || 'Unbekannter Fehler');
      }
    } catch (error) {
      console.error('Realistic seed failed:', error);
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Löscht realistische Test-Daten
   */
  const handleCleanupRealisticTestData = async () => {
    if (!confirm('Realistische Test-Daten löschen? Dies entfernt alle Test-Organisationen, Companies, Publications und Kontakte.')) {
      return;
    }

    const toastId = toast.loading('Lösche realistische Test-Daten...');
    setLoading(true);

    try {
      const response = await fetch('/api/matching/seed-realistic', { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        toast.success('Realistische Test-Daten gelöscht!', { id: toastId, duration: 5000 });
      } else {
        throw new Error(result.error || 'Unbekannter Fehler');
      }
    } catch (error) {
      console.error('Realistic cleanup failed:', error);
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Löscht massive Test-Daten
   */
  const handleCleanupMassiveTestData = async () => {
    if (!confirm('Massive Test-Daten löschen? Dies entfernt alle Test-Companies, Publications und Journalisten.')) {
      return;
    }

    const toastId = toast.loading('Lösche massive Test-Daten...');
    setLoading(true);

    try {
      const response = await fetch('/api/matching/seed-massive', { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        toast.success(
          `Massive Test-Daten gelöscht! ${result.deletedCount} Einträge entfernt`,
          { id: toastId, duration: 5000 }
        );
      } else {
        throw new Error(result.error || 'Unbekannter Fehler');
      }
    } catch (error) {
      console.error('Massive cleanup failed:', error);
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
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
          {/* Massive Test Data Tools - PREMIUM DATABASE */}
          <div className="p-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10">
            <div className="flex items-start gap-3 mb-4">
              <UsersIcon className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
                  Massive Test-Daten (Premium-Datenbank)
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    350+ Journalisten
                  </span>
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Erstellt realistische Test-Daten für die Premium-Datenbank:<br/>
                  <strong>35+ Companies, 60+ Publications, 350+ Journalisten</strong> mit vollständigen Profilen.
                  Erscheint automatisch unter "Redakteure" und kann per Quick-Import importiert werden.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    color="blue"
                    onClick={handleSeedMassiveTestData}
                    disabled={loading}
                    className="flex-1"
                  >
                    <UsersIcon className="size-4" />
                    Massive Test-Daten erstellen
                  </Button>

                  <Button
                    color="light"
                    onClick={handleCleanupMassiveTestData}
                    disabled={loading}
                    className="flex-1"
                  >
                    <TrashIcon className="size-4" />
                    Massive Test-Daten löschen
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-xs text-zinc-600 dark:text-zinc-400 border-t border-blue-200 dark:border-blue-800 pt-3">
              <strong>📊 Enthält:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>35+ Medien-Companies (Spiegel, Zeit, FAZ, etc.)</li>
                <li>60+ Publications (Zeitungen, Magazine, Online-Portale)</li>
                <li>350+ Journalisten mit vollständigen Profilen und Publications</li>
                <li>Automatische Duplikate für Matching-Tests (~15%)</li>
              </ul>
            </div>
          </div>

          {/* Realistic Test Data Tools - NEW */}
          <div className="p-6 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
            <div className="flex items-start gap-3 mb-4">
              <BeakerIcon className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
                  🎯 Realistische Test-Daten (Matching-System Testing)
                  <span className="px-2 py-0.5 text-xs font-semibold bg-green-600 text-white rounded-full">
                    NEU
                  </span>
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Erstellt <strong>200+ Test-Szenarien</strong> über <strong>10 Organisationen</strong> für umfassendes Matching-Testing.
                  Simuliert alle Matching-Szenarien: Perfect Matches, Fuzzy Matches, Konflikte, Edge Cases.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    color="green"
                    onClick={handleSeedRealisticTestData}
                    disabled={loading}
                    className="flex-1"
                  >
                    <UsersIcon className="size-4" />
                    Realistische Test-Daten erstellen
                  </Button>

                  <Button
                    color="light"
                    onClick={handleCleanupRealisticTestData}
                    disabled={loading}
                    className="flex-1"
                  >
                    <TrashIcon className="size-4" />
                    Realistische Test-Daten löschen
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-xs text-zinc-600 dark:text-zinc-400 border-t border-green-200 dark:border-green-800 pt-3">
              <strong>📊 5 Test-Kategorien (200+ Szenarien):</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li><strong>Category A:</strong> 50 Perfect Matches (Spiegel, FAZ, Zeit, etc.)</li>
                <li><strong>Category B:</strong> 50 Fuzzy Matches (DPA, Focus, WirtschaftsWoche)</li>
                <li><strong>Category C:</strong> 30 Create New (Tech-Blogger, Nischen-Medien)</li>
                <li><strong>Category D:</strong> 40 Conflicts (Super/Medium Majority, Keep Existing)</li>
                <li><strong>Category E:</strong> 30 Edge Cases (Freie Journalisten, Abkürzungen, AI-Merge)</li>
              </ul>
              <div className="mt-2 text-zinc-500">
                📈 Total: 10 Organisationen, 150+ Companies, 200+ Publications, 450+ Kontakte
              </div>
            </div>
          </div>

          {/* Small Test Data Tools */}
          <div className="p-6 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10">
            <div className="flex items-start gap-3 mb-4">
              <BeakerIcon className="size-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                  Klein Test-Daten (Matching-Tests)
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Erstellt 3 Test-Organisationen und 6 Journalisten-Kontakte zum Testen des
                  Intelligent Matching Systems. Nach dem Erstellen einen Scan ausführen um Kandidaten zu generieren.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    color="light"
                    onClick={handleSeedTestData}
                    disabled={loading}
                    className="flex-1"
                  >
                    <BeakerIcon className="size-4" />
                    Test-Daten erstellen
                  </Button>

                  <Button
                    color="light"
                    onClick={handleCleanupTestData}
                    disabled={loading}
                    className="flex-1"
                  >
                    <TrashIcon className="size-4" />
                    Test-Daten löschen
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-xs text-zinc-600 dark:text-zinc-400 border-t border-orange-200 dark:border-orange-800 pt-3">
              <strong>Erwartete Kandidaten nach Scan:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Max Müller (3 Varianten, Score ~85-95) → <strong>Automatic Match</strong></li>
                <li>Anna Schmidt (2 Varianten, Score ~70-80) → <strong>Good Match</strong></li>
                <li>Peter Weber (1 Variante) → <strong>Kein Match</strong></li>
              </ul>
            </div>
          </div>

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
