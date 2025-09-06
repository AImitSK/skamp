'use client';

import React, { useState, useEffect } from 'react';
import { 
  RocketLaunchIcon,
  UserGroupIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
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
import { ClientSelector } from './ClientSelector';
import { TeamMemberMultiSelect } from './TeamMemberMultiSelect';
import { ProjectTemplateSelector } from './ProjectTemplateSelector';
import { ResourceInitializationPanel } from './ResourceInitializationPanel';
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

interface WizardStep {
  id: number;
  title: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

export function ProjectCreationWizard({ 
  isOpen, 
  onClose, 
  onSuccess, 
  organizationId 
}: ProjectCreationWizardProps) {
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [creationOptions, setCreationOptions] = useState<ProjectCreationOptions | null>(null);
  const [creationResult, setCreationResult] = useState<ProjectCreationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Wizard-Daten State
  const [wizardData, setWizardData] = useState<ProjectCreationWizardData>({
    title: '',
    description: '',
    clientId: '',
    priority: 'medium',
    color: '#3B82F6',
    tags: [],
    assignedTeamMembers: [],
    projectManager: undefined,
    templateId: undefined,
    customTasks: [],
    startDate: undefined,
    createCampaignImmediately: false,
    campaignTitle: '',
    initialAssets: [],
    distributionLists: [],
    completedSteps: [],
    currentStep: 1
  });

  // Auto-Save zu localStorage
  useEffect(() => {
    if (!isOpen) return;
    
    const saveKey = `project_wizard_${nanoid(8)}`;
    localStorage.setItem(saveKey, JSON.stringify(wizardData));
    
    return () => {
      // Clean up wenn Wizard abgeschlossen
      if (completedSteps.includes(4)) {
        localStorage.removeItem(saveKey);
      }
    };
  }, [wizardData, isOpen, completedSteps]);

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
      // TODO: Fehlerbehandlung für Optionen-Laden implementieren
    } finally {
      setIsLoading(false);
    }
  };

  const updateWizardData = (updates: Partial<ProjectCreationWizardData>) => {
    setWizardData(prev => ({ 
      ...prev, 
      ...updates,
      currentStep: currentStep
    }));
  };

  const validateCurrentStep = async (): Promise<ValidationResult> => {
    return await projectService.validateProjectData(wizardData, currentStep);
  };

  const completeStep = (stepNumber: number) => {
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps(prev => [...prev, stepNumber]);
    }
  };

  const canProceedToStep = (step: number): boolean => {
    if (step === 1) return true;
    return completedSteps.includes(step - 1);
  };

  const handleNextStep = async () => {
    const validation = await validateCurrentStep();
    
    if (!validation.isValid) {
      // Zeige Validierungsfehler an
      console.error('WIZARD Validierungsfehler:', JSON.stringify(validation.errors, null, 2));
      console.error('WIZARD Current step:', currentStep);
      console.error('WIZARD Current data:', JSON.stringify(wizardData, null, 2));
      
      // Set validation errors for UI display
      setValidationErrors(validation.errors);
      return;
    }
    
    // Clear validation errors on successful validation
    setValidationErrors({});

    completeStep(currentStep);
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finaler Schritt - Projekt erstellen
      await handleCreateProject();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateProject = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null); // Reset error state
      
      console.log('=== PROJECT CREATION DEBUG ===');
      console.log('Creating project with data:', JSON.stringify(wizardData, null, 2));
      
      const finalWizardData = {
        ...wizardData,
        completedSteps: [...completedSteps, 4],
        currentStep: 4
      };

      const result = await projectService.createProjectFromWizard(
        finalWizardData,
        user.uid,
        organizationId
      );
      
      console.log('Project creation result:', result);
      console.log('Result success:', result.success);
      console.log('Result error:', result.error);
      console.log('Result full details:', JSON.stringify(result, null, 2));

      setCreationResult(result);
      
      if (result.success) {
        completeStep(4);
        setCurrentStep(5); // Success-Schritt
        onSuccess(result);
      } else {
        // Handle creation failure
        const errorDetails = result.error || result.message || 'Unbekannter Fehler';
        const errorMessage = `Projekt konnte nicht erstellt werden: ${errorDetails}`;
        setError(errorMessage);
        console.error('Project creation failed - Full result:', JSON.stringify(result, null, 2));
      }
    } catch (error: any) {
      // Handle unexpected errors
      const errorMessage = error.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      setError(errorMessage);
      console.error('Project creation error:', error);
    } finally {
      setIsLoading(false);
      console.log('=== END PROJECT CREATION DEBUG ===');
    }
  };

  const steps: WizardStep[] = [
    {
      id: 1,
      title: 'Projekt-Basis',
      icon: <RocketLaunchIcon className="w-6 h-6" />,
      component: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Projekt-Titel *
            </label>
            <input
              type="text"
              value={wizardData.title}
              onChange={(e) => updateWizardData({ title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Produktlaunch Q2 2024"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung
            </label>
            <textarea
              value={wizardData.description}
              onChange={(e) => updateWizardData({ description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Kurze Beschreibung des Projekts..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kunde *
            </label>
            <ClientSelector
              clients={creationOptions?.availableClients || []}
              selectedClientId={wizardData.clientId}
              onSelect={(clientId) => updateWizardData({ clientId })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priorität
            </label>
            <select
              value={wizardData.priority}
              onChange={(e) => updateWizardData({ priority: e.target.value as ProjectPriority })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
              <option value="urgent">Dringend</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              placeholder="Tags durch Komma getrennt"
              onChange={(e) => {
                const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                updateWizardData({ tags });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: 'Team-Zuordnung',
      icon: <UserGroupIcon className="w-6 h-6" />,
      component: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team-Mitglieder *
            </label>
            <TeamMemberMultiSelect
              teamMembers={creationOptions?.availableTeamMembers || []}
              selectedMembers={wizardData.assignedTeamMembers}
              onSelectionChange={(members) => updateWizardData({ assignedTeamMembers: members })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Projekt-Manager
            </label>
            <select
              value={wizardData.projectManager || ''}
              onChange={(e) => updateWizardData({ projectManager: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Automatisch zuweisen</option>
              {wizardData.assignedTeamMembers.map(memberId => {
                const member = creationOptions?.availableTeamMembers.find(m => m.id === memberId);
                return member ? (
                  <option key={member.id} value={member.id}>
                    {member.displayName} ({member.role})
                  </option>
                ) : null;
              })}
            </select>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Template & Setup',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      component: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Projekt-Template
            </label>
            <ProjectTemplateSelector
              templates={creationOptions?.availableTemplates || []}
              selectedTemplateId={wizardData.templateId}
              onSelect={(templateId) => updateWizardData({ templateId })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Startdatum
            </label>
            <input
              type="date"
              value={wizardData.startDate ? wizardData.startDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : undefined;
                updateWizardData({ startDate: date });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: 'Ressourcen',
      icon: <Cog6ToothIcon className="w-6 h-6" />,
      component: (
        <ResourceInitializationPanel
          wizardData={wizardData}
          onUpdate={updateWizardData}
          distributionLists={creationOptions?.availableDistributionLists || []}
          availableAssets={creationOptions?.availableAssets || []}
        />
      )
    }
  ];

  if (!isOpen) return null;

  // Success-Ansicht
  if (creationResult && currentStep === 5) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <CreationSuccessDashboard
            result={creationResult}
            onClose={onClose}
            onGoToProject={(projectId) => {
              // Navigation zur Projekt-Seite
              window.location.href = `/dashboard/projects/${projectId}`;
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Neues Projekt erstellen
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Schließen</span>
              ×
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="px-6 py-4">
            <Alert
              type="error"
              title="Fehler bei der Projekt-Erstellung"
              message={error}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Validation Errors Alert */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="px-6 py-4">
            <Alert
              type="warning"
              title="Bitte korrigieren Sie die folgenden Fehler:"
              message={Object.values(validationErrors).join(', ')}
              onDismiss={() => setValidationErrors({})}
            />
          </div>
        )}

        {/* Progress Indicator */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${
                  index < steps.length - 1 ? 'flex-1' : ''
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    completedSteps.includes(step.id)
                      ? 'bg-green-500 border-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {completedSteps.includes(step.id) ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    step.icon
                  )}
                </div>
                
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    completedSteps.includes(step.id)
                      ? 'text-green-600'
                      : currentStep === step.id
                      ? 'text-blue-600'
                      : 'text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                </div>

                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    completedSteps.includes(step.id)
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            steps.find(step => step.id === currentStep)?.component
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handlePreviousStep}
            disabled={currentStep === 1}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Zurück
          </button>

          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              Schritt {currentStep} von {steps.length}
            </span>
            
            <button
              onClick={handleNextStep}
              disabled={isLoading}
              className="flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === steps.length ? 'Projekt erstellen' : 'Weiter'}
              {currentStep < steps.length && <ArrowRightIcon className="w-4 h-4 ml-2" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}