// src/components/projects/kanban/KanbanColumn.tsx - Kanban Spalte für Plan 10/9
'use client';

import React, { memo } from 'react';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Project, PipelineStage } from '@/types/project';
import { TeamMember } from '@/types/international';
import { Tag } from '@/types/crm';
import { getStageColor, getStageConfig } from './kanban-constants';
import { ProjectCard } from './ProjectCard';
import { VirtualizedProjectList } from './VirtualizedProjectList';

// ========================================
// INTERFACES
// ========================================

export interface KanbanColumnProps {
  stage: PipelineStage;
  projects: Project[];
  onProjectMove: (projectId: string, targetStage: PipelineStage) => Promise<void>;
  onProjectSelect?: (projectId: string) => void;
  onProjectAdded?: () => void;
  onProjectDeleted?: () => void;
  onProjectArchived?: () => void;
  onProjectUpdated?: () => void;
  useDraggableProject: (project: Project) => any;
  useDropZone: (stage: PipelineStage) => any;
  getStageName: (stage: PipelineStage) => string;
  loading: boolean;
  teamMembers?: TeamMember[];
  tags?: Tag[];
}

// ========================================
// KANBAN COLUMN KOMPONENTE
// ========================================

export const KanbanColumn: React.FC<KanbanColumnProps> = memo(({
  stage,
  projects,
  onProjectMove,
  onProjectSelect,
  onProjectAdded,
  onProjectDeleted,
  onProjectArchived,
  onProjectUpdated,
  useDraggableProject,
  useDropZone,
  getStageName,
  loading,
  teamMembers = [],
  tags = []
}) => {
  const t = useTranslations('projects.kanban');
  const stageConfig = getStageConfig(stage);
  const stageColors = getStageColor(stage);
  
  // Drop Zone Hook
  const { isOver, canDrop, drop } = useDropZone(stage);
  
  // Drop Zone Style basierend auf Drag State
  const getDropZoneClass = () => {
    let baseClass = `kanban-column h-full ${stageColors.bg} ${stageColors.border} border-2 rounded-lg`;
    
    if (isOver && canDrop) {
      baseClass += ' border-green-400 bg-green-50 border-dashed';
    } else if (isOver && !canDrop) {
      baseClass += ' border-red-400 bg-red-50 border-dashed';
    }
    
    return baseClass;
  };

  // Handle successful project creation (unused but kept for potential future use)
  const handleProjectCreated = (projectId: string) => {
    if (onProjectAdded) {
      onProjectAdded();
    }
  };

  return (
    <div 
      ref={drop}
      className={`${getDropZoneClass()} flex flex-col`}
    >
      {/* Column Header */}
      <div className={`column-header py-2 px-2 ${stageColors.header} rounded-t-lg border-b ${stageColors.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className={`font-semibold ${stageColors.text}`}>
              {getStageName(stage)}
            </h3>
            <span 
              className={`px-2 py-1 text-xs font-medium rounded-full ${stageColors.count}`}
            >
              {projects.length}
            </span>
          </div>
          
        </div>
      </div>

      {/* Projects List */}
      <div className="column-content py-2 px-2 space-y-2 flex-1">
        {loading && projects.length === 0 ? (
          // Loading State
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-24"></div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          // Empty State
          <div className={`text-center py-8 ${stageColors.text} opacity-50`}>
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 mb-2" />
            <p className="text-sm">Keine Projekte</p>
            <p className="text-xs">
              Ziehe Projekte hierher oder erstelle ein neues
            </p>
          </div>
        ) : (
          // Use virtualized list for better performance
          <VirtualizedProjectList
            projects={projects}
            height={Math.min(500, projects.length * 120 + 20)} // Dynamic height with max
            onProjectSelect={onProjectSelect}
            onProjectMove={onProjectMove}
            onProjectAdded={onProjectAdded}
            onProjectDeleted={onProjectDeleted}
            onProjectArchived={onProjectArchived}
            onProjectUpdated={onProjectUpdated}
            useDraggableProject={useDraggableProject}
            loading={loading}
            teamMembers={teamMembers}
            tags={tags}
          />
        )}
      </div>

      {/* Drop Feedback */}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 rounded-lg pointer-events-none">
          <div className={`
            px-4 py-2 rounded-lg text-sm font-medium
            ${canDrop
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
            }
          `}>
            {canDrop
              ? t('column.dropHere', { stage: getStageName(stage) })
              : t('column.transitionNotAllowed')
            }
          </div>
        </div>
      )}

      {/* Column Footer - Quick Stats */}
      <div className={`column-footer py-2 px-2 border-t ${stageColors.border} ${stageColors.bg} rounded-b-lg`}>
        <div className="text-xs text-gray-600 text-center">
          <span>
            {t('column.projectCount', { count: projects.length })}
          </span>
        </div>
      </div>

    </div>
  );
}, (prevProps, nextProps) => {
  // Custom Comparison für Performance-Optimierung
  return (
    prevProps.stage === nextProps.stage &&
    prevProps.projects.length === nextProps.projects.length &&
    prevProps.loading === nextProps.loading &&
    JSON.stringify(prevProps.projects.map(p => p.id)) === JSON.stringify(nextProps.projects.map(p => p.id)) &&
    JSON.stringify(prevProps.projects.map(p => p.updatedAt)) === JSON.stringify(nextProps.projects.map(p => p.updatedAt))
  );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;