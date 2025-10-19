// src/components/projects/edit/steps/types.ts
import { ProjectPriority, PipelineStage, Project } from '@/types/project';
import { Tag } from '@/types/crm';

/**
 * Step-Nummern für den Edit Wizard
 */
export type EditWizardStep = 1 | 2 | 3 | 4;

/**
 * Form Data für den ProjectEditWizard
 * Enthält alle editierbaren Felder eines Projekts
 */
export interface ProjectEditFormData {
  // Step 1: Projekt
  title: string;
  description: string;
  status: string;
  priority: ProjectPriority;
  currentStage: PipelineStage;
  tags: string[]; // Tag IDs

  // Step 2: Kunde
  clientId: string;

  // Step 3: Team
  assignedTeamMembers: string[];
  projectManager: string;

  // Step 4: Kampagnen (wird separat gehandhabt, nicht in formData)
}

/**
 * Base Props für alle Edit Step Komponenten
 */
export interface BaseEditStepProps {
  formData: ProjectEditFormData;
  onUpdate: (updates: Partial<ProjectEditFormData>) => void;
  creationOptions?: any; // ProjectCreationOptions
  project: Project; // Original project für Referenz
}

/**
 * Props für ProjectEditStep (Step 1)
 */
export interface ProjectEditStepProps extends BaseEditStepProps {
  tags: Tag[];
  onCreateTag: (name: string, color: any) => Promise<string>;
}

/**
 * Props für CampaignsEditStep (Step 4)
 */
export interface CampaignsEditStepProps {
  project: Project;
  organizationId: string;
  formData: ProjectEditFormData;
}
