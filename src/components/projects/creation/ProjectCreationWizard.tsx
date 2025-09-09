'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  RocketLaunchIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  ProjectCreationWizardData, 
  ProjectCreationResult, 
  ProjectCreationOptions,
  ValidationResult,
  ProjectPriority 
} from '@/types/project';
import { projectService } from '@/lib/firebase/project-service';
import { useAuth } from '@/context/AuthContext';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ClientSelector } from './ClientSelector';
import { TeamMemberMultiSelect } from './TeamMemberMultiSelect';
import { CreationSuccessDashboard } from './CreationSuccessDashboard';
import { nanoid } from 'nanoid';

// Alert Component
function Alert({ 
  type = 'error', 
  title, 
  message,
  onDismiss
}: { 
  type?: 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onDismiss?: () => void;
}) {
  const styles = {
    error: 'bg-red-50 text-red-700',
    warning: 'bg-yellow-50 text-yellow-700',
    info: 'bg-blue-50 text-blue-700'
  };

  const icons = {
    error: ExclamationTriangleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'error' ? 'text-red-400' : type === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`} />
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

interface ProjectCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ProjectCreationResult) => void;
  organizationId: string;
}


export function ProjectCreationWizard({ 
  isOpen, 
  onClose, 
  onSuccess, 
  organizationId 
}: ProjectCreationWizardProps) {
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [creationOptions, setCreationOptions] = useState<ProjectCreationOptions | null>(null);
  const [creationResult, setCreationResult] = useState<ProjectCreationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Vereinfachte Wizard-Daten
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientId: '',
    priority: 'medium' as ProjectPriority,
    assignedTeamMembers: [] as string[],
    createCampaignImmediately: false
  });

  // Lade Creation Options beim Öffnen
  useEffect(() => {
    if (isOpen && !creationOptions) {
      loadCreationOptions();
    }
  }, [isOpen, creationOptions]);

  const loadCreationOptions = async () => {
    try {
      setIsLoading(true);
      const options = await projectService.getProjectCreationOptions(organizationId);
      setCreationOptions(options);
    } catch (error) {
      console.error('Fehler beim Laden der Creation Options:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ 
      ...prev, 
      ...updates
    }));
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!formData.title.trim()) {
      setError('Projekt-Titel ist erforderlich');
      return;
    }
    if (!formData.clientId) {
      setError('Bitte wählen Sie einen Kunden aus');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Create simplified wizard data
      const wizardData: ProjectCreationWizardData = {
        title: formData.title,
        description: formData.description,
        clientId: formData.clientId,
        priority: formData.priority,
        color: '#005fab',
        tags: [],
        assignedTeamMembers: formData.assignedTeamMembers,
        projectManager: undefined,
        templateId: undefined,
        customTasks: [],
        startDate: undefined,
        createCampaignImmediately: formData.createCampaignImmediately,
        campaignTitle: formData.createCampaignImmediately ? `${formData.title} - PR-Kampagne` : '',
        initialAssets: [],
        distributionLists: [],
        completedSteps: [1, 2, 3, 4],
        currentStep: 4
      };

      const result = await projectService.createProjectFromWizard(
        wizardData,
        user.uid,
        organizationId
      );

      setCreationResult(result);
      
      if (result.success) {
        onSuccess(result);
      } else {
        const errorDetails = result.error || result.message || 'Unbekannter Fehler';
        setError(`Projekt konnte nicht erstellt werden: ${errorDetails}`);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      setError(errorMessage);
      console.error('Project creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };


  if (!isOpen) return null;

  // Success-Ansicht
  if (creationResult?.success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <CreationSuccessDashboard
            result={creationResult}
            onClose={onClose}
            onGoToProject={(projectId) => {
              window.location.href = `/dashboard/projects/${projectId}`;
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <RocketLaunchIcon className="w-6 h-6 mr-2 text-primary" />
              Neues Projekt erstellen
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
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
        <form onSubmit={handleCreateProject} className="px-6 py-6">
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

            {/* Kunde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kunde *
              </label>
              <ClientSelector
                clients={creationOptions?.availableClients || []}
                selectedClientId={formData.clientId}
                onSelect={(clientId) => updateFormData({ clientId })}
              />
            </div>

            {/* Priorität */}
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


            {/* Team-Mitglieder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team-Mitglieder
              </label>
              <TeamMemberMultiSelect
                teamMembers={creationOptions?.availableTeamMembers || []}
                selectedMembers={formData.assignedTeamMembers}
                onSelectionChange={(members) => updateFormData({ assignedTeamMembers: members })}
              />
            </div>

            {/* PR-Kampagne erstellen */}
            <div className="flex items-start space-x-3">
              <input
                id="createCampaign"
                type="checkbox"
                checked={formData.createCampaignImmediately}
                onChange={(e) => updateFormData({ createCampaignImmediately: e.target.checked })}
                className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <div>
                <label htmlFor="createCampaign" className="text-sm font-medium text-gray-700 cursor-pointer">
                  PR-Kampagne erstellen
                </label>
                <Text className="text-sm text-gray-600 mt-1">
                  Erstellt automatisch eine verknüpfte PR-Kampagne für dieses Projekt.
                </Text>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <Button
              type="button"
              color="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.title || !formData.clientId}
            >
              {isLoading ? 'Erstelle Projekt...' : 'Projekt erstellen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}