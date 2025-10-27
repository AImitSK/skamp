import React from 'react';
import { MonitoringConfig } from './types';

interface ProvidersTabProps {
  config: MonitoringConfig;
  onChange: (config: MonitoringConfig) => void;
}

/**
 * ProvidersTab Komponente
 *
 * Verwaltung der Monitoring-Anbieter:
 * - Provider aktivieren/deaktivieren
 * - API-Endpoint anzeigen
 * - Unterstützte Metriken anzeigen
 */
export default function ProvidersTab({ config, onChange }: ProvidersTabProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        Wählen Sie die Monitoring-Anbieter aus, die für dieses Projekt verwendet werden sollen.
      </p>

      {config.providers.map((provider, index) => (
        <div key={provider.name} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={provider.isEnabled}
                onChange={(e) => {
                  const newProviders = [...config.providers];
                  newProviders[index].isEnabled = e.target.checked;
                  onChange({ ...config, providers: newProviders });
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <div className="font-medium text-gray-900 capitalize">
                  {provider.name}
                </div>
                <div className="text-sm text-gray-500">
                  {provider.apiEndpoint}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {provider.supportedMetrics.join(', ')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
