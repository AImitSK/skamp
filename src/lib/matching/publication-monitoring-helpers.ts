/**
 * Publication Monitoring Helpers
 *
 * Phase 5: Helper-Funktionen für monitoringConfig Migration und Merge
 */

import { PublicationMonitoringConfig } from '@/types/library';
import { Timestamp } from 'firebase/firestore';

/**
 * Migriert alte Publication Felder zu monitoringConfig
 *
 * @param publication - Publication mit alten Feldern (website, rssFeedUrl, socialMediaUrls)
 * @returns monitoringConfig oder null wenn keine Migration nötig
 */
export function migrateToMonitoringConfig(publication: any): PublicationMonitoringConfig | null {
  // Wenn bereits monitoringConfig vorhanden → keine Migration nötig
  if (publication.monitoringConfig) {
    return null;
  }

  // Sammle alte Daten
  const websiteUrl = publication.website || publication.websiteUrl || null;
  const rssFeedUrls: string[] = [];

  // Alte rssFeedUrl → neues rssFeedUrls Array
  if (publication.rssFeedUrl) {
    rssFeedUrls.push(publication.rssFeedUrl);
  }

  // Erstelle neues monitoringConfig
  const config: PublicationMonitoringConfig = {
    isEnabled: true, // Default aktiviert
    websiteUrl,
    rssFeedUrls,
    autoDetectRss: true,
    checkFrequency: 'daily',
    keywords: [],
    totalArticlesFound: 0
    // createdAt und updatedAt von Publication-Level übernehmen
  };

  return config;
}

/**
 * Merged mehrere monitoringConfigs zu einem finalen Config
 *
 * Wird verwendet wenn mehrere Variants verschiedene Monitoring-Daten haben
 *
 * @param configs - Array von PublicationMonitoringConfig
 * @returns Gemergtes monitoringConfig
 */
export function mergeMonitoringConfigs(configs: PublicationMonitoringConfig[]): PublicationMonitoringConfig {
  if (configs.length === 0) {
    // Fallback: Leeres Config
    return {
      isEnabled: false,
      websiteUrl: null,
      rssFeedUrls: [],
      autoDetectRss: true,
      checkFrequency: 'daily',
      keywords: [],
      totalArticlesFound: 0
    };
  }

  if (configs.length === 1) {
    return configs[0];
  }

  // Merge-Logik
  const merged: PublicationMonitoringConfig = {
    // isEnabled = true wenn mind. 1 Config enabled ist
    isEnabled: configs.some(c => c.isEnabled),

    // websiteUrl: Nimm ersten non-null Wert
    websiteUrl: configs.find(c => c.websiteUrl)?.websiteUrl || null,

    // rssFeedUrls: Kombiniere alle URLs, dedupliziere
    rssFeedUrls: [
      ...new Set(
        configs.flatMap(c => c.rssFeedUrls || [])
      )
    ],

    // autoDetectRss: true wenn mind. 1 Config es hat
    autoDetectRss: configs.some(c => c.autoDetectRss),

    // checkFrequency: Nimm höchste Frequenz (twice_daily > daily)
    checkFrequency: configs.some(c => c.checkFrequency === 'twice_daily')
      ? 'twice_daily'
      : 'daily',

    // keywords: Kombiniere alle Keywords, dedupliziere
    keywords: [
      ...new Set(
        configs.flatMap(c => c.keywords || [])
      )
    ],

    // totalArticlesFound: Summe aller Artikel
    totalArticlesFound: configs.reduce((sum, c) => sum + (c.totalArticlesFound || 0), 0)
  };

  return merged;
}

/**
 * Erstellt Standard monitoringConfig für neue Publications
 *
 * @param website - Website URL (optional)
 * @param rssFeedUrl - RSS Feed URL (optional)
 * @returns Standard monitoringConfig
 */
export function createDefaultMonitoringConfig(
  website?: string | null,
  rssFeedUrl?: string | null
): PublicationMonitoringConfig {
  return {
    isEnabled: true,
    websiteUrl: website || null,
    rssFeedUrls: rssFeedUrl ? [rssFeedUrl] : [],
    autoDetectRss: true,
    checkFrequency: 'daily',
    keywords: [],
    totalArticlesFound: 0
  };
}
