'use client';

import React, { useState, useEffect } from 'react';
import { 
  PencilIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { 
  ProjectPriority, 
  PipelineStage,
  Project 
} from '@/types/project';
import { projectService } from '@/lib/firebase/project-service';
import { tagsService } from '@/lib/firebase/tags-service';
import { useAuth } from '@/context/AuthContext';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { TagInput } from '@/components/ui/tag-input';
import { ClientSelector } from '../creation/ClientSelector';
import { TeamMemberMultiSelect } from '../creation/TeamMemberMultiSelect';
import { Tag, TagColor } from '@/types/crm';

// Alert Component
function Alert({ 
  type = 'error', 
  title, 
  message,
  onDismiss
}: { 
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message: string;
  onDismiss?: () => void;
}) {
  const styles = {
    error: 'bg-red-50 text-red-700',
    warning: 'bg-yellow-50 text-yellow-700',
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700'
  };

  const icons = {
    error: ExclamationTriangleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon,
    success: CheckIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${
            type === 'error' ? 'text-red-400' : 
            type === 'warning' ? 'text-yellow-400' : 
            type === 'success' ? 'text-green-400' :
            'text-blue-400'
          }`} />
        </div>
        <div className="ml-3 flex-1">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${title ? 'mt-1' : ''} ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              className={`inline-flex rounded-md p-1.5 ${styles[type].split(' ')[1]} hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50`}
              onClick={onDismiss}
            >
              <span className="sr-only">Schließen</span>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProjectEditWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
  project: Project;
  organizationId: string;
}

export function ProjectEditWizard({ 
  isOpen, 
  onClose, 
  onSuccess, 
  project,
  organizationId 
}: ProjectEditWizardProps) {
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [creationOptions, setCreationOptions] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  // Form-Daten mit allen verfügbaren Feldern
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientId: '',
    priority: 'medium' as ProjectPriority,
    status: 'active' as string,
    currentStage: 'ideas_planning' as PipelineStage,
    projectManager: '',
    assignedTeamMembers: [] as string[],
    dueDate: '',
    tags: [] as string[]
  });

  // Lade Optionen und initialisiere Form beim Öffnen
  useEffect(() => {
    if (isOpen && project) {
      // Reset messages
      setError(null);
      setSuccessMessage(null);
      
      // Initialisiere Form-Daten mit Projekt-Werten
      setFormData({
        title: project.title || '',
        description: project.description || '',
        clientId: project.customer?.id || '',
        priority: (project as any).priority || 'medium',
        status: project.status || 'active',
        currentStage: project.currentStage || 'ideas_planning',
        projectManager: project.projectManager || '',
        assignedTeamMembers: project.assignedTo || [],
        dueDate: project.dueDate 
          ? new Date((project.dueDate as any).seconds * 1000).toISOString().split('T')[0]
          : '',
        tags: (project as any).tags || []
      });
      
      // Set selected tag IDs
      setSelectedTagIds((project as any).tags || []);
      
      if (!creationOptions) {
        loadCreationOptions();
      }
      
      if (user?.uid) {
        loadTags();
      }
    }
  }, [isOpen, project, user?.uid]);

  const loadCreationOptions = async () => {
    try {
      setIsLoading(true);
      const options = await projectService.getProjectCreationOptions(organizationId);
      setCreationOptions(options);
    } catch (error) {
      console.error('Fehler beim Laden der Options:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTags = async () => {
    if (!user?.uid) return;
    try {
      const userTags = await tagsService.getAll(user.uid);
      setTags(userTags);
    } catch (error) {
      console.error('Fehler beim Laden der Tags:', error);
    }
  };

  const handleCreateTag = async (name: string, color: TagColor): Promise<string> => {
    if (!user?.uid) throw new Error('Benutzer nicht angemeldet');
    
    try {
      const tagId = await tagsService.create(
        { name, color },
        user.uid
      );
      
      // Reload tags after creation
      await loadTags();
      return tagId;
    } catch (error) {
      throw error;
    }
  };

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ 
      ...prev, 
      ...updates
    }));
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !project.id) return;

    // Validation
    if (!formData.title.trim()) {
      setError('Projekt-Titel ist erforderlich');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      const updateData: Partial<Project> = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        currentStage: formData.currentStage,
        assignedTo: formData.assignedTeamMembers,
        updatedAt: new Date(),
        updatedBy: user.uid
      };

      // Add optional fields - Priority und Tags immer setzen
      (updateData as any).priority = formData.priority || 'medium';
      // Tags immer setzen (auch leeres Array wenn keine Tags ausgewählt)
      (updateData as any).tags = selectedTagIds;
      if (formData.dueDate) {
        updateData.dueDate = {
          seconds: new Date(formData.dueDate).getTime() / 1000,
          nanoseconds: 0
        } as any;
      }
      if (formData.projectManager) {
        updateData.projectManager = formData.projectManager;
      }

      // Update customer if client changed
      if (formData.clientId && creationOptions?.availableClients) {
        const selectedClient = creationOptions.availableClients.find((c: any) => c.id === formData.clientId);
        if (selectedClient) {
          updateData.customer = {
            id: selectedClient.id,
            name: selectedClient.name || selectedClient.companyName
          };
        }
      }

      await projectService.update(project.id, updateData, {
        organizationId: organizationId
      });

      setSuccessMessage('Projekt erfolgreich aktualisiert');
      
      // Call success callback with updated project
      const updatedProject = { ...project, ...updateData };
      onSuccess(updatedProject);

      // Auto-close after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error: any) {
      console.error('Fehler beim Speichern:', error);
      setError(`Fehler beim Speichern des Projekts: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <PencilIcon className="w-6 h-6 mr-2 text-primary" />
              Projekt bearbeiten
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="px-6 py-4">
            <Alert
              type="success"
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          </div>
        )}
        {error && (
          <div className="px-6 py-4">
            <Alert
              type="error"
              message={error}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Form */}
        <form 
          onSubmit={handleSaveProject} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && 
                e.target.tagName !== 'BUTTON' && 
                e.target.tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
          className="px-6 py-6">
          <div className="space-y-6">
            {/* Projekt-Titel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Projekt-Titel *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="z.B. Produktlaunch Q2 2024"
              />
            </div>
            
            {/* Beschreibung */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Kurze Beschreibung des Projekts..."
              />
            </div>

            {/* Status und Priorität */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => updateFormData({ status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="active">Aktiv</option>
                  <option value="on_hold">Pausiert</option>
                  <option value="completed">Abgeschlossen</option>
                  <option value="cancelled">Abgebrochen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorität
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => updateFormData({ priority: e.target.value as ProjectPriority })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                  <option value="urgent">Dringend</option>
                </select>
              </div>
            </div>

            {/* Pipeline-Phase */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pipeline-Phase
              </label>
              <select
                value={formData.currentStage}
                onChange={(e) => updateFormData({ currentStage: e.target.value as PipelineStage })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="ideas_planning">Ideen & Planung</option>
                <option value="creation">Erstellung</option>
                <option value="internal_approval">Interne Freigabe</option>
                <option value="customer_approval">Kundenfreigabe</option>
                <option value="distribution">Distribution</option>
                <option value="monitoring">Monitoring</option>
                <option value="completed">Abgeschlossen</option>
              </select>
            </div>

            {/* Kunde */}
            {creationOptions?.availableClients && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kunde
                </label>
                <ClientSelector
                  clients={creationOptions.availableClients}
                  selectedClientId={formData.clientId}
                  onSelect={(clientId) => updateFormData({ clientId })}
                />
              </div>
            )}

            {/* Fälligkeitsdatum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fälligkeitsdatum
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => updateFormData({ dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <TagInput
                selectedTagIds={selectedTagIds}
                availableTags={tags}
                onChange={setSelectedTagIds}
                onCreateTag={handleCreateTag}
              />
            </div>

            {/* Team-Mitglieder */}
            {creationOptions?.availableTeamMembers && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team-Mitglieder
                </label>
                <TeamMemberMultiSelect
                  teamMembers={creationOptions.availableTeamMembers}
                  selectedMembers={formData.assignedTeamMembers}
                  onSelectionChange={(members) => {
                    updateFormData({ assignedTeamMembers: members });
                    
                    // Clear project manager if they are no longer in the team
                    if (formData.projectManager && !members.some(selectedId => 
                      formData.projectManager === selectedId || formData.projectManager.includes(selectedId)
                    )) {
                      updateFormData({ projectManager: '' });
                    }
                  }}
                />
                
                {/* Projekt-Manager aus ausgewählten Team-Mitgliedern */}
                {formData.assignedTeamMembers.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Projekt-Manager / Besitzer
                    </label>
                    <select
                      value={formData.projectManager}
                      onChange={(e) => updateFormData({ projectManager: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="">Kein Manager ausgewählt</option>
                      {creationOptions.availableTeamMembers
                        ?.filter((member: any) => formData.assignedTeamMembers.some(selectedId => 
                          member.id === selectedId || member.id.includes(selectedId)
                        ))
                        .map((member: any) => (
                          <option key={member.id} value={member.id}>
                            {member.displayName} ({member.role})
                            {user?.uid && member.id.includes(user.uid) ? ' (Sie)' : ''}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <Button
              type="button"
              color="secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !formData.title}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Speichern...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Änderungen speichern
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}