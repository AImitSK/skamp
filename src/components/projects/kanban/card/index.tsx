// src/components/projects/kanban/card/index.tsx
'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
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
import { teamMemberService } from '@/lib/firebase/organization-service';
import { TeamMember } from '@/types/international';
import { useOrganization } from '@/context/OrganizationContext';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useDeleteProject, useArchiveProject } from '@/lib/hooks/useProjectData';
import toast from 'react-hot-toast';
import { ProjectCardProps } from './types';
import { getPriorityColor, getPriorityIcon, getStatusColor } from './helpers';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

export const ProjectCard: React.FC<ProjectCardProps> = memo(({
  project,
  onSelect,
  onProjectMove,
  onProjectAdded,
  onProjectDeleted,
  onProjectArchived,
  onProjectUpdated,
  useDraggableProject
}) => {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const quickActionButtonRef = useRef<HTMLButtonElement>(null);

  // React Query Mutations
  const deleteProjectMutation = useDeleteProject();
  const archiveProjectMutation = useArchiveProject();

  // Drag Hook
  const { isDragging, drag } = useDraggableProject(project);

  // Project Properties
  const projectPriority = (project as any).priority as ProjectPriority;
  const projectTags = (project as any).tags as string[] || [];
  const progress = (project as any).progress;

  // Calculate Progress Percentage
  const progressPercent = progress?.overallPercent || 0;

  // Due Date Check
  const isDueToday = project.dueDate &&
    new Date(project.dueDate.seconds * 1000).toDateString() === new Date().toDateString();
  const isOverdue = project.dueDate &&
    new Date(project.dueDate.seconds * 1000) < new Date() &&
    project.status !== 'completed';

  // Load Team Members
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!currentOrganization?.id) return;

      try {
        setLoadingTeam(true);
        const members = await teamMemberService.getByOrganization(currentOrganization.id);
        const activeMembers = members.filter(m => m.status === 'active');
        setTeamMembers(activeMembers);
      } catch (error) {
        // Silent fail - team members are optional UI enhancement
      } finally {
        setLoadingTeam(false);
      }
    };

    loadTeamMembers();
  }, [currentOrganization?.id]);

  // Handlers
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (project.id) {
      router.push(`/dashboard/projects/${project.id}`);
    }
  };

  const handleQuickAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQuickActions(!showQuickActions);
  };

  const handleViewProject = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`);
  };

  const handleEditProject = (projectId: string) => {
    setShowEditWizard(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
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
  };

  const handleMoveToStage = async (projectId: string, stage: PipelineStage) => {
    if (onProjectMove) {
      await onProjectMove(projectId, stage);
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    if (!currentOrganization?.id) {
      toast.error('Keine Organisation gefunden');
      return;
    }

    try {
      await archiveProjectMutation.mutateAsync({
        projectId,
        organizationId: currentOrganization.id,
        userId: currentOrganization.ownerId
      });

      toast.success('Projekt archiviert');

      if (onProjectArchived) {
        onProjectArchived();
      }
    } catch (error) {
      toast.error('Fehler beim Archivieren');
    }
  };

  const handleEditSuccess = (updatedProject: Project) => {
    if (onProjectUpdated) {
      onProjectUpdated();
    } else if (onProjectAdded) {
      onProjectAdded();
    }
  };

  return (
    <>
      <div
        ref={drag}
        className={`
          project-card bg-white rounded-lg border border-zinc-200 p-4
          cursor-move hover:shadow-md transition-all
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
                {project.customer.companyName || project.customer.name}
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
        {projectTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {projectTags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800"
              >
                {tag}
              </span>
            ))}
            {projectTags.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600">
                +{projectTags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {progressPercent > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-zinc-600 mb-1">
              <span>Fortschritt</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            {/* Team Members */}
            {teamMembers.length > 0 && (
              <div className="flex -space-x-1">
                {teamMembers.slice(0, 3).map((member) => (
                  <Avatar
                    key={member.id}
                    src={member.avatar}
                    alt={member.name}
                    className="h-5 w-5 rounded-full border-2 border-white"
                  />
                ))}
                {teamMembers.length > 3 && (
                  <div className="h-5 w-5 rounded-full border-2 border-white bg-zinc-300 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-zinc-600">
                      +{teamMembers.length - 3}
                    </span>
                  </div>
                )}
              </div>
            )}

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
            {/* Priority Badge */}
            {projectPriority && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(projectPriority)}`}>
                {getPriorityIcon(projectPriority)}
                <span className="ml-1">{projectPriority}</span>
              </span>
            )}

            {/* Status Badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
              {project.status}
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
