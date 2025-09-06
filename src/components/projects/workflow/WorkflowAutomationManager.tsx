'use client';

import { useState } from 'react';
import { PipelineStage } from '@/types/project';
import { 
  CogIcon,
  BellIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface WorkflowConfig {
  autoStageTransition: boolean;
  requireAllCriticalTasks: boolean;
  enableTaskDependencies: boolean;
  notifyOnStageTransition: boolean;
  customTransitionRules: Array<{
    fromStage: PipelineStage;
    toStage: PipelineStage;
    requiresApproval: boolean;
    approvers: string[];
    customChecks: string[];
  }>;
}

interface WorkflowAutomationManagerProps {
  projectId: string;
  currentConfig: WorkflowConfig;
  availableUsers: Array<{ id: string; name: string; email: string }>;
  onConfigUpdate: (config: WorkflowConfig) => Promise<void>;
}

export default function WorkflowAutomationManager({
  projectId,
  currentConfig,
  availableUsers,
  onConfigUpdate
}: WorkflowAutomationManagerProps) {
  const [config, setConfig] = useState<WorkflowConfig>(currentConfig);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const stageLabels: Record<PipelineStage, string> = {
    'ideas_planning': 'Ideen & Planung',
    'creation': 'Erstellung',
    'internal_approval': 'Interne Freigabe',
    'customer_approval': 'Kunden-Freigabe',
    'distribution': 'Verteilung',
    'monitoring': 'Monitoring',
    'completed': 'Abgeschlossen'
  };

  const stageOptions: PipelineStage[] = [
    'ideas_planning',
    'creation',
    'internal_approval',
    'customer_approval',
    'distribution',
    'monitoring',
    'completed'
  ];

  const handleConfigChange = (key: keyof WorkflowConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const addCustomRule = () => {
    const newRule = {
      fromStage: 'creation' as PipelineStage,
      toStage: 'internal_approval' as PipelineStage,
      requiresApproval: false,
      approvers: [],
      customChecks: []
    };

    setConfig(prev => ({
      ...prev,
      customTransitionRules: [...prev.customTransitionRules, newRule]
    }));
  };

  const removeCustomRule = (index: number) => {
    setConfig(prev => ({
      ...prev,
      customTransitionRules: prev.customTransitionRules.filter((_, i) => i !== index)
    }));
  };

  const updateCustomRule = (index: number, updates: any) => {
    setConfig(prev => ({
      ...prev,
      customTransitionRules: prev.customTransitionRules.map((rule, i) =>
        i === index ? { ...rule, ...updates } : rule
      )
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onConfigUpdate(config);
      setIsEditing(false);
    } catch (error) {
      console.error('Fehler beim Speichern der Workflow-Konfiguration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setConfig(currentConfig);
    setIsEditing(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CogIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">
              Workflow-Automatisierung
            </h3>
          </div>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Konfigurieren
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 disabled:opacity-50"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Basis-Konfiguration */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Basis-Einstellungen
          </h4>
          
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.autoStageTransition}
                onChange={(e) => handleConfigChange('autoStageTransition', e.target.checked)}
                disabled={!isEditing}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Automatische Stage-Übergänge
                </p>
                <p className="text-xs text-gray-500">
                  Wechselt automatisch zur nächsten Stage, wenn alle Bedingungen erfüllt sind
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.requireAllCriticalTasks}
                onChange={(e) => handleConfigChange('requireAllCriticalTasks', e.target.checked)}
                disabled={!isEditing}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Alle kritischen Tasks erforderlich
                </p>
                <p className="text-xs text-gray-500">
                  Blockiert Stage-Übergänge bis alle kritischen Tasks abgeschlossen sind
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.enableTaskDependencies}
                onChange={(e) => handleConfigChange('enableTaskDependencies', e.target.checked)}
                disabled={!isEditing}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Task-Abhängigkeiten aktivieren
                </p>
                <p className="text-xs text-gray-500">
                  Ermöglicht die Definition von Abhängigkeiten zwischen Tasks
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.notifyOnStageTransition}
                onChange={(e) => handleConfigChange('notifyOnStageTransition', e.target.checked)}
                disabled={!isEditing}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex items-center space-x-2">
                <BellIcon className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Benachrichtigungen bei Stage-Übergängen
                  </p>
                  <p className="text-xs text-gray-500">
                    Sendet Benachrichtigungen an Projektbeteiligte bei Stage-Wechseln
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Custom Transition Rules */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">
              Benutzerdefinierte Übergangsregeln
            </h4>
            
            {isEditing && (
              <button
                onClick={addCustomRule}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Regel hinzufügen</span>
              </button>
            )}
          </div>

          {config.customTransitionRules.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Keine benutzerdefinierten Regeln konfiguriert
            </p>
          ) : (
            <div className="space-y-4">
              {config.customTransitionRules.map((rule, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* From Stage */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Von Stage:
                      </label>
                      <select
                        value={rule.fromStage}
                        onChange={(e) => updateCustomRule(index, { fromStage: e.target.value })}
                        disabled={!isEditing}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      >
                        {stageOptions.map(stage => (
                          <option key={stage} value={stage}>
                            {stageLabels[stage]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* To Stage */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Zu Stage:
                      </label>
                      <select
                        value={rule.toStage}
                        onChange={(e) => updateCustomRule(index, { toStage: e.target.value })}
                        disabled={!isEditing}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      >
                        {stageOptions.map(stage => (
                          <option key={stage} value={stage}>
                            {stageLabels[stage]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Approval Required */}
                  <div className="mt-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={rule.requiresApproval}
                        onChange={(e) => updateCustomRule(index, { requiresApproval: e.target.checked })}
                        disabled={!isEditing}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Freigabe erforderlich
                      </span>
                    </label>
                  </div>

                  {/* Approvers */}
                  {rule.requiresApproval && (
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Genehmigende Personen:
                      </label>
                      <div className="space-y-2">
                        {availableUsers.map(user => (
                          <label key={user.id} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={rule.approvers.includes(user.id)}
                              onChange={(e) => {
                                const newApprovers = e.target.checked
                                  ? [...rule.approvers, user.id]
                                  : rule.approvers.filter(id => id !== user.id);
                                updateCustomRule(index, { approvers: newApprovers });
                              }}
                              disabled={!isEditing}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              {user.name} ({user.email})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remove Rule Button */}
                  {isEditing && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => removeCustomRule(index)}
                        className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span>Regel entfernen</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Template Assignment Rules */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Task-Template-Regeln
          </h4>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <CogIcon className="w-5 h-5" />
              <p className="text-sm">
                Template-Assignment-Regeln werden in einer zukünftigen Version implementiert.
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Hier können Sie definieren, welche Task-Templates automatisch bei Stage-Übergängen erstellt werden sollen.
            </p>
          </div>
        </div>

        {/* Error Handling & Recovery */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Fehlerbehandlung
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Automatische Wiederholung bei Fehlern
                </p>
                <p className="text-xs text-amber-600">
                  Wiederholt fehlgeschlagene Workflow-Aktionen automatisch
                </p>
              </div>
              <div className="text-sm text-amber-600">
                Aktiviert
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Rollback bei kritischen Fehlern
                </p>
                <p className="text-xs text-blue-600">
                  Rollt Änderungen bei kritischen Workflow-Fehlern automatisch zurück
                </p>
              </div>
              <div className="text-sm text-blue-600">
                Aktiviert
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}