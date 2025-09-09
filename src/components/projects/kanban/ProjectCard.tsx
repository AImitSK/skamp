// src/components/projects/kanban/ProjectCard.tsx - Projekt-Karte für Plan 10/9
'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Project, ProjectPriority, PipelineStage } from '@/types/project';
import { ProjectQuickActionsMenu } from './ProjectQuickActionsMenu';
import { ProjectEditWizard } from '@/components/projects/edit/ProjectEditWizard';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { projectService } from '@/lib/firebase/project-service';
import { TeamMember } from '@/types/international';
import { useOrganization } from '@/context/OrganizationContext';
// TODO: date-fns Installation erforderlich
// import { formatDistanceToNow } from 'date-fns';
// import { de } from 'date-fns/locale';

// ========================================
// INTERFACES
// ========================================

export interface ProjectCardProps {
  project: Project;
  onSelect?: (projectId: string) => void;
  onProjectMove?: (projectId: string, targetStage: PipelineStage) => Promise<void>;
  onProjectAdded?: () => void;
  useDraggableProject: (project: Project) => any;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

const getPriorityColor = (priority?: ProjectPriority): string => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityIcon = (priority?: ProjectPriority) => {
  if (priority === 'urgent' || priority === 'high') {
    return <ExclamationTriangleIcon className="h-3 w-3" />;
  }
  return null;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-gray-100 text-gray-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

// ========================================
// PROJECT CARD KOMPONENTE
// ========================================

export const ProjectCard: React.FC<ProjectCardProps> = memo(({
  project,
  onSelect,
  onProjectMove,
  onProjectAdded,
  useDraggableProject
}) => {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showEditWizard, setShowEditWizard] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const quickActionButtonRef = useRef<HTMLButtonElement>(null);
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
        console.error('Error loading team members:', error);
      } finally {
        setLoadingTeam(false);
      }
    };

    loadTeamMembers();
  }, [currentOrganization?.id]);

  // Handle Card Click - Navigate to Project Details
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (project.id) {
      router.push(`/dashboard/projects/${project.id}`);
    }
  };

  // Handle Quick Actions - Show Menu
  const handleQuickAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQuickActions(!showQuickActions);
  };

  // Quick Actions Handlers
  const handleViewProject = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`);
  };

  const handleEditProject = (projectId: string) => {
    // Open edit wizard modal instead of navigating
    setShowEditWizard(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!currentOrganization?.id) {
      setDeleteError('Keine Organisation gefunden');
      return;
    }
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      // Projekt löschen
      await projectService.delete(project.id, {
        organizationId: currentOrganization.id
      });
      
      // Dialog schließen
      setShowDeleteDialog(false);
      
      // Seite neu laden um die Änderung zu reflektieren
      window.location.reload();
    } catch (error) {
      console.error('Fehler beim Löschen des Projekts:', error);
      setDeleteError('Fehler beim Löschen des Projekts. Bitte versuchen Sie es erneut.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloneProject = (projectId: string) => {
    // TODO: Implement clone functionality
    console.log('Clone project:', projectId);
  };

  const handleShareProject = (projectId: string) => {
    // TODO: Implement share functionality
    console.log('Share project:', projectId);
  };

  const handleMoveToStage = async (projectId: string, stage: PipelineStage) => {
    if (onProjectMove) {
      await onProjectMove(projectId, stage);
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    if (!currentOrganization?.id) return;

    try {
      await projectService.archive(projectId, {
        organizationId: currentOrganization.id,
        userId: currentOrganization.ownerId
      });
      
      console.log('Projekt archiviert:', projectId);
      
      // Seite neu laden um die Änderung zu reflektieren (wie beim Löschen)
      window.location.reload();
      
    } catch (error) {
      console.error('Fehler beim Archivieren:', error);
    }
  };

  const handleEditSuccess = (updatedProject: Project) => {
    // Trigger project update callback if available
    if (onProjectAdded) {
      onProjectAdded(); // This will trigger a refresh in the parent component
    }
    
    // Alternative: reload page to ensure consistency
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div
      ref={drag}
      className={`
        project-card bg-white rounded-lg border border-gray-200 p-4 cursor-move
        hover:shadow-md transition-all duration-200
        ${isDragging ? 'opacity-50 transform rotate-1' : 'opacity-100'}
      `}
      onClick={handleCardClick}
    >
      {/* Card Header */}
      <div className="card-header flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {project.title}
          </h4>
          {project.customer && (
            <p className="text-xs text-gray-600 mt-1">
              {project.customer.name}
            </p>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="relative">
          <button
            ref={quickActionButtonRef}
            onClick={handleQuickAction}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Mehr Optionen"
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
            onClone={handleCloneProject}
            onShare={handleShareProject}
            onMoveToStage={handleMoveToStage}
            onArchive={handleArchiveProject}
            triggerRef={quickActionButtonRef}
          />
        </div>
      </div>

      {/* Progress Bar */}
      {progressPercent > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Fortschritt</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}


      {/* Tags */}
      {projectTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {projectTags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
            >
              {tag}
            </span>
          ))}
          {projectTags.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              +{projectTags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Card Footer */}
      <div className="card-footer flex items-center justify-between">
        {/* Left Side - Team & Status */}
        <div className="flex items-center space-x-3">
          {/* Assigned Team Members with Avatars */}
          {project.assignedTo && project.assignedTo.length > 0 && (
            <div className="flex -space-x-2">
              {project.assignedTo.slice(0, 3).map((userId: string) => {
                
                // Zusätzlicher Check: Versuche match mit id statt userId
                const memberByUserId = teamMembers.find(m => m.userId === userId);
                const memberById = teamMembers.find(m => m.id === userId);
                const member = memberByUserId || memberById;
                if (!member || loadingTeam) {
                  // Fallback for unknown member or still loading
                  return (
                    <div
                      key={userId}
                      className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white"
                      title={loadingTeam ? "Lädt Mitgliederdaten..." : "Unbekanntes Mitglied"}
                    >
                      {loadingTeam ? "..." : "?"}
                    </div>
                  );
                }
                
                // Generate initials as fallback
                const initials = member.displayName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                
                return (
                  <Avatar
                    key={userId}
                    className="size-7 ring-2 ring-white"
                    src={member.photoUrl}
                    initials={initials}
                    title={member.displayName}
                  />
                );
              })}
              {project.assignedTo.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
                  +{project.assignedTo.length - 3}
                </div>
              )}
            </div>
          )}
          
          {/* Status Badge */}
          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(project.status)}`}>
            {project.status === 'active' ? 'Aktiv' :
             project.status === 'on_hold' ? 'Pausiert' :
             project.status === 'completed' ? 'Fertig' :
             project.status === 'cancelled' ? 'Abgebrochen' : project.status}
          </span>
        </div>

        {/* Right Side - Priority & Due Date */}
        <div className="flex items-center space-x-2">
          {/* Priority Badge */}
          {projectPriority && (
            <div className={`flex items-center space-x-1 px-2 py-1 text-xs rounded ${getPriorityColor(projectPriority)}`}>
              {getPriorityIcon(projectPriority)}
              <span>
                {projectPriority === 'urgent' ? 'Dringend' :
                 projectPriority === 'high' ? 'Hoch' :
                 projectPriority === 'medium' ? 'Mittel' :
                 projectPriority === 'low' ? 'Niedrig' : projectPriority}
              </span>
            </div>
          )}
          
          {/* Due Date */}
          {project.dueDate && (
            <div className={`
              flex items-center space-x-1 text-xs px-2 py-1 rounded
              ${isOverdue ? 'bg-red-100 text-red-800' :
                isDueToday ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-600'
              }
            `}>
              <ClockIcon className="h-3 w-3" />
              <span>
                {new Date(project.dueDate.seconds * 1000).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          ⚠️ Projekt ist überfällig
        </div>
      )}

      {/* Critical Tasks Warning */}
      {progress?.criticalTasksRemaining > 0 && (
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
          🔥 {progress.criticalTasksRemaining} kritische Tasks offen
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            {/* Dialog Header */}
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  Projekt löschen
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Möchten Sie das Projekt <strong>{project.title}</strong> wirklich löschen? 
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Error Message */}
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{deleteError}</p>
              </div>
            )}

            {/* Dialog Actions */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                color="secondary"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                color="danger"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Lösche...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Löschen
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Project Edit Wizard */}
      {currentOrganization && (
        <ProjectEditWizard
          isOpen={showEditWizard}
          onClose={() => setShowEditWizard(false)}
          onSuccess={handleEditSuccess}
          project={project}
          organizationId={currentOrganization.id}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Performance Optimization - Memoization
  return (
    prevProps.project.id === nextProps.project.id &&
    prevProps.project.updatedAt === nextProps.project.updatedAt &&
    prevProps.project.title === nextProps.project.title &&
    prevProps.project.currentStage === nextProps.project.currentStage
  );
});

ProjectCard.displayName = 'ProjectCard';

export default ProjectCard;