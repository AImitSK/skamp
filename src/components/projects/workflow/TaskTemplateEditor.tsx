'use client';

import { useState } from 'react';
import { PipelineStage } from '@/types/project';
import { TaskPriority } from '@/types/tasks';
import { 
  DocumentDuplicateIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  category: string;
  stage: PipelineStage;
  priority: TaskPriority;
  requiredForStageCompletion: boolean;
  daysAfterStageEntry: number;
  estimatedDuration?: number; // in Stunden
  assignmentRules?: {
    assignTo: 'project_lead' | 'team_member' | 'role_based';
    role?: string;
  };
  dependencyTemplates?: string[]; // IDs anderer Templates
  checklist?: Array<{
    id: string;
    text: string;
    required: boolean;
  }>;
}

interface TaskTemplateEditorProps {
  projectId: string;
  templates: TaskTemplate[];
  onTemplatesUpdate: (templates: TaskTemplate[]) => Promise<void>;
}

export default function TaskTemplateEditor({
  projectId,
  templates,
  onTemplatesUpdate
}: TaskTemplateEditorProps) {
  const [localTemplates, setLocalTemplates] = useState<TaskTemplate[]>(templates);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const stageLabels: Record<PipelineStage, string> = {
    'ideas_planning': 'Ideen & Planung',
    'creation': 'Erstellung',
    'approval': 'Freigabe',
    'distribution': 'Verteilung',
    'monitoring': 'Monitoring',
    'completed': 'Abgeschlossen'
  };

  const stageOptions: PipelineStage[] = [
    'ideas_planning',
    'creation',
    'approval',
    'distribution',
    'monitoring'
  ];

  const priorityLabels: Record<TaskPriority, string> = {
    'low': 'Niedrig',
    'medium': 'Mittel',
    'high': 'Hoch',
    'urgent': 'Dringend'
  };

  const categories = [
    'content_creation',
    'review',
    'approval',
    'documentation',
    'communication',
    'technical',
    'creative',
    'administrative'
  ];

  const categoryLabels: Record<string, string> = {
    'content_creation': 'Content-Erstellung',
    'review': 'Review & Qualitätssicherung',
    'approval': 'Freigabe & Genehmigung',
    'documentation': 'Dokumentation',
    'communication': 'Kommunikation',
    'technical': 'Technische Umsetzung',
    'creative': 'Kreative Arbeit',
    'administrative': 'Administrative Tasks'
  };

  const createNewTemplate = (): TaskTemplate => ({
    id: `template_${Date.now()}`,
    title: 'Neue Task-Vorlage',
    category: 'content_creation',
    stage: 'creation',
    priority: 'medium',
    requiredForStageCompletion: false,
    daysAfterStageEntry: 1,
    estimatedDuration: 2,
    assignmentRules: {
      assignTo: 'team_member'
    },
    checklist: []
  });

  const handleAddTemplate = () => {
    const newTemplate = createNewTemplate();
    setSelectedTemplate(newTemplate);
    setShowEditor(true);
  };

  const handleEditTemplate = (template: TaskTemplate) => {
    setSelectedTemplate({ ...template });
    setShowEditor(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setLocalTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  const handleSaveTemplate = () => {
    if (!selectedTemplate) return;

    setLocalTemplates(prev => {
      const existing = prev.find(t => t.id === selectedTemplate.id);
      if (existing) {
        return prev.map(t => t.id === selectedTemplate.id ? selectedTemplate : t);
      } else {
        return [...prev, selectedTemplate];
      }
    });

    setShowEditor(false);
    setSelectedTemplate(null);
  };

  const handleSaveAllTemplates = async () => {
    setIsSaving(true);
    try {
      await onTemplatesUpdate(localTemplates);
      setIsEditing(false);
    } catch (error) {
      console.error('Fehler beim Speichern der Templates:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalTemplates(templates);
    setIsEditing(false);
    setShowEditor(false);
    setSelectedTemplate(null);
  };

  const updateSelectedTemplate = (updates: Partial<TaskTemplate>) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({ ...selectedTemplate, ...updates });
  };

  const addChecklistItem = () => {
    if (!selectedTemplate) return;
    
    const newItem = {
      id: `checklist_${Date.now()}`,
      text: 'Neue Checklisten-Aufgabe',
      required: false
    };

    updateSelectedTemplate({
      checklist: [...(selectedTemplate.checklist || []), newItem]
    });
  };

  const updateChecklistItem = (index: number, updates: any) => {
    if (!selectedTemplate) return;
    
    const updatedChecklist = [...(selectedTemplate.checklist || [])];
    updatedChecklist[index] = { ...updatedChecklist[index], ...updates };
    
    updateSelectedTemplate({ checklist: updatedChecklist });
  };

  const removeChecklistItem = (index: number) => {
    if (!selectedTemplate) return;
    
    const updatedChecklist = [...(selectedTemplate.checklist || [])];
    updatedChecklist.splice(index, 1);
    
    updateSelectedTemplate({ checklist: updatedChecklist });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DocumentDuplicateIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">
              Task-Templates verwalten
            </h3>
          </div>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Bearbeiten
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSaveAllTemplates}
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

      <div className="p-6">
        {/* Template-Liste nach Stage gruppiert */}
        {stageOptions.map(stage => {
          const stageTemplates = localTemplates.filter(t => t.stage === stage);
          
          return (
            <div key={stage} className="mb-8">
              <h4 className="text-sm font-medium text-gray-900 mb-4">
                {stageLabels[stage]} ({stageTemplates.length} Templates)
              </h4>

              <div className="space-y-3">
                {stageTemplates.map(template => (
                  <div
                    key={template.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h5 className="font-medium text-gray-900">
                            {template.title}
                          </h5>
                          
                          <span className={`
                            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                            ${template.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              template.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              template.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'}
                          `}>
                            {priorityLabels[template.priority]}
                          </span>

                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {categoryLabels[template.category]}
                          </span>

                          {template.requiredForStageCompletion && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Kritisch
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="w-4 h-4" />
                            <span>{template.daysAfterStageEntry} Tage nach Stage-Eintritt</span>
                          </div>

                          {template.estimatedDuration && (
                            <div className="flex items-center space-x-1">
                              <span>~{template.estimatedDuration}h geschätzt</span>
                            </div>
                          )}

                          {template.assignmentRules && (
                            <div className="flex items-center space-x-1">
                              <UserGroupIcon className="w-4 h-4" />
                              <span>
                                {template.assignmentRules.assignTo === 'project_lead' ? 'Projektleitung' :
                                 template.assignmentRules.assignTo === 'team_member' ? 'Team-Mitglied' :
                                 `Rolle: ${template.assignmentRules.role}`}
                              </span>
                            </div>
                          )}
                        </div>

                        {template.description && (
                          <p className="mt-2 text-sm text-gray-600">
                            {template.description}
                          </p>
                        )}
                      </div>

                      {isEditing && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {stageTemplates.length === 0 && (
                  <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    <DocumentDuplicateIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>Keine Templates für diese Stage</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Template Button */}
        {isEditing && (
          <div className="mt-6">
            <button
              onClick={handleAddTemplate}
              className="flex items-center space-x-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-300 hover:text-blue-600"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Neues Template hinzufügen</span>
            </button>
          </div>
        )}
      </div>

      {/* Template Editor Modal */}
      {showEditor && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {localTemplates.find(t => t.id === selectedTemplate.id) ? 'Template bearbeiten' : 'Neues Template'}
              </h3>

              <div className="space-y-6">
                {/* Basis-Informationen */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titel
                    </label>
                    <input
                      type="text"
                      value={selectedTemplate.title}
                      onChange={(e) => updateSelectedTemplate({ title: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategorie
                    </label>
                    <select
                      value={selectedTemplate.category}
                      onChange={(e) => updateSelectedTemplate({ category: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {categoryLabels[category]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stage
                    </label>
                    <select
                      value={selectedTemplate.stage}
                      onChange={(e) => updateSelectedTemplate({ stage: e.target.value as PipelineStage })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {stageOptions.map(stage => (
                        <option key={stage} value={stage}>
                          {stageLabels[stage]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priorität
                    </label>
                    <select
                      value={selectedTemplate.priority}
                      onChange={(e) => updateSelectedTemplate({ priority: e.target.value as TaskPriority })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(priorityLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tage nach Stage-Eintritt
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={selectedTemplate.daysAfterStageEntry}
                      onChange={(e) => updateSelectedTemplate({ daysAfterStageEntry: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Geschätzte Dauer (Stunden)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={selectedTemplate.estimatedDuration || ''}
                      onChange={(e) => updateSelectedTemplate({ estimatedDuration: parseFloat(e.target.value) || undefined })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Beschreibung */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={selectedTemplate.description || ''}
                    onChange={(e) => updateSelectedTemplate({ description: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Optionen */}
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedTemplate.requiredForStageCompletion}
                      onChange={(e) => updateSelectedTemplate({ requiredForStageCompletion: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Kritisch für Stage-Completion
                    </span>
                  </label>
                </div>

                {/* Checkliste */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Checkliste
                    </label>
                    <button
                      onClick={addChecklistItem}
                      className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Hinzufügen</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {selectedTemplate.checklist?.map((item, index) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => updateChecklistItem(index, { text: e.target.value })}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={item.required}
                            onChange={(e) => updateChecklistItem(index, { required: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-600">Pflicht</span>
                        </label>
                        <button
                          onClick={() => removeChecklistItem(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8">
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Template speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}