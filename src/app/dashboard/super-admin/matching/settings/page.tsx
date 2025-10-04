/**
 * Matching System Settings (SuperAdmin Only)
 *
 * Globale Einstellungen für:
 * - KI-Daten-Merge beim Import
 * - Automatischer Scan
 * - Automatischer Import (mit Score-Threshold)
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { matchingSettingsService } from '@/lib/firebase/matching-settings-service';
import { MatchingGlobalSettings } from '@/types/matching-settings';
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function MatchingSettingsPage() {
  const { user } = useAuth();

  // State
  const [settings, setSettings] = useState<MatchingGlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [useAiMerge, setUseAiMerge] = useState(false);
  const [autoImportEnabled, setAutoImportEnabled] = useState(false);
  const [autoImportScore, setAutoImportScore] = useState(60);

  /**
   * Lädt Settings
   */
  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await matchingSettingsService.getSettings();
      setSettings(data);

      // Sync Form State
      setUseAiMerge(data.useAiMerge);
      setAutoImportEnabled(data.autoImport.enabled);
      setAutoImportScore(data.autoImport.minScore);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Speichert Einstellungen
   */
  const handleSave = async () => {
    if (!user?.id) {
      toast.error('Nicht authentifiziert');
      return;
    }

    const toastId = toast.loading('Speichere Einstellungen...');

    try {
      setSaving(true);

      // AI-Merge Update
      await matchingSettingsService.updateAiMerge(useAiMerge, user.id);

      // Auto-Import Update
      await matchingSettingsService.updateAutoImport(
        autoImportEnabled,
        autoImportScore,
        user.id
      );

      // Reload Settings
      await loadSettings();

      toast.success('Einstellungen gespeichert!', { id: toastId });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(
        `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        { id: toastId }
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Initial Load
   */
  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * Prüft ob Änderungen vorhanden
   */
  const hasChanges = () => {
    if (!settings) return false;

    return (
      useAiMerge !== settings.useAiMerge ||
      autoImportEnabled !== settings.autoImport.enabled ||
      autoImportScore !== settings.autoImport.minScore
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="size-8 text-zinc-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          Matching System Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Globale Einstellungen für das automatische Matching & Import System
        </p>
      </div>

      {/* Settings Form */}
      <div className="space-y-6">
        {/* KI-Daten-Merge Setting */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                🤖 KI-Daten-Merge
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Verwendet Gemini AI um die beste Variante aus mehreren Kontakt-Versionen
                automatisch zu ermitteln und zusammenzuführen.
              </p>
              <div className="mt-3 space-y-1 text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <CheckIcon className="size-3" />
                  <span>Intelligente Daten-Aggregation aus allen Varianten</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon className="size-3" />
                  <span>Automatische Erkennung der vollständigsten Daten</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon className="size-3" />
                  <span>Vermeidung von manuellen Merge-Entscheidungen</span>
                </div>
              </div>
            </div>
            <div className="ml-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAiMerge}
                  onChange={(e) => setUseAiMerge(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Auto-Import Setting */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                  ⚡ Automatischer Import
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Importiert Kandidaten automatisch wenn sie den konfigurierten Score-Schwellwert
                  erreichen. Läuft täglich um 04:00 Uhr.
                </p>
              </div>
              <div className="ml-6">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoImportEnabled}
                    onChange={(e) => setAutoImportEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Score Threshold Slider */}
            {autoImportEnabled && (
              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  Score-Schwellwert: <span className="text-blue-600 font-semibold">{autoImportScore}</span> / 100
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={autoImportScore}
                  onChange={(e) => setAutoImportScore(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700 accent-blue-600"
                />
                <div className="mt-2 flex justify-between text-xs text-zinc-500">
                  <span>0 (alle)</span>
                  <span>50</span>
                  <span>100 (nur perfekte)</span>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  Kandidaten mit einem Score ab <strong>{autoImportScore}</strong> werden
                  automatisch importiert. Je höher der Wert, desto selektiver der Import.
                </p>
              </div>
            )}

            {/* Status Info */}
            {settings?.autoImport.nextRun && autoImportEnabled && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Nächster Auto-Import:{' '}
                  <strong>
                    {new Date(settings.autoImport.nextRun).toLocaleString('de-DE')}
                  </strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500">
            {settings?.updatedAt && (
              <span>
                Zuletzt aktualisiert:{' '}
                {new Date(settings.updatedAt).toLocaleString('de-DE')}
              </span>
            )}
          </div>
          <Button
            color="blue"
            onClick={handleSave}
            disabled={!hasChanges() || saving}
          >
            {saving ? (
              <>
                <ArrowPathIcon className="size-5 animate-spin" />
                Speichere...
              </>
            ) : (
              <>
                <CheckIcon className="size-5" />
                Einstellungen speichern
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-6">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">
          ℹ️ Wichtige Hinweise
        </h3>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>
              Der <strong>automatische Scan</strong> läuft täglich um 03:00 Uhr und findet neue Kandidaten
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>
              Der <strong>automatische Import</strong> läuft täglich um 04:00 Uhr (1h nach dem Scan)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>
              Beim Auto-Import wird {useAiMerge ? <strong>KI-Merge verwendet</strong> : 'die erste Variante gewählt'}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>
              Empfohlener Score-Schwellwert: <strong>60-70</strong> für gute Balance zwischen
              Automatisierung und Qualität
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
