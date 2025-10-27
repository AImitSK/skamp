import React from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { MonitoringConfig } from './types';

interface AlertsTabProps {
  config: MonitoringConfig;
  onChange: (config: MonitoringConfig) => void;
}

/**
 * AlertsTab Komponente
 *
 * Benachrichtigungs-Schwellenwerte:
 * - Mindest-Reichweite (täglich)
 * - Sentiment-Warnschwelle
 * - Wettbewerber-Erwähnungen
 */
export default function AlertsTab({ config, onChange }: AlertsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <BellIcon className="h-5 w-5 text-gray-400" />
        <h4 className="text-sm font-medium text-gray-900">
          Benachrichtigungs-Schwellenwerte
        </h4>
      </div>

      {/* Min Reach Alert */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mindest-Reichweite (täglich)
        </label>
        <input
          type="number"
          value={config.alertThresholds.minReach}
          onChange={(e) => onChange({
            ...config,
            alertThresholds: {
              ...config.alertThresholds,
              minReach: parseInt(e.target.value) || 0
            }
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="1000"
        />
        <p className="text-sm text-gray-500 mt-1">
          Warnung wenn tägliche Reichweite unter diesem Wert liegt
        </p>
      </div>

      {/* Sentiment Alert */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sentiment-Warnschwelle
        </label>
        <input
          type="number"
          min="-1"
          max="1"
          step="0.1"
          value={config.alertThresholds.sentimentAlert}
          onChange={(e) => onChange({
            ...config,
            alertThresholds: {
              ...config.alertThresholds,
              sentimentAlert: parseFloat(e.target.value) || -0.3
            }
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="-0.3"
        />
        <p className="text-sm text-gray-500 mt-1">
          Warnung wenn Sentiment unter diesem Wert fällt (-1 bis 1)
        </p>
      </div>

      {/* Competitor Mentions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wettbewerber-Erwähnungen
        </label>
        <input
          type="number"
          value={config.alertThresholds.competitorMentions}
          onChange={(e) => onChange({
            ...config,
            alertThresholds: {
              ...config.alertThresholds,
              competitorMentions: parseInt(e.target.value) || 0
            }
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="5"
        />
        <p className="text-sm text-gray-500 mt-1">
          Warnung wenn Wettbewerber häufiger erwähnt werden
        </p>
      </div>
    </div>
  );
}
