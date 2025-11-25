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
  ExclamationCircleIcon,
  SparklesIcon,
  NewspaperIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';
import { matchingService } from '@/lib/firebase/matching-service';
import { matchingSettingsService } from '@/lib/firebase/matching-settings-service';
import { useAuth } from '@/hooks/useAuth';
import type { MatchingScanJob } from '@/types/matching';
import type { AutoScanInterval } from '@/types/matching-settings';
import MatchingTestSection from './MatchingTestSection';
import ConflictReviewSection from './ConflictReviewSection';
import ClippingTestSection from './ClippingTestSection';

export default function SuperAdminSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<MatchingScanJob | null>(null);

  // Global Settings
  const [useAiMerge, setUseAiMerge] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const [autoScanInterval, setAutoScanInterval] = useState<AutoScanInterval>('weekly');
  const [autoImportEnabled, setAutoImportEnabled] = useState(false);
  const [autoImportScore, setAutoImportScore] = useState(60);

  /**
   * Lädt globale Settings
   */
  const loadSettings = async () => {
    try {
      const settings = await matchingSettingsService.getSettings();
      setUseAiMerge(settings.useAiMerge);
      setAutoScanEnabled(settings.autoScan.enabled);
      setAutoScanInterval(settings.autoScan.interval);
      setAutoImportEnabled(settings.autoImport.enabled);
      setAutoImportScore(settings.autoImport.minScore);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

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
    loadSettings();
    loadLastScan();
  }, []);


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
      // Führe direkt im Browser aus (nicht über API Route) wegen Firebase Auth
      const { seedRealisticTestData } = await import('@/lib/matching/seed-realistic-test-data');
      const stats = await seedRealisticTestData();

      const totalScenarios = Object.values(stats.scenarios || {}).reduce((a: number, b: number) => a + b, 0);
      toast.success(
        `Realistische Test-Daten erstellt! ${stats.organizations} Orgs, ${stats.companies} Companies, ${stats.publications} Publications, ${stats.contacts} Kontakte → ${totalScenarios} Szenarien`,
        { id: toastId, duration: 10000 }
      );
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
      // Führe direkt im Browser aus (nicht über API Route) wegen Firebase Auth
      const { cleanupRealisticTestData } = await import('@/lib/matching/seed-realistic-test-data');
      await cleanupRealisticTestData();

      toast.success('Realistische Test-Daten gelöscht!', { id: toastId, duration: 5000 });
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
   * Toggle AI-Merge
   */
  const handleAiMergeToggle = async (enabled: boolean) => {
    if (!user) return;

    try {
      setUseAiMerge(enabled);
      await matchingSettingsService.updateAiMerge(enabled, user.uid);
      toast.success(enabled ? 'KI-Daten-Merge aktiviert' : 'KI-Daten-Merge deaktiviert');
    } catch (error) {
      console.error('Error updating AI merge setting:', error);
      toast.error('Fehler beim Speichern der Einstellung');
      setUseAiMerge(!enabled); // Rollback
    }
  };

  /**
   * Toggle Auto-Scan
   */
  const handleAutoScanToggle = async (enabled: boolean) => {
    if (!user) return;

    try {
      setAutoScanEnabled(enabled);
      await matchingSettingsService.updateAutoScan(enabled, autoScanInterval, user.uid);
      toast.success(enabled ? 'Automatischer Scan aktiviert' : 'Automatischer Scan deaktiviert');
    } catch (error) {
      console.error('Error updating auto scan setting:', error);
      toast.error('Fehler beim Speichern der Einstellung');
      setAutoScanEnabled(!enabled); // Rollback
    }
  };

  /**
   * Ändere Auto-Scan Intervall
   */
  const handleIntervalChange = async (interval: AutoScanInterval) => {
    if (!user) return;

    try {
      setAutoScanInterval(interval);
      await matchingSettingsService.updateAutoScan(autoScanEnabled, interval, user.uid);
      toast.success(`Intervall auf "${interval}" geändert`);
    } catch (error) {
      console.error('Error updating auto scan interval:', error);
      toast.error('Fehler beim Speichern der Einstellung');
    }
  };

  /**
   * Toggle Auto-Import
   */
  const handleAutoImportToggle = async (enabled: boolean) => {
    if (!user) return;

    try {
      setAutoImportEnabled(enabled);
      await matchingSettingsService.updateAutoImport(enabled, autoImportScore, user.uid);
      toast.success(enabled ? 'Automatischer Import aktiviert' : 'Automatischer Import deaktiviert');
    } catch (error) {
      console.error('Error updating auto import setting:', error);
      toast.error('Fehler beim Speichern der Einstellung');
      setAutoImportEnabled(!enabled); // Rollback
    }
  };

  /**
   * Ändere Auto-Import Score
   */
  const handleScoreChange = async (score: number) => {
    if (!user) return;

    try {
      setAutoImportScore(score);
      await matchingSettingsService.updateAutoImport(autoImportEnabled, score, user.uid);
      toast.success(`Score-Schwellwert auf ${score} geändert`);
    } catch (error) {
      console.error('Error updating auto import score:', error);
      toast.error('Fehler beim Speichern der Einstellung');
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

      {/* Globale Einstellungen Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <Cog6ToothIcon className="size-5" />
          Globale Einstellungen
        </h2>

        <div className="space-y-4">
          {/* AI-Merge Toggle */}
          <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <SparklesIcon className="size-5 text-blue-600" />
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                    KI-Daten-Merge
                  </h3>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 ml-8">
                  Nutzt Gemini 2.0 Flash zum intelligenten Zusammenführen von Varianten beim Import.
                  Kombiniert automatisch Name, E-Mails, Telefone, Position, Beats und Publications.
                </p>
              </div>
              <div className="ml-4">
                <SimpleSwitch
                  checked={useAiMerge}
                  onChange={handleAiMergeToggle}
                />
              </div>
            </div>
          </div>

          {/* Auto-Scan Toggle */}
          <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <ArrowPathIcon className="size-5 text-green-600" />
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                    Automatischer Matching-Scan
                  </h3>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 ml-8">
                  Führt automatisch Scans durch um neue Matching-Kandidaten zu finden.
                </p>
              </div>
              <div className="ml-4">
                <SimpleSwitch
                  checked={autoScanEnabled}
                  onChange={handleAutoScanToggle}
                />
              </div>
            </div>

            {/* Intervall-Auswahl */}
            {autoScanEnabled && (
              <div className="ml-8 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Scan-Intervall
                </label>
                <select
                  value={autoScanInterval}
                  onChange={(e) => handleIntervalChange(e.target.value as AutoScanInterval)}
                  className="block w-full max-w-xs px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="daily">Täglich (02:00 Uhr)</option>
                  <option value="weekly">Wöchentlich (02:00 Uhr)</option>
                  <option value="monthly">Monatlich (01. des Monats, 02:00 Uhr)</option>
                </select>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  ⏱️ Nächster Scan: {autoScanEnabled ? 'In Planung...' : 'Deaktiviert'}
                </p>
              </div>
            )}
          </div>

          {/* Auto-Import Toggle */}
          <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircleIcon className="size-5 text-purple-600" />
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                    Automatischer Import
                  </h3>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 ml-8">
                  Importiert Kandidaten automatisch wenn sie den Score-Schwellwert erreichen. Läuft täglich um 04:00 Uhr (1h nach dem Scan).
                </p>
              </div>
              <div className="ml-4">
                <SimpleSwitch
                  checked={autoImportEnabled}
                  onChange={handleAutoImportToggle}
                />
              </div>
            </div>

            {/* Score Threshold Slider */}
            {autoImportEnabled && (
              <div className="ml-8 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  Score-Schwellwert: <span className="text-purple-600 font-semibold">{autoImportScore}</span> / 100
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={autoImportScore}
                  onChange={(e) => handleScoreChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-purple-600"
                />
                <div className="mt-2 flex justify-between text-xs text-zinc-500">
                  <span>0 (alle)</span>
                  <span>50</span>
                  <span>100 (nur perfekte)</span>
                </div>
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  💡 Kandidaten mit Score ≥ {autoImportScore} werden automatisch importiert.
                  {useAiMerge ? ' Mit KI-Merge aktiviert.' : ' Erste Variante wird verwendet.'}
                </p>
              </div>
            )}
          </div>
        </div>
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

          {/* Realistic Test Data Tools - NEW */}
          <div className="p-6 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
            <div className="flex items-start gap-3 mb-4">
              <BeakerIcon className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
                  🎯 Realistische Test-Daten (Matching-System Testing)
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

      {/* Clipping-System Tests Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <NewspaperIcon className="size-5" />
          Clipping-System Tests
        </h2>

        <div className="p-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Test-Tools für Keyword-Extraktion, Match-Score Berechnung und Test-Daten Generierung.
          </p>
          <ClippingTestSection />
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
