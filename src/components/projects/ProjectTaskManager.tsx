// src/components/projects/ProjectTaskManager.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useProjectTasks } from '@/lib/hooks/useProjectTasks';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PlusIcon
} from '@heroicons/react/24/outline';
import { taskService } from '@/lib/firebase/task-service';
import { ProjectTask } from '@/types/tasks';
import { TaskList } from './tasks/TaskList';
import { TaskFilterPanel } from './tasks/TaskFilterPanel';
import { TeamMember } from '@/types/international';
import { TaskCreateModal } from './TaskCreateModal';
import { TaskEditModal } from './TaskEditModal';
import { ConfirmDialog } from '@/app/dashboard/contacts/crm/components/shared';
import { Timestamp } from 'firebase/firestore';
import { toastService } from '@/lib/utils/toast';

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
  const queryClient = useQueryClient();

  // React Query Hook für Task-Loading
  const { tasks, isLoading } = useProjectTasks(projectId, organizationId);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

  // Erweiterte Filter (multi-select)
  const [selectedDueDateFilters, setSelectedDueDateFilters] = useState<string[]>([]);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'dueDate' | 'createdAt' | 'title'>('createdAt');

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Invalidate queries helper
  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId, organizationId] });
  }, [queryClient, projectId, organizationId]);

  // Filter und Sortierung
  const filteredAndSortedTasks = (() => {
    let filtered = [...tasks];

    // 1. View Mode Filter
    if (viewMode === 'mine') {
      filtered = filtered.filter(task => task.assignedUserId === user?.uid);
    }

    // 2. Due Date Filters (OR-verknüpft)
    if (selectedDueDateFilters.length > 0) {
      filtered = filtered.filter(task => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return selectedDueDateFilters.some(filter => {
          if (filter === 'today') {
            if (!task.dueDate) return false;
            const dueDate = task.dueDate.toDate();
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          }
          if (filter === 'overdue') {
            return task.isOverdue;
          }
          if (filter === 'future') {
            if (!task.dueDate) return false;
            const dueDate = task.dueDate.toDate();
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() > today.getTime();
          }
          if (filter === 'no-date') {
            return !task.dueDate;
          }
          return false;
        });
      });
    }

    // 3. Status Filters (OR-verknüpft)
    if (selectedStatusFilters.length > 0) {
      filtered = filtered.filter(task =>
        selectedStatusFilters.includes(task.status)
      );
    }

    // 4. Assignee Filters (OR-verknüpft)
    if (selectedAssigneeIds.length > 0) {
      filtered = filtered.filter(task =>
        task.assignedUserId && selectedAssigneeIds.includes(task.assignedUserId)
      );
    }

    // 5. Sortierung
    return filtered.sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.toMillis() - b.dueDate.toMillis();
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return 0;
      }
      if (sortBy === 'createdAt') {
        if (a.createdAt && b.createdAt) {
          return a.createdAt.toMillis() - b.createdAt.toMillis();
        }
        return 0;
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  })();

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
  const handleCompleteTask = async (taskId: string, taskTitle: string) => {
    try {
      await taskService.markAsCompleted(taskId);
      invalidateTasks();
      toastService.success(`"${taskTitle}" als erledigt markiert`);
    } catch (error) {
      console.error('Error completing task:', error);
      toastService.error('Task konnte nicht aktualisiert werden');
    }
  };

  // Handle task deletion
  const handleDeleteTask = (taskId: string, taskTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Task löschen',
      message: `Möchten Sie "${taskTitle}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await taskService.delete(taskId);
          invalidateTasks();
          toastService.success(`"${taskTitle}" erfolgreich gelöscht`);
        } catch (error) {
          console.error('Error deleting task:', error);
          toastService.error('Task konnte nicht gelöscht werden');
        }
      }
    });
  };


  // Handle progress click
  const handleProgressClick = async (task: ProjectTask, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const clickPosition = (event.clientX - rect.left) / rect.width;
    const newProgress = Math.round(clickPosition * 100);

    try {
      await taskService.updateProgress(task.id!, newProgress);
      invalidateTasks();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
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

  if (isLoading) {
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

  // Aktive Filter zählen
  const activeFiltersCount = selectedDueDateFilters.length + selectedStatusFilters.length + selectedAssigneeIds.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Projekt-Tasks</Heading>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <Text className="text-gray-600">
              {filteredAndSortedTasks.length} {filteredAndSortedTasks.length === 1 ? 'Task' : 'Tasks'}
            </Text>
            {viewMode === 'mine' && (
              <Badge color="blue" className="text-xs">Meine Tasks</Badge>
            )}
            {selectedDueDateFilters.includes('today') && (
              <Badge color="blue" className="text-xs">Heute fällig</Badge>
            )}
            {selectedDueDateFilters.includes('overdue') && (
              <Badge color="blue" className="text-xs">Überfällig</Badge>
            )}
            {selectedDueDateFilters.includes('future') && (
              <Badge color="blue" className="text-xs">Zukünftig</Badge>
            )}
            {selectedDueDateFilters.includes('no-date') && (
              <Badge color="blue" className="text-xs">Kein Datum</Badge>
            )}
            {selectedStatusFilters.includes('pending') && (
              <Badge color="blue" className="text-xs">Offen</Badge>
            )}
            {selectedStatusFilters.includes('completed') && (
              <Badge color="blue" className="text-xs">Erledigt</Badge>
            )}
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#005fab] hover:bg-[#004a8c] text-white"
        >
          <PlusIcon className="w-4 h-4" />
          Task erstellen
        </Button>
      </div>

      {/* Filter Controls */}
      <TaskFilterPanel
        viewMode={viewMode}
        selectedDueDateFilters={selectedDueDateFilters}
        selectedStatusFilters={selectedStatusFilters}
        selectedAssigneeIds={selectedAssigneeIds}
        sortBy={sortBy}
        activeFiltersCount={activeFiltersCount}
        teamMembers={getProjectTeamMembers()}
        onViewModeChange={setViewMode}
        onDueDateFiltersChange={setSelectedDueDateFilters}
        onStatusFiltersChange={setSelectedStatusFilters}
        onAssigneeIdsChange={setSelectedAssigneeIds}
        onSortByChange={setSortBy}
        onResetFilters={() => {
          setSelectedDueDateFilters([]);
          setSelectedStatusFilters([]);
          setSelectedAssigneeIds([]);
        }}
      />

      {/* Task List */}
      <TaskList
        tasks={filteredAndSortedTasks}
        isLoading={isLoading}
        activeFiltersCount={activeFiltersCount}
        viewMode={viewMode}
        projectId={projectId}
        organizationId={organizationId}
        userId={user?.uid || ''}
        teamMembers={getProjectTeamMembers().map(m => ({
          id: m.userId || m.id || '',
          displayName: m.displayName,
          email: m.email || '',
          photoUrl: m.photoUrl
        }))}
        onEdit={setEditingTask}
        onComplete={handleCompleteTask}
        onDelete={handleDeleteTask}
        onProgressClick={handleProgressClick}
        onCreateClick={() => setShowCreateModal(true)}
        onTasksInvalidate={invalidateTasks}
        formatDate={formatDate}
      />

      {/* Task Create Modal */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={invalidateTasks}
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
          onSuccess={invalidateTasks}
          task={editingTask}
          teamMembers={getProjectTeamMembers()}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}