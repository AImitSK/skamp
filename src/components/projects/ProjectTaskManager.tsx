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
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
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
  ChartBarIcon,
  DocumentDuplicateIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { taskService } from '@/lib/firebase/task-service';
import { ProjectTask, TaskFilters, TaskStatus, TaskPriority } from '@/types/tasks';
import { TeamMember } from '@/types/international';
import { TaskCreateModal } from './TaskCreateModal';
import { TaskEditModal } from './TaskEditModal';
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

// Task-Vorlagen für Standard-PR-Workflow
const TASK_TEMPLATES = [
  {
    title: 'Strategie-Dokumente erstellen',
    description: '- Unternehmensprofil & Senderanalyse\n- Situationsanalyse\n- Zielgruppenanalyse\n- Kernbotschaften & Kommunikationsziele',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Medien Assets zusammenstellen',
    description: '- Bilder hochladen\n- Videos hochladen\n- Key Visual festlegen',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Pressemeldungsentwurf',
    description: '- KI Assistent instruieren\n- Pressemeldung verfeinern',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Interne Freigabe',
    description: '- Text entwurf im Chat diskutieren\n- Key Visual im Chat besprechen',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Kundenfreigabe einholen',
    description: '- Korrekturphasen\n- Kundenfreigabe der Pressemeldung\n- Asset Auswahl Freigabe',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Verteilerliste zusammenstellen',
    description: '- Journalisten importieren\n- Verteilerliste zusammenstellen\n- Monitoring Parameter festlegen (RSS Feeds)',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Anschreiben erstellen',
    description: '- Begleitschreiben formulieren\n- Testversand',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Versand',
    description: '- Termin festlegen\n- Versand planen\n- Versand überwachen',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Monitoring',
    description: '- Email Performance überwachen\n- Veröffentlichungen überwachen\n- Veröffentlichungen manuell einpflegen',
    priority: 'medium' as TaskPriority
  }
];

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
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');

  // Erweiterte Filter (multi-select)
  const [selectedDueDateFilters, setSelectedDueDateFilters] = useState<string[]>([]);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'dueDate' | 'createdAt' | 'title'>('createdAt');

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

  // Handle template tasks creation
  const handleCreateTemplateTasks = async () => {
    if (!user?.uid) {
      toastService.error('Benutzer nicht gefunden');
      return;
    }

    try {
      setLoading(true);

      // Erstelle alle Vorlagen-Tasks nacheinander mit kleinen Delays
      // für korrekte Reihenfolge basierend auf Timestamps
      for (let i = 0; i < TASK_TEMPLATES.length; i++) {
        const template = TASK_TEMPLATES[i];

        const taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt' | 'isOverdue' | 'daysUntilDue' | 'overdueBy'> = {
          userId: user.uid,
          organizationId,
          projectId,
          assignedUserId: user.uid,
          title: template.title,
          description: template.description,
          status: 'pending',
          priority: template.priority,
          progress: 0,
          isAllDay: true
          // Kein dueDate - wie gewünscht
        };

        await taskService.create(taskData);
      }

      // Lade Tasks neu
      await loadTasks();

      // Erfolgs-Toast
      toastService.success(`${TASK_TEMPLATES.length} Standard-Tasks erfolgreich erstellt`);
    } catch (error) {
      console.error('Error creating template tasks:', error);
      toastService.error('Fehler beim Erstellen der Vorlagen-Tasks');
    } finally {
      setLoading(false);
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
      <div className="flex items-center gap-3 flex-wrap">
        {/* View Mode Select */}
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as 'all' | 'mine')}
          className="rounded-lg border border-zinc-300 bg-white px-4 h-10
                     text-sm text-zinc-700 font-medium
                     focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                     hover:bg-zinc-50 transition-colors"
        >
          <option value="all">Alle Tasks</option>
          <option value="mine">Meine Tasks</option>
        </select>

        {/* Filter Popover */}
        <Popover className="relative">
          <Popover.Button
            className={`inline-flex items-center justify-center rounded-lg border p-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 w-10 ${
              activeFiltersCount > 0
                ? 'border-[#005fab] bg-[#005fab]/5 text-[#005fab] hover:bg-[#005fab]/10'
                : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
            aria-label="Filter"
          >
            <FunnelIcon className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#005fab] text-xs font-medium text-white">
                {activeFiltersCount}
              </span>
            )}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Filter</h3>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => {
                        setSelectedDueDateFilters([]);
                        setSelectedStatusFilters([]);
                        setSelectedAssigneeIds([]);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>

                {/* Fälligkeit Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fälligkeit
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'today', label: 'Heute fällig' },
                      { value: 'overdue', label: 'Überfällig' },
                      { value: 'future', label: 'Alle zukünftigen' },
                      { value: 'no-date', label: 'Kein Datum' }
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDueDateFilters.includes(option.value)}
                          onChange={(e) => {
                            const newValues = e.target.checked
                              ? [...selectedDueDateFilters, option.value]
                              : selectedDueDateFilters.filter(v => v !== option.value);
                            setSelectedDueDateFilters(newValues);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-[#005fab] focus:ring-[#005fab]"
                        />
                        <span className="text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sortierung */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sortierung
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'dueDate', label: 'Nach Fälligkeit' },
                      { value: 'createdAt', label: 'Nach Erstellung' },
                      { value: 'title', label: 'Alphabetisch' }
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="sortBy"
                          checked={sortBy === option.value}
                          onChange={() => setSortBy(option.value as 'dueDate' | 'createdAt' | 'title')}
                          className="h-4 w-4 border-gray-300 text-[#005fab] focus:ring-[#005fab]"
                        />
                        <span className="text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'pending', label: 'Offen' },
                      { value: 'in_progress', label: 'In Bearbeitung' },
                      { value: 'completed', label: 'Erledigt' }
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStatusFilters.includes(option.value)}
                          onChange={(e) => {
                            const newValues = e.target.checked
                              ? [...selectedStatusFilters, option.value]
                              : selectedStatusFilters.filter(v => v !== option.value);
                            setSelectedStatusFilters(newValues);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-[#005fab] focus:ring-[#005fab]"
                        />
                        <span className="text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Zuständige Mitglieder Filter */}
                {getProjectTeamMembers().length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zuständige Mitglieder
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {getProjectTeamMembers().map((member) => (
                        <label
                          key={member.userId || member.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAssigneeIds.includes(member.userId || member.id || '')}
                            onChange={(e) => {
                              const memberId = member.userId || member.id || '';
                              const newValues = e.target.checked
                                ? [...selectedAssigneeIds, memberId]
                                : selectedAssigneeIds.filter(v => v !== memberId);
                              setSelectedAssigneeIds(newValues);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-[#005fab] focus:ring-[#005fab]"
                          />
                          <span className="text-sm text-gray-700">
                            {member.displayName}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </Popover>
      </div>

      {/* Task Table */}
      {filteredAndSortedTasks.length > 0 ? (
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
            {filteredAndSortedTasks.map((task) => {
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
                        {(() => {
                          const progress = task.progress || 0;

                          // Einheitliche Farblogik wie in anderen Komponenten
                          const getProgressColor = (percent: number) => {
                            if (percent >= 90) return 'bg-green-500';
                            if (percent >= 70) return 'bg-blue-500';
                            if (percent >= 50) return 'bg-yellow-500';
                            return 'bg-red-500';
                          };

                          const progressColor = getProgressColor(progress);
                          const isInProgress = task.status === 'in_progress';

                          return (
                            <>
                              <div className="relative flex-1">
                                <div
                                  className="bg-gray-200 rounded-full h-3 cursor-pointer"
                                  onClick={(e) => handleProgressClick(task, e)}
                                  title="Klicken um Fortschritt zu ändern"
                                >
                                  <div
                                    className={`${progressColor} rounded-full h-3 transition-all duration-500`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>

                                {isInProgress && (
                                  <div className="absolute inset-0 bg-primary opacity-30 rounded-full animate-pulse pointer-events-none"></div>
                                )}
                              </div>
                              <Text className="text-xs text-gray-500 flex-shrink-0">
                                {Math.round(progress)}%
                              </Text>
                            </>
                          );
                        })()}
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
            {(activeFiltersCount > 0 || viewMode === 'mine')
              ? 'Versuche andere Filter oder erstelle eine neue Task.'
              : 'Erstelle die erste Task für dieses Projekt.'
            }
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="w-4 h-4" />
              Task erstellen
            </Button>
            <Button
              onClick={handleCreateTemplateTasks}
              outline
              disabled={loading}
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              Task Vorlage verwenden
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