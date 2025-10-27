import React from 'react';
import { MonitoringConfig } from './types';

interface GeneralSettingsTabProps {
  config: MonitoringConfig;
  onChange: (config: MonitoringConfig) => void;
}

/**
 * GeneralSettingsTab Komponente
 *
 * Allgemeine Monitoring-Einstellungen:
 * - Überwachungszeitraum (30, 90, 365 Tage)
 * - Automatischer Übergang nach Monitoring-Ende
 * - Berichts-Zeitplan (täglich, wöchentlich, monatlich)
 */
export default function GeneralSettingsTab({ config, onChange }: GeneralSettingsTabProps) {
  return (
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
              onClick={() => onChange({ ...config, monitoringPeriod: period.value as 30 | 90 | 365 })}
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
            onChange={(e) => onChange({ ...config, autoTransition: e.target.checked })}
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
          onChange={(e) => onChange({
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
  );
}
