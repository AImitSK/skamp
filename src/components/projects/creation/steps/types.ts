// src/components/projects/creation/steps/types.ts
// Shared Types für alle Wizard Steps

import { ProjectPriority, ProjectCreationOptions } from '@/types/project';
import { Tag } from '@/types/crm';

export type WizardStep = 1 | 2 | 3;

export interface StepConfig {
  id: WizardStep;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface BaseStepProps {
  formData: ProjectCreationFormData;
  onUpdate: (updates: Partial<ProjectCreationFormData>) => void;
  creationOptions: ProjectCreationOptions | null;
}

export interface ProjectCreationFormData {
  // Step 1: Projekt
  title: string;
  description: string;
  priority: ProjectPriority;
  tags: string[];
  createCampaignImmediately: boolean;

  // Step 2: Kunde
  clientId: string;

  // Step 3: Team
  assignedTeamMembers: string[];
  projectManager: string;
}

export interface ProjectStepProps extends BaseStepProps {
  tags: Tag[];
  onCreateTag: (name: string, color: any) => Promise<string>;
}
