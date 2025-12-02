// src/lib/hooks/useProjectData.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/lib/firebase/project-service';
import { kanbanBoardService } from '@/lib/kanban/kanban-board-service';
import { Project, PipelineStage } from '@/types/project';

/**
 * Hook zum Laden aller Projekte einer Organisation
 */
export function useProjects(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['projects', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization');
      return projectService.getAll({ organizationId });
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5min Cache
  });
}

/**
 * Hook zum Laden eines einzelnen Projekts
 */
export function useProject(projectId: string | undefined, organizationId?: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      // organizationId ist optional - falls nicht verfügbar, wird aus Projekt-Daten geladen
      return projectService.getById(projectId, { organizationId: organizationId || 'default' });
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook zum Laden von Projekten nach Stage
 */
export function useProjectsByStage(organizationId: string | undefined, stage: PipelineStage) {
  return useQuery({
    queryKey: ['projects', organizationId, 'stage', stage],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization');
      const allProjects = await projectService.getAll({ organizationId });
      return allProjects.filter(p => p.currentStage === stage);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook zum Verschieben eines Projekts zwischen Stages
 */
export function useMoveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      currentStage,
      targetStage,
      userId,
      organizationId
    }: {
      projectId: string;
      currentStage: PipelineStage;
      targetStage: PipelineStage;
      userId: string;
      organizationId: string;
    }) => {
      return kanbanBoardService.moveProject(
        projectId,
        currentStage,
        targetStage,
        userId,
        organizationId
      );
    },
    onMutate: async ({ projectId, targetStage, organizationId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['projects', organizationId] });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData(['projects', organizationId]);

      // Optimistic Update: Stage sofort ändern
      queryClient.setQueryData(['projects', organizationId], (old: Project[] = []) =>
        old.map((p) => p.id === projectId ? { ...p, currentStage: targetStage } : p)
      );

      return { previousProjects };
    },
    onError: (err, variables, context) => {
      // Rollback bei Fehler
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects', variables.organizationId], context.previousProjects);
      }
    },
    onSettled: (_, __, variables) => {
      // Background refetch für Konsistenz
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.organizationId]
      });
    },
  });
}

/**
 * Hook zum Löschen eines Projekts
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, organizationId }: { projectId: string; organizationId: string }) => {
      await projectService.delete(projectId, { organizationId });
    },
    onMutate: async ({ projectId, organizationId }) => {
      // Optimistic Update: Projekt sofort aus UI entfernen
      await queryClient.cancelQueries({ queryKey: ['projects', organizationId] });

      const previousProjects = queryClient.getQueryData(['projects', organizationId]);

      queryClient.setQueryData(['projects', organizationId], (old: Project[] = []) =>
        old.filter((p) => p.id !== projectId)
      );

      return { previousProjects };
    },
    onError: (err, variables, context) => {
      // Rollback bei Fehler
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects', variables.organizationId], context.previousProjects);
      }
    },
    onSettled: (_, __, variables) => {
      // Immer neu laden nach Mutation
      queryClient.invalidateQueries({ queryKey: ['projects', variables.organizationId] });
    },
  });
}

/**
 * Hook zum Archivieren eines Projekts
 */
export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      organizationId,
      userId
    }: {
      projectId: string;
      organizationId: string;
      userId: string;
    }) => {
      await projectService.archive(projectId, { organizationId, userId });
    },
    onMutate: async ({ projectId, organizationId }) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['projects', organizationId] });

      const previousProjects = queryClient.getQueryData(['projects', organizationId]);

      queryClient.setQueryData(['projects', organizationId], (old: Project[] = []) =>
        old.map((p) => (p.id === projectId ? { ...p, status: 'archived' } : p))
      );

      return { previousProjects };
    },
    onError: (err, variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects', variables.organizationId], context.previousProjects);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.organizationId] });
    },
  });
}

/**
 * Hook zum Aktualisieren eines Projekts
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      projectData,
      organizationId,
      userId
    }: {
      projectId: string;
      projectData: Partial<Project>;
      organizationId: string;
      userId: string;
    }) => {
      await projectService.update(projectId, projectData, { organizationId, userId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects', variables.organizationId]
      });
      queryClient.invalidateQueries({
        queryKey: ['project', variables.projectId]
      });
    },
  });
}
