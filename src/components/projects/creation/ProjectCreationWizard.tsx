'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ProjectPriority
} from '@/types/project';
import { projectService } from '@/lib/firebase/project-service';
import { tagsService } from '@/lib/firebase/tags-service';
import { useAuth } from '@/context/AuthContext';
import { Text } from '@/components/ui/text';
import { CreationSuccessDashboard } from './CreationSuccessDashboard';
import { Tag, TagColor } from '@/types/crm';

// Step Components
import { ProjectStep, ClientStep, TeamStep } from './steps';
import { WizardStep, ProjectCreationFormData } from './steps/types';

// Navigation Components
import { StepTabs } from './components/StepTabs';
import { StepActions } from './components/StepActions';

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

  // Multi-Step State
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [completedSteps, setCompletedSteps] = useState<WizardStep[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [creationOptions, setCreationOptions] = useState<ProjectCreationOptions | null>(null);
  const [creationResult, setCreationResult] = useState<ProjectCreationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);

  // Form Data State
  const [formData, setFormData] = useState<ProjectCreationFormData>({
    // Step 1: Projekt
    title: '',
    description: '',
    priority: 'medium' as ProjectPriority,
    tags: [],
    createCampaignImmediately: true, // Default: AN

    // Step 2: Kunde
    clientId: '',

    // Step 3: Team
    assignedTeamMembers: [],
    projectManager: ''
  });

  // Load Creation Options und Tags beim Öffnen
  useEffect(() => {
    if (isOpen) {
      // Reset state when opening
      setCreationResult(null);
      setError(null);
      setCurrentStep(1);
      setCompletedSteps([]);

      // Reset form data
      setFormData({
        title: '',
        description: '',
        priority: 'medium' as ProjectPriority,
        tags: [],
        createCampaignImmediately: true, // Default: AN
        clientId: '',
        assignedTeamMembers: [],
        projectManager: ''
      });

      if (!creationOptions) {
        loadCreationOptions();
      }

      if (user?.uid) {
        loadTags();
      }
    }
  }, [isOpen, user?.uid]);

  // Auto-select current user as team member AND project manager when creationOptions loads
  useEffect(() => {
    console.log('=== AUTO-SELECT USER DEBUG ===');
    console.log('isOpen:', isOpen);
    console.log('user?.uid:', user?.uid);
    console.log('creationOptions?.availableTeamMembers:', creationOptions?.availableTeamMembers?.length);

    if (isOpen && user?.uid && creationOptions?.availableTeamMembers && creationOptions.availableTeamMembers.length > 0) {
      const userMember = creationOptions.availableTeamMembers.find(member =>
        member.id.includes(user.uid)
      );

      console.log('userMember found:', userMember?.displayName, userMember?.id);

      if (userMember) {
        setFormData(prev => {
          console.log('prev.projectManager:', prev.projectManager);
          console.log('prev.assignedTeamMembers:', prev.assignedTeamMembers);

          // Only set if not already set (to avoid infinite loop)
          if (prev.projectManager === '' && prev.assignedTeamMembers.length === 0) {
            console.log('✅ AUTO-SELECTING USER:', user.uid, userMember.id);
            return {
              ...prev,
              assignedTeamMembers: [user.uid],
              projectManager: userMember.id
            };
          }
          console.log('⚠️ SKIPPING AUTO-SELECT (already set)');
          return prev;
        });
      } else {
        console.log('❌ USER MEMBER NOT FOUND');
      }
    } else {
      console.log('❌ CONDITIONS NOT MET');
    }
    console.log('=== END AUTO-SELECT DEBUG ===');
  }, [isOpen, user?.uid, creationOptions]);

  const loadCreationOptions = async () => {
    try {
      setIsLoading(true);
      const options = await projectService.getProjectCreationOptions(organizationId);
      setCreationOptions(options);
    } catch (error) {
      console.error('Failed to load creation options:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTags = async () => {
    if (!organizationId) return;
    try {
      const userTags = await tagsService.getAll(organizationId, user?.uid);
      setTags(userTags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleCreateTag = async (name: string, color: TagColor): Promise<string> => {
    if (!organizationId) throw new Error('Organisation nicht gefunden');

    try {
      const tagId = await tagsService.create(
        { name, color },
        organizationId
      );

      await loadTags();
      return tagId;
    } catch (error) {
      throw error;
    }
  };

  const updateFormData = (updates: Partial<ProjectCreationFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  };

  // Step Validation
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        // Projekt: Titel min 3 Zeichen
        return formData.title.trim().length >= 3;
      case 2:
        // Kunde: ClientId erforderlich
        return !!formData.clientId;
      case 3:
        // Team: Optional, immer valid
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  // Navigation Handlers
  const handleNext = () => {
    if (!isStepValid) return;

    // Mark current step as completed
    setCompletedSteps(prev => [...new Set([...prev, currentStep])]);

    // Move to next step
    setCurrentStep((prev) => Math.min(3, prev + 1) as WizardStep);
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1) as WizardStep);
  };

  const handleStepChange = (step: WizardStep) => {
    // Allow navigating to completed steps or current step
    if (completedSteps.includes(step) || step <= currentStep) {
      setCurrentStep(step);
    }
  };

  const handleCreateProject = async () => {
    if (!user || !isStepValid) return;

    try {
      setIsLoading(true);
      setError(null);

      // Create wizard data from formData
      const wizardData: ProjectCreationWizardData = {
        title: formData.title,
        description: formData.description,
        clientId: formData.clientId,
        priority: formData.priority,
        color: '#005fab',
        tags: formData.tags,
        assignedTeamMembers: formData.assignedTeamMembers,
        projectManager: formData.projectManager || undefined,
        templateId: undefined,
        customTasks: [],
        startDate: undefined,
        createCampaignImmediately: formData.createCampaignImmediately,
        campaignTitle: formData.createCampaignImmediately
          ? `${formData.title} - PR-Kampagne`
          : '',
        initialAssets: [],
        distributionLists: [],
        completedSteps: [1, 2, 3],
        currentStep: 3
      };

      const result = await projectService.createProjectFromWizard(
        wizardData,
        user.uid,
        organizationId
      );

      if (result.success) {
        setCreationResult(result);
        onSuccess(result);
      } else {
        const errorDetails = result.error || (result as any).message || 'Unbekannter Fehler';
        setError(`Projekt konnte nicht erstellt werden: ${errorDetails}`);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      setError(errorMessage);
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
            onClose={() => {
              setCreationResult(null);
              onClose();
            }}
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
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

        {/* Tab Navigation */}
        <StepTabs
          currentStep={currentStep}
          onStepChange={handleStepChange}
          completedSteps={completedSteps}
        />

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

        {/* Step Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          {currentStep === 1 && (
            <ProjectStep
              formData={formData}
              onUpdate={updateFormData}
              creationOptions={creationOptions}
              tags={tags}
              onCreateTag={handleCreateTag}
            />
          )}
          {currentStep === 2 && (
            <ClientStep
              formData={formData}
              onUpdate={updateFormData}
              creationOptions={creationOptions}
            />
          )}
          {currentStep === 3 && (
            <TeamStep
              formData={formData}
              onUpdate={updateFormData}
              creationOptions={creationOptions}
            />
          )}
        </div>

        {/* Actions */}
        <StepActions
          currentStep={currentStep}
          isLoading={isLoading}
          isStepValid={isStepValid}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onCancel={onClose}
          onSubmit={handleCreateProject}
        />
      </div>
    </div>
  );
}
