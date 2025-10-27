// src/components/projects/monitoring/MonitoringConfigPanel.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { CogIcon, PlayIcon } from '@heroicons/react/24/outline';
import GeneralSettingsTab from './config/GeneralSettingsTab';
import ProvidersTab from './config/ProvidersTab';
import AlertsTab from './config/AlertsTab';
import { MonitoringConfig, DEFAULT_MONITORING_CONFIG } from './config/types';

interface MonitoringConfigPanelProps {
  projectId: string;
  organizationId?: string;
  config?: MonitoringConfig;
  onSave?: (config: MonitoringConfig) => void;
  onStart?: (config: MonitoringConfig) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

const MonitoringConfigPanel = React.memo<MonitoringConfigPanelProps>(({
  projectId,
  organizationId,
  config: initialConfig,
  onSave,
  onStart,
  onCancel,
  isLoading = false,
  className = ''
}) => {
  const [config, setConfig] = useState<MonitoringConfig>(
    initialConfig || DEFAULT_MONITORING_CONFIG
  );

  const [activeTab, setActiveTab] = useState<'general' | 'providers' | 'alerts'>('general');

  const tabOptions = useMemo(() => [
    { key: 'general', label: 'Allgemein' },
    { key: 'providers', label: 'Anbieter' },
    { key: 'alerts', label: 'Benachrichtigungen' }
  ], []);

  const handleSave = () => {
    if (onSave) onSave(config);
  };

  const handleStart = () => {
    const startConfig = { ...config, isEnabled: true };
    setConfig(startConfig);
    if (onStart) onStart(startConfig);
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
          {tabOptions.map(tab => (
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
          <GeneralSettingsTab config={config} onChange={setConfig} />
        )}
        {activeTab === 'providers' && (
          <ProvidersTab config={config} onChange={setConfig} />
        )}
        {activeTab === 'alerts' && (
          <AlertsTab config={config} onChange={setConfig} />
        )}
      </div>
    </div>
  );
}));

export default MonitoringConfigPanel;