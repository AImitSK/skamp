// src/components/projects/monitoring/MonitoringConfigPanel.tsx
'use client';

import React, { useState } from 'react';
import {
  CogIcon,
  PlayIcon,
  BellIcon,
  CalendarIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface MonitoringConfig {
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

interface MonitoringProvider {
  name: 'landau' | 'pmg' | 'custom';
  apiEndpoint: string;
  isEnabled: boolean;
  supportedMetrics: Array<'reach' | 'sentiment' | 'mentions' | 'social'>;
}

interface MonitoringConfigPanelProps {
  projectId: string;
  organizationId?: string;
  // Unterstütze beide Config-Varianten für Kompatibilität
  currentConfig?: MonitoringConfig;
  config?: MonitoringConfig;
  // Unterstütze beide Callback-Varianten für Kompatibilität
  onSave?: (config: MonitoringConfig) => void;
  onStart?: (config: MonitoringConfig) => void;
  onConfigUpdate?: (config: MonitoringConfig) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

const MonitoringConfigPanel: React.FC<MonitoringConfigPanelProps> = ({
  projectId,
  organizationId,
  currentConfig,
  config: initialConfig,
  onSave,
  onStart,
  onConfigUpdate,
  onCancel,
  isLoading = false,
  className = ''
}) => {
  const [config, setConfig] = useState<MonitoringConfig>(
    initialConfig || currentConfig || {
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
  });

  const [activeTab, setActiveTab] = useState<'general' | 'providers' | 'alerts'>('general');

  const handleSave = () => {
    if (onSave) onSave(config);
    if (onConfigUpdate) onConfigUpdate(config);
  };

  const handleStart = () => {
    const startConfig = { ...config, isEnabled: true };
    setConfig(startConfig);
    if (onStart) onStart(startConfig);
    if (onConfigUpdate) onConfigUpdate(startConfig);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CogIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">
              Monitoring Konfiguration
            </h3>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Speichern
            </button>
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <PlayIcon className="h-4 w-4" />
              <span>Monitoring starten</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div className="flex space-x-6 border-b border-gray-200">
          {[
            { key: 'general', label: 'Allgemein' },
            { key: 'providers', label: 'Anbieter' },
            { key: 'alerts', label: 'Benachrichtigungen' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Monitoring Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Überwachungszeitraum
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 30, label: '30 Tage' },
                  { value: 90, label: '90 Tage' },
                  { value: 365, label: '1 Jahr' }
                ].map(period => (
                  <button
                    key={period.value}
                    onClick={() => setConfig({ ...config, monitoringPeriod: period.value as any })}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      config.monitoringPeriod === period.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">{period.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Transition */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  Automatischer Übergang
                </label>
                <p className="text-sm text-gray-500">
                  Projekt automatisch zu &quot;Abgeschlossen&quot; wechseln nach Monitoring-Ende
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.autoTransition}
                  onChange={(e) => setConfig({ ...config, autoTransition: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Report Schedule */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Berichts-Zeitplan
              </label>
              <select
                value={config.reportSchedule}
                onChange={(e) => setConfig({ 
                  ...config, 
                  reportSchedule: e.target.value as 'daily' | 'weekly' | 'monthly' 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
                <option value="monthly">Monatlich</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'providers' && (
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
                        setConfig({ ...config, providers: newProviders });
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
        )}

        {activeTab === 'alerts' && (
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
                onChange={(e) => setConfig({
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
                onChange={(e) => setConfig({
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
                onChange={(e) => setConfig({
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
        )}
      </div>
    </div>
  );
};

export default MonitoringConfigPanel;