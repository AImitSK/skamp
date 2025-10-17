// src/components/projects/kanban/card/types.ts
import { Project, PipelineStage } from '@/types/project';

export interface ProjectCardProps {
  project: Project;
  onSelect?: (projectId: string) => void;
  onProjectMove?: (projectId: string, targetStage: PipelineStage) => Promise<void>;
  onProjectAdded?: () => void;
  onProjectDeleted?: () => void;
  onProjectArchived?: () => void;
  onProjectUpdated?: () => void;
  useDraggableProject: (project: Project) => any;
}
