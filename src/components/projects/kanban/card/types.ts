// src/components/projects/kanban/card/types.ts
import { Project, PipelineStage } from '@/types/project';
import { TeamMember } from '@/types/international';
import { Tag } from '@/types/crm';

export interface ProjectCardProps {
  project: Project;
  onSelect?: (projectId: string) => void;
  onProjectMove?: (projectId: string, targetStage: PipelineStage) => Promise<void>;
  onProjectAdded?: () => void;
  onProjectDeleted?: () => void;
  onProjectArchived?: () => void;
  onProjectUpdated?: () => void;
  useDraggableProject: (project: Project) => any;
  teamMembers?: TeamMember[];
  tags?: Tag[];
}
