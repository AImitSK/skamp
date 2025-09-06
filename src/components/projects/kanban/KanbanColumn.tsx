// src/components/projects/kanban/KanbanColumn.tsx - Kanban Spalte für Plan 10/9
'use client';

import React, { memo } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
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
    let baseClass = `kanban-column min-h-[600px] ${stageColors.bg} ${stageColors.border} border-2 rounded-lg`;
    
    if (isOver && canDrop) {
      baseClass += ' border-green-400 bg-green-50 border-dashed';
    } else if (isOver && !canDrop) {
      baseClass += ' border-red-400 bg-red-50 border-dashed';
    }
    
    return baseClass;
  };

  // Add Project Handler (Placeholder)
  const handleAddProject = () => {
    console.log(`Add project to ${stage}`);
    // TODO: Implementiere Add-Project-Dialog
  };

  return (
    <div 
      ref={drop}
      className={getDropZoneClass()}
    >
      {/* Column Header */}
      <div className={`column-header p-4 ${stageColors.header} rounded-t-lg border-b ${stageColors.border}`}>
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
          
          {/* Add Project Button */}
          <button
            onClick={handleAddProject}
            className={`p-1 rounded hover:${stageColors.accent} ${stageColors.text} transition-colors`}
            title={`Projekt zu ${getStageName(stage)} hinzufügen`}
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
        
        {/* Stage Description */}
        <p className={`text-xs mt-1 ${stageColors.text} opacity-75`}>
          {stageConfig.description}
        </p>
      </div>

      {/* Projects List */}
      <div className="column-content p-3 space-y-3 overflow-y-auto max-h-[calc(600px-80px)]">
        {loading && projects.length === 0 ? (
          // Loading State
          <div className="space-y-3">
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
      <div className={`column-footer px-4 py-2 border-t ${stageColors.border} ${stageColors.bg} rounded-b-lg`}>
        <div className="flex justify-between text-xs text-gray-600">
          <span>
            {projects.length === 1 ? '1 Projekt' : `${projects.length} Projekte`}
          </span>
          {projects.length > 0 && (
            <span>
              {projects.filter(p => (p as any).priority === 'urgent').length} urgent
            </span>
          )}
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