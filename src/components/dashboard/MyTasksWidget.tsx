/**
 * MyTasksWidget Component
 *
 * Wiederverwendbares Widget für "Meine Aufgaben" im Dashboard.
 * Zeigt Tasks des aktuellen Users mit Filtern und Pagination.
 *
 * Features:
 * - Filter: Alle, Heute, Überfällig
 * - Pagination (5 Tasks pro Seite)
 * - Loading & Empty States
 * - React Query Integration via useMyTasks Hook
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { TaskDescriptionTooltip } from '@/components/ui/task-description-tooltip';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useMyTasks, MyTasksFilter } from '@/lib/hooks/useMyTasks';
import { ProjectTask } from '@/types/tasks';

const TASKS_PER_PAGE = 5;

export function MyTasksWidget() {
  const [filter, setFilter] = useState<MyTasksFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // React Query Hook
  const { data: tasks = [], isLoading } = useMyTasks(filter);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Pagination
  const totalPages = Math.ceil(tasks.length / TASKS_PER_PAGE);
  const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
  const paginatedTasks = tasks.slice(startIndex, startIndex + TASKS_PER_PAGE);

  // Progress color helper
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-green-500';
    if (percent >= 70) return 'bg-blue-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Count tasks for filter badges
  const todayCount = tasks.filter(task => {
    if (!task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = task.dueDate.toDate();
    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);
    return dueDateOnly.getTime() === today.getTime();
  }).length;

  const overdueCount = tasks.filter(task => task.isOverdue).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <Heading level={2}>Meine Aufgaben</Heading>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'today'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              Heute
              {todayCount > 0 && (
                <Badge color="blue" className="ml-2">
                  {todayCount}
                </Badge>
              )}
            </button>

            <button
              onClick={() => setFilter('overdue')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'overdue'
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              Überfällig
              {overdueCount > 0 && (
                <Badge color="red" className="ml-2">
                  {overdueCount}
                </Badge>
              )}
            </button>

            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50 transition-colors"
              >
                Alle anzeigen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden flex flex-col" style={{ minHeight: '400px' }}>
        {isLoading ? (
          <>
            {/* Loading State */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <Text className="text-zinc-600">Tasks werden geladen...</Text>
              </div>
            </div>
            {/* Pagination Placeholder */}
            <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-end gap-1">
                <button
                  disabled
                  className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-3 w-3" />
                </button>
                <button
                  disabled
                  className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed"
                >
                  <ChevronRightIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          </>
        ) : tasks.length === 0 ? (
          <>
            {/* Empty State */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <CheckCircleIcon className="h-12 w-12 mx-auto text-zinc-300 mb-3" />
                <Text className="text-zinc-600 font-medium">
                  {filter === 'today' && 'Keine Tasks für heute'}
                  {filter === 'overdue' && 'Keine überfälligen Tasks'}
                  {filter === 'all' && 'Keine offenen Tasks'}
                </Text>
              </div>
            </div>
            {/* Pagination Placeholder */}
            <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-end gap-1">
                <button
                  disabled
                  className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-3 w-3" />
                </button>
                <button
                  disabled
                  className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 opacity-30 cursor-not-allowed"
                >
                  <ChevronRightIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Table Header */}
            <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Task
                </div>
                <div className="col-span-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Projekt
                </div>
                <div className="col-span-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Fortschritt
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-200">
              {paginatedTasks.map((task) => (
                <div
                  key={task.id}
                  className="px-6 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Task */}
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {task.status === 'completed' ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : task.isOverdue ? (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                        ) : (
                          <ClockIcon className="h-5 w-5 text-orange-500" />
                        )}
                      </div>

                      {/* Task Title mit Beschreibungs-Tooltip */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <TaskDescriptionTooltip description={task.description}>
                            <Text className="text-sm font-medium text-zinc-900 truncate whitespace-nowrap overflow-hidden text-ellipsis">
                              {task.title}
                            </Text>
                          </TaskDescriptionTooltip>
                          {task.priority === 'urgent' && (
                            <Badge color="red" className="text-xs flex-shrink-0">Dringend</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Projekt */}
                    <div className="col-span-4 min-w-0">
                      {task.projectId && task.projectTitle ? (
                        <Link
                          href={`/dashboard/projects/${task.projectId}`}
                          className="text-sm text-primary hover:text-primary-hover hover:underline truncate whitespace-nowrap overflow-hidden text-ellipsis block"
                          title={task.projectTitle}
                        >
                          {task.projectTitle}
                        </Link>
                      ) : (
                        <Text className="text-sm text-zinc-500">—</Text>
                      )}
                    </div>

                    {/* Fortschritt */}
                    <div className="col-span-3">
                      {(() => {
                        // Erledigte Tasks zeigen immer 100% Fortschritt
                        const progress = task.status === 'completed' ? 100 : (task.progress || 0);
                        return (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-zinc-200 rounded-full h-2">
                              <div
                                className={`${getProgressColor(progress)} rounded-full h-2 transition-all duration-500`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <Text className="text-xs text-zinc-500 w-10 text-right">
                              {Math.round(progress)}%
                            </Text>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || totalPages <= 1}
                  className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="h-3 w-3" />
                </button>

                {totalPages > 1 && Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage === 1) {
                    pageNum = i + 1;
                  } else if (currentPage === totalPages) {
                    pageNum = totalPages - 2 + i;
                  } else {
                    pageNum = currentPage - 1 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {totalPages > 3 && currentPage < totalPages - 1 && (
                  <span className="text-zinc-500 text-xs">...</span>
                )}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  className="p-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRightIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
