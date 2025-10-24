/**
 * useMyTasks Hook
 *
 * React Query Hook für das Laden von Tasks des aktuellen Users mit Filtern.
 * Wird verwendet vom Dashboard "Meine Aufgaben" Widget.
 *
 * Features:
 * - Automatisches Caching (2min staleTime)
 * - Auto-Refetch bei Window-Focus
 * - Filter: 'all' | 'today' | 'overdue'
 * - Sortierung nach Fälligkeit
 *
 * @example
 * const { data: tasks, isLoading, error } = useMyTasks('today');
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { ProjectTask } from '@/types/tasks';
import { taskService } from '@/lib/firebase/task-service';

export type MyTasksFilter = 'all' | 'today' | 'overdue';

export function useMyTasks(filter: MyTasksFilter = 'all') {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['myTasks', currentOrganization?.id, user?.uid, filter],
    queryFn: async () => {
      if (!currentOrganization || !user) return [];

      // Lade alle Tasks die dem User zugewiesen sind
      const q = query(
        collection(db, 'tasks'),
        where('organizationId', '==', currentOrganization.id),
        where('assignedUserId', '==', user.uid)
      );

      const snapshot = await getDocs(q);
      let tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProjectTask));

      // Lade projectTitle für jede Task
      const projectIds = Array.from(new Set(tasks.map(t => t.projectId).filter(Boolean)));
      const projectTitles: Record<string, string> = {};

      await Promise.all(
        projectIds.map(async (projectId) => {
          try {
            const projectDoc = await getDoc(doc(db, 'projects', projectId));
            if (projectDoc.exists()) {
              projectTitles[projectId] = projectDoc.data().title || '';
            }
          } catch (error) {
            console.error(`Error loading project ${projectId}:`, error);
          }
        })
      );

      // Füge projectTitle zu Tasks hinzu
      tasks = tasks.map(task => ({
        ...task,
        projectTitle: task.projectId ? projectTitles[task.projectId] : undefined
      }));

      // Füge computed fields hinzu (isOverdue, daysUntilDue, etc.)
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      tasks = tasks.map(task => {
        const computedTask = { ...task };

        if (task.dueDate) {
          const dueDate = task.dueDate.toDate();
          dueDate.setHours(0, 0, 0, 0);

          const diffTime = dueDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          computedTask.isOverdue = diffDays < 0 && task.status !== 'completed';
          computedTask.daysUntilDue = diffDays >= 0 ? diffDays : 0;
          computedTask.overdueBy = diffDays < 0 ? Math.abs(diffDays) : 0;
        } else {
          computedTask.isOverdue = false;
          computedTask.daysUntilDue = 0;
          computedTask.overdueBy = 0;
        }

        return computedTask;
      });

      // Filter anwenden
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (filter) {
        case 'today':
          tasks = tasks.filter(task => {
            if (!task.dueDate) return false;
            const dueDate = task.dueDate.toDate();
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          });
          break;

        case 'overdue':
          tasks = tasks.filter(task => task.isOverdue);
          break;

        case 'all':
        default:
          // Keine Filterung, alle Tasks anzeigen
          break;
      }

      // Sortierung nach Fälligkeit
      return tasks.sort((a, b) => {
        // Erledigte Tasks ans Ende
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;

        // Beide haben dueDate -> nach dueDate sortieren
        if (a.dueDate && b.dueDate) {
          return a.dueDate.toMillis() - b.dueDate.toMillis();
        }

        // Nur a hat dueDate -> a kommt zuerst
        if (a.dueDate && !b.dueDate) return -1;

        // Nur b hat dueDate -> b kommt zuerst
        if (!a.dueDate && b.dueDate) return 1;

        // Beide haben kein dueDate -> nach createdAt sortieren
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toMillis() - a.createdAt.toMillis(); // Neueste zuerst
        }

        return 0;
      });
    },
    enabled: !!currentOrganization && !!user,
    staleTime: 2 * 60 * 1000, // 2 Minuten
  });
}
