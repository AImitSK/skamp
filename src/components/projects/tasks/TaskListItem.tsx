/**
 * TaskListItem Component
 *
 * Rendert eine einzelne Task-Row in der Task-Liste.
 * Zeigt Status, Titel, zugewiesene Person, Fortschritt, Fälligkeit und Actions.
 *
 * Features:
 * - Status-Icon (Completed, Overdue, Normal)
 * - Task-Titel (truncated)
 * - Avatar für zugewiesene Person
 * - Progress Bar mit Klick-Handler
 * - Fälligkeitsdatum
 * - Actions Dropdown (Edit, Complete, Delete)
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { TaskDescriptionTooltip } from '@/components/ui/task-description-tooltip';
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { ProjectTask } from '@/types/tasks';

interface TaskListItemProps {
  task: ProjectTask;
  assignedMember?: {
    id: string;
    displayName: string;
    email: string;
    photoUrl?: string;
  };
  onEdit: (task: ProjectTask) => void;
  onComplete: (taskId: string, taskTitle: string) => void;
  onReopen: (taskId: string, taskTitle: string) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
  onProgressClick: (task: ProjectTask, event: React.MouseEvent) => void;
  formatDate: (date: any) => string;
}

export const TaskListItem = React.memo(function TaskListItem({
  task,
  assignedMember,
  onEdit,
  onComplete,
  onReopen,
  onDelete,
  onProgressClick,
  formatDate
}: TaskListItemProps) {
  const t = useTranslations('projects.tasks.listItem');

  // Erledigte Tasks zeigen immer 100% Fortschritt
  const progress = task.status === 'completed' ? 100 : (task.progress || 0);

  // Progress color logic
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-green-500';
    if (percent >= 70) return 'bg-blue-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const progressColor = getProgressColor(progress);
  const isInProgress = task.status === 'in_progress';

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Task - 6 Spalten mit Icon und truncated Text */}
        <div className="col-span-6 flex items-center gap-3">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {task.status === 'completed' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : task.isOverdue ? (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            ) : (
              <ClockIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>

          {/* Task Title mit Beschreibungs-Tooltip */}
          <div className="min-w-0 flex-1">
            <TaskDescriptionTooltip description={task.description}>
              <Text className="text-sm font-medium text-gray-900 truncate">
                {task.title}
              </Text>
            </TaskDescriptionTooltip>
          </div>
        </div>

        {/* Zugewiesen - 2 Spalten */}
        <div className="col-span-2">
          {assignedMember ? (
            <div className="flex items-center gap-2">
              <Avatar
                className="size-6 flex-shrink-0"
                src={assignedMember.photoUrl}
                initials={assignedMember.displayName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
                title={assignedMember.displayName}
              />
              <Text className="text-sm text-gray-700 truncate">
                {assignedMember.displayName}
              </Text>
            </div>
          ) : (
            <Text className="text-sm text-gray-500">-</Text>
          )}
        </div>

        {/* Fortschritt - 2 Spalten */}
        <div className="col-span-2">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              {/* Progress Bar */}
              <div
                className={`bg-gray-200 rounded-full h-3 ${task.status === 'completed' ? 'cursor-default' : 'cursor-pointer'}`}
                onClick={(e) => task.status !== 'completed' && onProgressClick(task, e)}
                title={task.status === 'completed' ? t('progressBar.completed') : t('progressBar.clickToChange')}
              >
                <div
                  className={`${progressColor} rounded-full h-3 transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* In-Progress Animation */}
              {isInProgress && (
                <div className="absolute inset-0 bg-primary opacity-30 rounded-full animate-pulse pointer-events-none"></div>
              )}
            </div>

            {/* Progress Percentage */}
            <Text className="text-xs text-gray-500 flex-shrink-0">
              {Math.round(progress)}%
            </Text>
          </div>
        </div>

        {/* Fälligkeit - 2 Spalten mit Actions */}
        <div className="col-span-2 flex items-center justify-between">
          {/* Due Date */}
          <Text className="text-sm text-gray-700">
            {formatDate(task.dueDate)}
          </Text>

          {/* Actions Dropdown */}
          <Dropdown>
            <DropdownButton plain className="p-1 hover:bg-gray-100 rounded-md">
              <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
            </DropdownButton>
            <DropdownMenu anchor="bottom end">
              {/* Edit */}
              <DropdownItem onClick={() => onEdit(task)}>
                <PencilIcon className="h-4 w-4" />
                {t('actions.edit')}
              </DropdownItem>

              {/* Complete oder Reopen je nach Status */}
              {task.status !== 'completed' ? (
                <DropdownItem onClick={() => onComplete(task.id!, task.title)}>
                  <CheckCircleIcon className="h-4 w-4" />
                  {t('actions.complete')}
                </DropdownItem>
              ) : (
                <DropdownItem onClick={() => onReopen(task.id!, task.title)}>
                  <ArrowPathIcon className="h-4 w-4" />
                  {t('actions.reopen')}
                </DropdownItem>
              )}

              <DropdownDivider />

              {/* Delete */}
              <DropdownItem onClick={() => onDelete(task.id!, task.title)}>
                <TrashIcon className="h-4 w-4" />
                <span className="text-red-600">{t('actions.delete')}</span>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </div>
  );
});
