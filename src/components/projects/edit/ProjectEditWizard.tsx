'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PencilIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { Project } from '@/types/project';
import { projectService } from '@/lib/firebase/project-service';
import { tagsService } from '@/lib/firebase/tags-service';
import { useAuth } from '@/context/AuthContext';
import { Tag } from '@/types/crm';
import { Alert } from '@/components/common/Alert';
import { useUpdateProject } from '@/lib/hooks/useProjectData';
import { Timestamp } from 'firebase/firestore';

// Step Components
import {
  ProjectEditStep,
  ClientEditStep,
  TeamEditStep,
  CampaignsEditStep
} from './steps';
import { EditWizardStep, ProjectEditFormData } from './steps/types';

// Navigation Components
import { StepTabs } from '../creation/components/StepTabs';
import { StepActions } from '../creation/components/StepActions';

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
  const updateProject = useUpdateProject();

  // Multi-Step State
  const [currentStep, setCurrentStep] = useState<EditWizardStep>(1);
  const [completedSteps, setCompletedSteps] = useState<EditWizardStep[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [creationOptions, setCreationOptions] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);

  // Form Data State
  const [formData, setFormData] = useState<ProjectEditFormData>({
    // Step 1: Projekt
    title: '',
    description: '',
    status: 'active',
    priority: 'medium',
    currentStage: 'ideas_planning',
    tags: [],

    // Step 2: Kunde
    clientId: '',

    // Step 3: Team
    assignedTeamMembers: [],
    projectManager: ''
  });

  // Initialisiere Form beim Öffnen
  useEffect(() => {
    if (isOpen && project) {
      // Reset state
      setError(null);
      setSuccessMessage(null);
      setCurrentStep(1);
      setCompletedSteps([]);

      // Initialisiere Form-Daten mit Projekt-Werten
      const assignedMembers = project.assignedTo || [];
      const projectMgr = project.projectManager || '';

      // Stelle sicher, dass projectManager in assignedTeamMembers ist
      const finalAssignedMembers = projectMgr && !assignedMembers.includes(projectMgr)
        ? [...assignedMembers, projectMgr]
        : assignedMembers;

      setFormData({
        title: project.title || '',
        description: project.description || '',
        status: project.status || 'active',
        priority: (project as any).priority || 'medium',
        currentStage: project.currentStage || 'ideas_planning',
        tags: (project as any).tags || [],
        clientId: project.customer?.id || '',
        assignedTeamMembers: finalAssignedMembers,
        projectManager: projectMgr
      });

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
    if (!organizationId) return;
    try {
      const userTags = await tagsService.getAll(organizationId, user?.uid);
      setTags(userTags);
    } catch (error) {
      console.error('Fehler beim Laden der Tags:', error);
    }
  };

  const handleCreateTag = async (name: string, color: any): Promise<string> => {
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

  const updateFormData = (updates: Partial<ProjectEditFormData>) => {
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
        // Kunde: Optional für Edit
        return true;
      case 3:
        // Team: Optional
        return true;
      case 4:
        // Kampagnen: Immer valid
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
    setCurrentStep((prev) => Math.min(4, prev + 1) as EditWizardStep);
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1) as EditWizardStep);
  };

  const handleStepChange = (step: number) => {
    // Edit-Modus: Erlaube freie Navigation zu allen Steps
    // (Daten wurden bereits beim Erstellen validiert)
    setCurrentStep(step as EditWizardStep);
  };

  const handleSaveProject = async () => {
    if (!user || !project.id || !isStepValid) return;

    setError(null);

    const updateData: Partial<Project> = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      currentStage: formData.currentStage,
      assignedTo: formData.assignedTeamMembers,
      updatedAt: Timestamp.now(),
      updatedBy: user.uid
    };

    // Add optional fields
    (updateData as any).priority = formData.priority || 'medium';
    (updateData as any).tags = formData.tags;

    // projectManager nur setzen wenn vorhanden, sonst Feld komplett weglassen
    if (formData.projectManager) {
      updateData.projectManager = formData.projectManager;
    } else {
      // Wenn leer, explizit auf null setzen um das Feld zu löschen
      updateData.projectManager = null as any;
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

    updateProject.mutate(
      {
        projectId: project.id,
        projectData: updateData,
        organizationId: organizationId,
        userId: user.uid
      },
      {
        onSuccess: () => {
          setSuccessMessage('Projekt erfolgreich aktualisiert');

          // Call success callback with updated project
          const updatedProject = { ...project, ...updateData };
          onSuccess(updatedProject);

          // Auto-close after short delay
          setTimeout(() => {
            onClose();
          }, 1500);
        },
        onError: (error: any) => {
          console.error('Fehler beim Speichern:', error);
          setError(`Fehler beim Speichern des Projekts: ${error.message || 'Unbekannter Fehler'}`);
        }
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
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

        {/* Tab Navigation */}
        <StepTabs
          currentStep={currentStep}
          onStepChange={handleStepChange}
          completedSteps={completedSteps}
          stepLabels={['Projekt', 'Kunde', 'Team', 'Kampagnen']}
          allowAllSteps={true}
        />

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

        {/* Step Content */}
        <div className="px-6 py-6 h-[500px] overflow-y-auto">
          {currentStep === 1 && (
            <ProjectEditStep
              formData={formData}
              onUpdate={updateFormData}
              creationOptions={creationOptions}
              project={project}
              tags={tags}
              onCreateTag={handleCreateTag}
            />
          )}
          {currentStep === 2 && (
            <ClientEditStep
              formData={formData}
              onUpdate={updateFormData}
              creationOptions={creationOptions}
              project={project}
            />
          )}
          {currentStep === 3 && (
            <TeamEditStep
              formData={formData}
              onUpdate={updateFormData}
              creationOptions={creationOptions}
              project={project}
            />
          )}
          {currentStep === 4 && (
            <CampaignsEditStep
              project={project}
              organizationId={organizationId}
              formData={formData}
            />
          )}
        </div>

        {/* Actions */}
        <StepActions
          currentStep={currentStep}
          totalSteps={4}
          isLoading={updateProject.isPending}
          isStepValid={isStepValid}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onCancel={onClose}
          onSubmit={handleSaveProject}
          submitLabel="Änderungen speichern"
          showSubmitOnAllSteps={true}
        />
      </div>
    </div>
  );
}
