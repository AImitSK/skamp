// src/components/projects/kanban/ProjectCard.tsx - Projekt-Karte für Plan 10/9
'use client';

import React, { memo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { Project, ProjectPriority, PipelineStage } from '@/types/project';
import { ProjectQuickActionsMenu } from './ProjectQuickActionsMenu';
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
  useDraggableProject
}) => {
  const router = useRouter();
  const [showQuickActions, setShowQuickActions] = useState(false);
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
    router.push(`/dashboard/projects/${projectId}?tab=settings`);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      // TODO: Implement delete functionality
      console.log('Delete project:', projectId);
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

      {/* Project Description */}
      {project.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {project.description}
        </p>
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
        <div className="flex items-center space-x-2">
          {/* Assigned Team Members */}
          {project.assignedTo && project.assignedTo.length > 0 && (
            <div className="flex items-center space-x-1">
              <UserIcon className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-600">
                {project.assignedTo.length}
              </span>
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