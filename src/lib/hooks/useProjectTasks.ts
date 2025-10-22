/**
 * useProjectTasks Hook
 *
 * React Query Hook für das Laden von Projekt-Tasks mit automatischem Caching
 * und Progress-Berechnung.
 *
 * Features:
 * - Automatisches Caching (2min staleTime)
 * - Auto-Refetch bei Window-Focus
 * - Progress-Berechnung optimiert mit useMemo
 * - Error Handling via React Query
 *
 * @example
 * const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);
 */

import { useQuery } from '@tanstack/react-query';
import { taskService } from '@/lib/firebase/task-service';
import { useMemo } from 'react';

interface TaskProgress {
  totalTasks: number;
  completedTasks: number;
  taskCompletion: number;
  criticalTasksRemaining: number;
}

export function useProjectTasks(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  // React Query für Task-Loading
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['project-tasks', projectId, organizationId],
    queryFn: async () => {
      if (!projectId || !organizationId) {
        throw new Error('Missing projectId or organizationId');
      }
      return taskService.getByProjectId(organizationId, projectId);
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 Minuten (Tasks ändern sich häufiger als Projekte)
  });

  // Progress-Berechnung als useMemo (wird nur neu berechnet wenn tasks sich ändern)
  const progress = useMemo<TaskProgress>(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;

    // WICHTIG: "Kritische Tasks" = high/urgent Priority (nicht requiredForStageCompletion)
    // Grund: User-verständlich, Backend-Flag ist für Stage-Transitions
    const criticalTasks = tasks.filter(task =>
      (task.priority === 'urgent' || task.priority === 'high') &&
      task.status !== 'completed'
    ).length;

    return {
      totalTasks,
      completedTasks,
      taskCompletion: totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100),
      criticalTasksRemaining: criticalTasks,
    };
  }, [tasks]);

  return {
    tasks,
    progress,
    isLoading,
    error
  };
}
