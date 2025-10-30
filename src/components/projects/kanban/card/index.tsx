// src/components/projects/kanban/card/index.tsx
'use client';

import React, { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClockIcon,
  UserIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { Project, ProjectPriority, PipelineStage } from '@/types/project';
import { ProjectQuickActionsMenu } from '../ProjectQuickActionsMenu';
import { ProjectEditWizard } from '@/components/projects/edit/ProjectEditWizard';
import { Avatar } from '@/components/ui/avatar';
import { useOrganization } from '@/context/OrganizationContext';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { de } from 'date-fns/locale/de';
import { useDeleteProject, useArchiveProject } from '@/lib/hooks/useProjectData';
import toast from 'react-hot-toast';
import { ProjectCardProps } from './types';
import { getPriorityColor, getPriorityIcon, getStatusColor, getPriorityLabel, getStatusLabel } from './helpers';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

export const ProjectCard: React.FC<ProjectCardProps> = memo(({
  project,
  onSelect,
  onProjectMove,
  onProjectAdded,
  onProjectDeleted,
  onProjectArchived,
  onProjectUpdated,
  useDraggableProject,
  teamMembers = [],
  tags = []
}) => {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const quickActionButtonRef = useRef<HTMLButtonElement>(null);

  // React Query Mutations
  const deleteProjectMutation = useDeleteProject();
  const archiveProjectMutation = useArchiveProject();

  // Drag Hook
  const { isDragging, drag } = useDraggableProject(project);

  // Project Properties with useMemo
  const projectPriority = useMemo(() => (project as any).priority as ProjectPriority, [project]);
  const projectTagIds = useMemo(() => (project as any).tags as string[] || [], [project]);
  const progress = useMemo(() => (project as any).progress, [project]);

  // Map tag IDs to tag names
  const projectTagNames = useMemo(() => {
    if (!projectTagIds.length || !tags.length) return [];
    return projectTagIds
      .map(tagId => tags.find(t => t.id === tagId)?.name)
      .filter(Boolean) as string[];
  }, [projectTagIds, tags]);

  // Calculate Progress Percentage

  // Due Date Check with useMemo
  const isDueToday = useMemo(() => {
    if (!project.dueDate) return false;
    return new Date(project.dueDate.seconds * 1000).toDateString() === new Date().toDateString();
  }, [project.dueDate]);

  const isOverdue = useMemo(() => {
    if (!project.dueDate || project.status === 'completed') return false;
    return new Date(project.dueDate.seconds * 1000) < new Date();
  }, [project.dueDate, project.status]);

  // ✅ PERFORMANCE FIX: Team Members & Tags via Props (statt useEffect)
  // Verhindert 50x Team Members + 50x Tags Queries (100 Queries → 0 Queries!)
  // Team Members & Tags werden nun einmal auf Page-Level geladen und via Props durchgereicht

  // Handlers with useCallback for performance
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (project.id) {
      router.push(`/dashboard/projects/${project.id}`);
    }
  }, [project.id, router]);

  const handleQuickAction = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQuickActions(prev => !prev);
  }, []);

  const handleViewProject = useCallback((projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`);
  }, [router]);

  const handleEditProject = useCallback((projectId: string) => {
    setShowEditWizard(true);
  }, []);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!currentOrganization?.id) {
      toast.error('Keine Organisation gefunden');
      return;
    }

    try {
      await deleteProjectMutation.mutateAsync({
        projectId: project.id!,
        organizationId: currentOrganization.id
      });

      toast.success('Projekt gelöscht');
      setShowDeleteDialog(false);

      if (onProjectDeleted) {
        onProjectDeleted();
      }
    } catch (error) {
      toast.error('Fehler beim Löschen des Projekts');
    }
  }, [currentOrganization?.id, deleteProjectMutation, project.id, onProjectDeleted]);

  const handleMoveToStage = useCallback(async (projectId: string, stage: PipelineStage) => {
    if (onProjectMove) {
      await onProjectMove(projectId, stage);
    }
  }, [onProjectMove]);

  const handleArchiveProject = useCallback(async (projectId: string) => {
    if (!currentOrganization?.id) {
      toast.error('Keine Organisation gefunden');
      return;
    }

    try {
      await archiveProjectMutation.mutateAsync({
        projectId,
        organizationId: currentOrganization.id,
        userId: project.userId
      });

      toast.success('Projekt archiviert');

      if (onProjectArchived) {
        onProjectArchived();
      }
    } catch (error) {
      toast.error('Fehler beim Archivieren');
    }
  }, [currentOrganization?.id, project.userId, archiveProjectMutation, onProjectArchived]);

  const handleEditSuccess = useCallback((updatedProject: Project) => {
    if (onProjectUpdated) {
      onProjectUpdated();
    } else if (onProjectAdded) {
      onProjectAdded();
    }
  }, [onProjectUpdated, onProjectAdded]);

  return (
    <>
      <div
        ref={drag}
        className={`
          project-card bg-white rounded-lg border border-zinc-200 p-4
          cursor-move hover:border-zinc-300 transition-all
          ${isDragging ? 'opacity-50' : ''}
        `}
        onClick={handleCardClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-zinc-900 truncate">
              {project.title}
            </h3>
            {project.customer && (
              <p className="text-xs text-zinc-600 truncate mt-1">
                {project.customer.name}
              </p>
            )}
          </div>

          <div className="relative ml-2">
            <button
              ref={quickActionButtonRef}
              onClick={handleQuickAction}
              className="p-1 hover:bg-zinc-100 rounded transition-colors"
            >
              <EllipsisHorizontalIcon className="h-4 w-4" />
            </button>

            <ProjectQuickActionsMenu
              project={project}
              isOpen={showQuickActions}
              onClose={() => setShowQuickActions(false)}
              onView={handleViewProject}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
              onMoveToStage={handleMoveToStage}
              onArchive={handleArchiveProject}
              triggerRef={quickActionButtonRef}
            />
          </div>
        </div>

        {/* Tags */}
        {projectTagNames.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {projectTagNames.slice(0, 3).map((tagName, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800"
              >
                {tagName}
              </span>
            ))}
            {projectTagNames.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600">
                +{projectTagNames.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            {/* Team Members */}
            {(() => {
              // Filtere nur zugewiesene Team-Mitglieder
              const assignedMembers = teamMembers.filter(member =>
                project.assignedTo?.includes(member.id) ||
                project.assignedTo?.includes(member.userId || '')
              );

              if (assignedMembers.length === 0) return null;

              // Generiere Initialen aus displayName
              const getInitials = (name: string) => {
                const parts = name.trim().split(' ');
                if (parts.length >= 2) {
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                }
                return name.substring(0, 2).toUpperCase();
              };

              return (
                <div className="flex -space-x-2">
                  {assignedMembers.slice(0, 3).map((member) => (
                    <Avatar
                      key={member.id}
                      src={member.photoUrl}
                      initials={member.photoUrl ? undefined : getInitials(member.displayName)}
                      alt={member.displayName}
                      className="h-8 w-8 rounded-full border-2 border-white"
                    />
                  ))}
                  {assignedMembers.length > 3 && (
                    <div className="h-8 w-8 rounded-full border-2 border-white bg-zinc-300 flex items-center justify-center">
                      <span className="text-xs font-medium text-zinc-600">
                        +{assignedMembers.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Due Date */}
            {project.dueDate && (
              <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-600' : isDueToday ? 'text-orange-600' : 'text-zinc-600'}`}>
                <ClockIcon className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(project.dueDate.seconds * 1000), { addSuffix: true, locale: de })}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Status Badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
              {getStatusLabel(project.status)}
            </span>
          </div>
        </div>

        {/* Warnings */}
        {(isOverdue || (progress?.criticalTasks && progress.criticalTasks > 0)) && (
          <div className="mt-3 pt-3 border-t border-zinc-200">
            {isOverdue && (
              <div className="flex items-center text-xs text-red-600 mb-1">
                <ClockIcon className="h-3 w-3 mr-1" />
                <span>Überfällig</span>
              </div>
            )}
            {progress?.criticalTasks && progress.criticalTasks > 0 && (
              <div className="flex items-center text-xs text-orange-600">
                <UserIcon className="h-3 w-3 mr-1" />
                <span>{progress.criticalTasks} kritische Aufgaben</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        projectTitle={project.title}
        isDeleting={deleteProjectMutation.isPending}
        hasError={deleteProjectMutation.isError}
      />

      {/* Edit Wizard */}
      {currentOrganization && (
        <ProjectEditWizard
          isOpen={showEditWizard}
          onClose={() => setShowEditWizard(false)}
          onSuccess={handleEditSuccess}
          project={project}
          organizationId={currentOrganization.id}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.project.id === nextProps.project.id &&
    prevProps.project.updatedAt === nextProps.project.updatedAt
  );
});

ProjectCard.displayName = 'ProjectCard';

export default ProjectCard;
