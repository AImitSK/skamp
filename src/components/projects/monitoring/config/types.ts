/**
 * Monitoring Configuration Types
 *
 * Shared types für Monitoring Config Panel und Sub-Komponenten.
 */

/**
 * Monitoring Provider Configuration
 */
export interface MonitoringProvider {
  name: 'landau' | 'pmg' | 'custom';
  apiEndpoint: string;
  isEnabled: boolean;
  supportedMetrics: Array<'reach' | 'sentiment' | 'mentions' | 'social'>;
}

/**
 * Monitoring Configuration
 */
export interface MonitoringConfig {
  isEnabled: boolean;
  monitoringPeriod: 30 | 90 | 365;
  autoTransition: boolean;
  providers: MonitoringProvider[];
  alertThresholds: {
    minReach: number;
    sentimentAlert: number;
    competitorMentions: number;
  };
  reportSchedule: 'daily' | 'weekly' | 'monthly';
}

/**
 * Default Monitoring Configuration
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  isEnabled: false,
  monitoringPeriod: 90,
  autoTransition: true,
  providers: [
    {
      name: 'landau',
      apiEndpoint: 'https://api.landau.com',
      isEnabled: true,
      supportedMetrics: ['reach', 'sentiment', 'mentions']
    }
  ],
  alertThresholds: {
    minReach: 1000,
    sentimentAlert: -0.3,
    competitorMentions: 5
  },
  reportSchedule: 'weekly'
};
