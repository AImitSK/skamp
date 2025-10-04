/**
 * Matching System Global Settings
 */

export type AutoScanInterval = 'daily' | 'weekly' | 'monthly' | 'disabled';

export interface MatchingGlobalSettings {
  // KI-Daten-Merge beim Import
  useAiMerge: boolean;

  // Automatischer Scan
  autoScan: {
    enabled: boolean;
    interval: AutoScanInterval;
    lastRun?: Date;
    nextRun?: Date;
  };

  // Automatischer Import
  autoImport: {
    enabled: boolean;
    minScore: number; // Schwellwert 0-100
    lastRun?: Date;
    nextRun?: Date;
  };

  // Metadaten
  updatedAt: Date;
  updatedBy: string;
}

export const DEFAULT_MATCHING_SETTINGS: MatchingGlobalSettings = {
  useAiMerge: false,
  autoScan: {
    enabled: false,
    interval: 'weekly'
  },
  autoImport: {
    enabled: false,
    minScore: 60 // Default: 60/100
  },
  updatedAt: new Date(),
  updatedBy: ''
};
