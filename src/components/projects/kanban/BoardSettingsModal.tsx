// src/components/projects/kanban/BoardSettingsModal.tsx - Board Einstellungen
'use client';

import React, { useState } from 'react';
import { XMarkIcon, AdjustmentsHorizontalIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { PipelineStage } from '@/types/project';

// ========================================
// INTERFACES
// ========================================

export interface BoardSettings {
  visibleStages: PipelineStage[];
  autoRefreshInterval: number; // in seconds
  showCompletedProjects: boolean;
  compactView: boolean;
  showProjectProgress: boolean;
  showTeamMembers: boolean;
  showDueDates: boolean;
  showPriority: boolean;
}

export interface BoardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BoardSettings;
  onSettingsChange: (settings: BoardSettings) => void;
}

// ========================================
// BOARD SETTINGS MODAL KOMPONENTE
// ========================================

export const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}) => {
  const [localSettings, setLocalSettings] = useState<BoardSettings>(settings);

  const allStages: { stage: PipelineStage; label: string }[] = [
    { stage: 'ideas_planning', label: 'Ideen & Planung' },
    { stage: 'creation', label: 'Erstellung' },
    { stage: 'internal_approval', label: 'Interne Freigabe' },
    { stage: 'customer_approval', label: 'Kundenfreigabe' },
    { stage: 'distribution', label: 'Verteilung' },
    { stage: 'monitoring', label: 'Monitoring' },
    { stage: 'completed', label: 'Abgeschlossen' }
  ];

  // Handle settings change
  const handleSettingsChange = (key: keyof BoardSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  // Handle stage visibility toggle
  const toggleStageVisibility = (stage: PipelineStage) => {
    const newVisibleStages = localSettings.visibleStages.includes(stage)
      ? localSettings.visibleStages.filter(s => s !== stage)
      : [...localSettings.visibleStages, stage];
    
    handleSettingsChange('visibleStages', newVisibleStages);
  };

  // Handle save
  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  // Handle reset to defaults
  const handleReset = () => {
    const defaultSettings: BoardSettings = {
      visibleStages: allStages.map(s => s.stage),
      autoRefreshInterval: 30,
      showCompletedProjects: true,
      compactView: false,
      showProjectProgress: true,
      showTeamMembers: true,
      showDueDates: true,
      showPriority: true
    };
    setLocalSettings(defaultSettings);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Board-Einstellungen
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Passen Sie Ihr Kanban Board nach Ihren Bedürfnissen an
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-8">
          {/* Sichtbare Stages */}
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-4">
              Sichtbare Pipeline-Stufen
            </h4>
            <div className="space-y-3">
              {allStages.map(({ stage, label }) => (
                <div key={stage} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleStageVisibility(stage)}
                      className={`
                        p-1 rounded transition-colors
                        ${localSettings.visibleStages.includes(stage)
                          ? 'text-blue-600 hover:bg-blue-100'
                          : 'text-gray-400 hover:bg-gray-200'
                        }
                      `}
                    >
                      {localSettings.visibleStages.includes(stage) ? (
                        <EyeIcon className="h-4 w-4" />
                      ) : (
                        <EyeSlashIcon className="h-4 w-4" />
                      )}
                    </button>
                    <span className={`
                      font-medium
                      ${localSettings.visibleStages.includes(stage) 
                        ? 'text-gray-900' 
                        : 'text-gray-500'
                      }
                    `}>
                      {label}
                    </span>
                  </div>
                  
                  <span className={`
                    text-xs px-2 py-1 rounded-full
                    ${localSettings.visibleStages.includes(stage)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {localSettings.visibleStages.includes(stage) ? 'Sichtbar' : 'Ausgeblendet'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-Refresh */}
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-4">
              Automatische Aktualisierung
            </h4>
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-700">
                Intervall (Sekunden):
              </label>
              <select
                value={localSettings.autoRefreshInterval}
                onChange={(e) => handleSettingsChange('autoRefreshInterval', parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0}>Aus</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1min</option>
                <option value={300}>5min</option>
              </select>
            </div>
          </div>

          {/* Anzeigeoptionen */}
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-4">
              Anzeigeoptionen
            </h4>
            <div className="space-y-4">
              {/* Compact View */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Kompakte Ansicht
                  </label>
                  <p className="text-sm text-gray-500">
                    Zeigt mehr Projekte auf einmal an
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={localSettings.compactView}
                    onChange={(e) => handleSettingsChange('compactView', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Show Completed Projects */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Abgeschlossene Projekte anzeigen
                  </label>
                  <p className="text-sm text-gray-500">
                    Zeigt auch fertige Projekte im Board
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={localSettings.showCompletedProjects}
                    onChange={(e) => handleSettingsChange('showCompletedProjects', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Show Project Progress */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Projektfortschritt anzeigen
                  </label>
                  <p className="text-sm text-gray-500">
                    Zeigt Fortschrittsbalken in Projekt-Karten
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={localSettings.showProjectProgress}
                    onChange={(e) => handleSettingsChange('showProjectProgress', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Show Team Members */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Team-Mitglieder anzeigen
                  </label>
                  <p className="text-sm text-gray-500">
                    Zeigt zugewiesene Team-Mitglieder
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={localSettings.showTeamMembers}
                    onChange={(e) => handleSettingsChange('showTeamMembers', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Show Due Dates */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Fälligkeitsdaten anzeigen
                  </label>
                  <p className="text-sm text-gray-500">
                    Zeigt Fälligkeitsdaten in Projekt-Karten
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={localSettings.showDueDates}
                    onChange={(e) => handleSettingsChange('showDueDates', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Show Priority */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Prioritäten anzeigen
                  </label>
                  <p className="text-sm text-gray-500">
                    Zeigt Prioritäts-Badges in Projekt-Karten
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={localSettings.showPriority}
                    onChange={(e) => handleSettingsChange('showPriority', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Zurücksetzen
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Einstellungen speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardSettingsModal;