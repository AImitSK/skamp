// src/components/projects/kanban/KanbanColumn.tsx - Kanban Spalte für Plan 10/9
'use client';

import React, { memo } from 'react';
import { Project, PipelineStage } from '@/types/project';
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
  useDraggableProject: (project: Project) => any;
  useDropZone: (stage: PipelineStage) => any;
  getStageName: (stage: PipelineStage) => string;
  loading: boolean;
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
  useDraggableProject,
  useDropZone,
  getStageName,
  loading
}) => {
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
    console.log(`Projekt ${projectId} erfolgreich in ${stage} erstellt`);
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
      <div className={`column-header py-4 px-4 ${stageColors.header} rounded-t-lg border-b ${stageColors.border}`}>
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
        
        {/* Stage Description */}
        <p className={`text-xs mt-1 ${stageColors.text} opacity-75`}>
          {stageConfig.description}
        </p>
      </div>

      {/* Projects List */}
      <div className="column-content py-4 px-4 space-y-4 flex-1">
        {loading && projects.length === 0 ? (
          // Loading State
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-24"></div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          // Empty State
          <div className={`text-center py-8 ${stageColors.text} opacity-50`}>
            <div className="text-2xl mb-2">📋</div>
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
            useDraggableProject={useDraggableProject}
            loading={loading}
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
              ? `Hier ablegen für ${getStageName(stage)}` 
              : 'Übergang nicht erlaubt'
            }
          </div>
        </div>
      )}

      {/* Column Footer - Quick Stats */}
      <div className={`column-footer py-4 px-4 border-t ${stageColors.border} ${stageColors.bg} rounded-b-lg`}>
        <div className="text-xs text-gray-600 text-center">
          <span>
            {projects.length === 1 ? '1 Projekt' : `${projects.length} Projekte`}
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