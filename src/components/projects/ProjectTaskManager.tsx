// src/components/projects/ProjectTaskManager.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import {
  PlusIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { taskService } from '@/lib/firebase/task-service';
import { ProjectTask, TaskFilters, TaskStatus, TaskPriority } from '@/types/tasks';
import { TeamMember } from '@/types/international';
import { TaskCreateModal } from './TaskCreateModal';
import { TaskEditModal } from './TaskEditModal';
import { Timestamp } from 'firebase/firestore';

interface ProjectTaskManagerProps {
  projectId: string;
  organizationId: string;
  projectManagerId: string;
  teamMembers: TeamMember[];
  projectTeamMemberIds?: string[]; // Nur die dem Projekt zugewiesenen Team-Mitglieder
  projectTitle?: string;
}

export function ProjectTaskManager({
  projectId,
  organizationId,
  projectManagerId,
  teamMembers,
  projectTeamMemberIds,
  projectTitle
}: ProjectTaskManagerProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({
    teamTasks: true,
    assignedToMe: false,
    assignedUserId: user?.uid
  });

  // Load tasks
  const loadTasks = useCallback(async () => {
    if (!organizationId || !projectId) return;

    try {
      setLoading(true);
      const projectTasks = await taskService.getByProject(projectId, organizationId);
      setTasks(projectTasks);
    } catch (error) {
      console.error('Error loading project tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, organizationId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Filter tasks based on current filters
  const filteredTasks = tasks.filter(task => {
    if (filters.assignedToMe && task.assignedUserId !== user?.uid) return false;
    if (filters.today) {
      if (!task.dueDate) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = task.dueDate.toDate();
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }
    if (filters.overdue && !task.isOverdue) return false;
    return true;
  });

  // Get team member info
  const getTeamMember = (userId: string) => {
    return teamMembers.find(member => member.userId === userId || member.id === userId);
  };

  // Get only project team members for task assignment
  const getProjectTeamMembers = () => {
    if (!projectTeamMemberIds || projectTeamMemberIds.length === 0) {
      // Fallback: include project manager at minimum
      return teamMembers.filter(member =>
        member.userId === projectManagerId || member.id === projectManagerId
      );
    }

    return teamMembers.filter(member =>
      projectTeamMemberIds.includes(member.userId || '') ||
      projectTeamMemberIds.includes(member.id || '') ||
      member.userId === projectManagerId || // Always include project manager
      member.id === projectManagerId
    );
  };

  // Handle task completion
  const handleCompleteTask = async (taskId: string) => {
    try {
      await taskService.markAsCompleted(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Task wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      await taskService.delete(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Handle progress click
  const handleProgressClick = async (task: ProjectTask, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const clickPosition = (event.clientX - rect.left) / rect.width;
    const newProgress = Math.round(clickPosition * 100);

    try {
      await taskService.updateProgress(task.id!, newProgress);
      await loadTasks();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  // Get priority color
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'zinc';
    }
  };

  // Get priority label
  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return 'Dringend';
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      default: return '-';
    }
  };

  // Get status color
  const getStatusColor = (task: ProjectTask) => {
    if (task.status === 'completed') return 'green';
    if (task.isOverdue) return 'red';
    if (task.daysUntilDue === 0) return 'orange'; // Due today
    return 'zinc';
  };

  // Get status label
  const getStatusLabel = (task: ProjectTask) => {
    if (task.status === 'completed') return 'Erledigt';
    if (task.isOverdue) return `+${task.overdueBy}T`;
    if (task.daysUntilDue === 0) return 'Heute';
    if (task.daysUntilDue === 1) return 'Morgen';
    if (task.daysUntilDue && task.daysUntilDue <= 7) return `${task.daysUntilDue}T`;
    return 'Offen';
  };

  // Format date
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return '-';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Projekt-Tasks</Heading>
          <Text className="text-gray-600">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'}
            {filters.assignedToMe && ' (Meine Tasks)'}
            {filters.today && ' (Heute fällig)'}
            {filters.overdue && ' (Überfällig)'}
          </Text>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#005fab] hover:bg-[#004a8c] text-white"
        >
          <PlusIcon className="w-4 h-4" />
          Task erstellen
        </Button>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          plain={!filters.teamTasks}
          onClick={() => setFilters(prev => ({ ...prev, teamTasks: !prev.teamTasks, assignedToMe: false }))}
          className={filters.teamTasks ? 'bg-blue-100 text-blue-700' : ''}
        >
          Alle Team-Tasks
        </Button>
        <Button
          plain={!filters.assignedToMe}
          onClick={() => setFilters(prev => ({
            ...prev,
            assignedToMe: !prev.assignedToMe,
            teamTasks: false,
            assignedUserId: user?.uid
          }))}
          className={filters.assignedToMe ? 'bg-green-100 text-green-700' : ''}
        >
          Meine Tasks
        </Button>
        <Button
          plain={!filters.today}
          onClick={() => setFilters(prev => ({ ...prev, today: !prev.today }))}
          className={filters.today ? 'bg-orange-100 text-orange-700' : ''}
        >
          <CalendarDaysIcon className="w-4 h-4" />
          Heute fällig
        </Button>
        <Button
          plain={!filters.overdue}
          onClick={() => setFilters(prev => ({ ...prev, overdue: !prev.overdue }))}
          className={filters.overdue ? 'bg-red-100 text-red-700' : ''}
        >
          <ExclamationTriangleIcon className="w-4 h-4" />
          Überfällig
        </Button>
      </div>

      {/* Task Table */}
      {filteredTasks.length > 0 ? (
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
            {filteredTasks.map((task) => {
              const assignedMember = getTeamMember(task.assignedUserId || '');

              return (
                <div key={task.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Task - 6 Spalten mit Icon und truncated Text */}
                    <div className="col-span-6 flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {task.status === 'completed' ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : task.isOverdue ? (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                        ) : (
                          <ClockIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Text className="text-sm font-medium text-gray-900 truncate" title={task.title}>
                          {task.title}
                        </Text>
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
                        <div
                          className="flex-1 bg-gray-200 rounded-full h-2 cursor-pointer"
                          onClick={(e) => handleProgressClick(task, e)}
                          title="Klicken um Fortschritt zu ändern"
                        >
                          <div
                            className={`h-2 rounded-full transition-all ${
                              (task.progress || 0) === 100 ? 'bg-green-600' :
                              (task.progress || 0) >= 75 ? 'bg-blue-600' :
                              (task.progress || 0) >= 50 ? 'bg-yellow-600' :
                              (task.progress || 0) >= 25 ? 'bg-orange-600' : 'bg-gray-400'
                            }`}
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <Text className="text-xs text-gray-500 flex-shrink-0">
                          {task.progress || 0}%
                        </Text>
                      </div>
                    </div>

                    {/* Fälligkeit - 2 Spalten mit Actions */}
                    <div className="col-span-2 flex items-center justify-between">
                      <Text className="text-sm text-gray-700">
                        {formatDate(task.dueDate)}
                      </Text>
                      <Dropdown>
                        <DropdownButton plain className="p-1 hover:bg-gray-100 rounded-md">
                          <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          <DropdownItem onClick={() => setEditingTask(task)}>
                            <PencilIcon className="h-4 w-4" />
                            Bearbeiten
                          </DropdownItem>
                          {task.status !== 'completed' && (
                            <DropdownItem onClick={() => handleCompleteTask(task.id!)}>
                              <CheckCircleIcon className="h-4 w-4" />
                              Als erledigt markieren
                            </DropdownItem>
                          )}
                          <DropdownDivider />
                          <DropdownItem onClick={() => handleDeleteTask(task.id!)}>
                            <TrashIcon className="h-4 w-4" />
                            <span className="text-red-600">Löschen</span>
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Empty State
        <div className="bg-white rounded-lg border p-8 text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Keine Tasks gefunden
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {Object.values(filters).some(Boolean)
              ? 'Versuche andere Filter oder erstelle eine neue Task.'
              : 'Erstelle die erste Task für dieses Projekt.'
            }
          </p>
          <div className="mt-6">
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="w-4 h-4" />
              Task erstellen
            </Button>
          </div>
        </div>
      )}

      {/* Task Create Modal */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadTasks}
        projectId={projectId}
        organizationId={organizationId}
        projectManagerId={projectManagerId}
        teamMembers={getProjectTeamMembers()}
      />

      {/* Task Edit Modal */}
      {editingTask && (
        <TaskEditModal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={loadTasks}
          task={editingTask}
          teamMembers={getProjectTeamMembers()}
        />
      )}
    </div>
  );
}