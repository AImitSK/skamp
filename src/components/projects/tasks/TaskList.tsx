/**
 * TaskList Component
 *
 * Rendert die Liste aller Tasks für ein Projekt.
 * Zeigt Header, Task-Rows und Empty/Loading States.
 *
 * Features:
 * - Table Header mit Spalten
 * - Task-Rows (wird später durch TaskListItem ersetzt)
 * - Empty State (keine Tasks)
 * - Loading State (Skeleton)
 */

'use client';

import React from 'react';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  ClockIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { ProjectTask } from '@/types/tasks';
import { TaskListItem } from './TaskListItem';
import { TaskTemplateButton } from './TaskTemplateButton';

interface TaskListProps {
  tasks: ProjectTask[];
  isLoading: boolean;
  activeFiltersCount: number;
  viewMode: 'all' | 'mine';
  projectId: string;
  organizationId: string;
  userId: string;
  teamMembers: Array<{
    id: string;       // Firebase Auth UID (userId)
    odcId?: string;   // Firestore Doc ID (für Fallback)
    displayName: string;
    email: string;
    photoUrl?: string;
  }>;
  onEdit: (task: ProjectTask) => void;
  onComplete: (taskId: string, taskTitle: string) => void;
  onReopen: (taskId: string, taskTitle: string) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
  onProgressClick: (task: ProjectTask, event: React.MouseEvent) => void;
  onCreateClick: () => void;
  onTasksInvalidate: () => void;
  formatDate: (date: any) => string;
}

export const TaskList = React.memo(function TaskList({
  tasks,
  isLoading,
  activeFiltersCount,
  viewMode,
  projectId,
  organizationId,
  userId,
  teamMembers,
  onEdit,
  onComplete,
  onReopen,
  onDelete,
  onProgressClick,
  onCreateClick,
  onTasksInvalidate,
  formatDate
}: TaskListProps) {
  const getTeamMember = (assignedUserId: string) => {
    if (!assignedUserId) return undefined;
    // Suche primär nach id (userId), dann nach docId als Fallback
    // Tasks speichern assignedUserId als Firebase Auth UID
    return teamMembers.find(m =>
      m.id === assignedUserId || m.odcId === assignedUserId
    );
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-6 py-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
                <div className="col-span-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
                <div className="col-span-2">
                  <div className="h-3 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                <div className="col-span-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Keine Tasks gefunden
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {(activeFiltersCount > 0 || viewMode === 'mine')
            ? 'Versuche andere Filter oder erstelle eine neue Task.'
            : 'Erstelle die erste Task für dieses Projekt.'
          }
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={onCreateClick}>
            <PlusIcon className="w-4 h-4" />
            Task erstellen
          </Button>
          <TaskTemplateButton
            projectId={projectId}
            organizationId={organizationId}
            userId={userId}
            disabled={isLoading}
            onSuccess={onTasksInvalidate}
          />
        </div>
      </div>
    );
  }

  // Task List
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-12 gap-4 items-center">
          <div className="col-span-6 text-xs font-medium text-gray-600 uppercase tracking-wider">
            Task
          </div>
          <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
            Zugewiesen
          </div>
          <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
            Fortschritt
          </div>
          <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
            Fälligkeit
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {tasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            assignedMember={getTeamMember(task.assignedUserId || '')}
            onEdit={onEdit}
            onComplete={onComplete}
            onReopen={onReopen}
            onDelete={onDelete}
            onProgressClick={onProgressClick}
            formatDate={formatDate}
          />
        ))}
      </div>
    </div>
  );
});
