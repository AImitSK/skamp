// src/components/projects/kanban/KanbanBoard.tsx - Hauptkomponente für Plan 10/9
'use client';

import React, { useMemo } from 'react';
// React-DnD Imports
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useState, useEffect } from 'react';

import { Project, PipelineStage } from '@/types/project';
import { BoardFilters } from '@/lib/kanban/kanban-board-service';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { 
  STAGE_COLORS, 
  RESPONSIVE_CONFIG, 
  getAllStages,
  getResponsiveConfig 
} from './kanban-constants';

import { KanbanColumn } from './KanbanColumn';
import { BoardHeader } from './BoardHeader';
import { BoardFilterPanel } from './BoardFilterPanel';
import { MobileKanbanAccordion } from './MobileKanbanAccordion';
import { UserPresenceOverlay } from './UserPresenceOverlay';

// ========================================
// INTERFACES
// ========================================

export interface KanbanBoardProps {
  projects: Record<PipelineStage, Project[]>;
  totalProjects: number;
  activeUsers: Array<{
    id: string;
    name: string;
    avatar?: string;
    currentProject?: string;
    lastSeen: { seconds: number } | Date;
  }>;
  filters: BoardFilters;
  loading: boolean;
  onProjectMove: (projectId: string, targetStage: PipelineStage) => Promise<void>;
  onFiltersChange: (filters: BoardFilters) => void;
  onProjectSelect?: (projectId: string) => void;
  onRefresh?: () => void;
  // New props for extended toolbar
  viewMode?: 'board' | 'list' | 'calendar';
  onViewModeChange?: (mode: 'board' | 'list' | 'calendar') => void;
  onNewProject?: () => void;
  onMoreOptions?: () => void;
}

// ========================================
// KANBAN BOARD KOMPONENTE
// ========================================

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  projects,
  totalProjects,
  activeUsers,
  filters,
  loading,
  onProjectMove,
  onFiltersChange,
  onProjectSelect,
  onRefresh,
  viewMode = 'board',
  onViewModeChange,
  onNewProject,
  onMoreOptions
}) => {
  // Window Size für Responsive Design
  const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });
  
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const responsiveConfig = useMemo(
    () => getResponsiveConfig(windowSize.width || 1200),
    [windowSize.width]
  );

  // Drag & Drop Integration
  const { 
    useDraggableProject, 
    useDropZone,
    getStageName 
  } = useDragAndDrop(onProjectMove);

  // Alle Pipeline Stages
  const allStages = useMemo(() => getAllStages(), []);

  // Mobile Detection
  const isMobile = responsiveConfig.layout === 'accordion';
  
  // React-DnD Backend Setup
  const dndBackend = isMobile ? TouchBackend : HTML5Backend;
  const dndBackendOptions = isMobile ? { enableMouseEvents: true, delayTouchStart: 200 } : {};

  // Board Content - Desktop/Tablet Layout
  const renderDesktopBoard = () => (
    <div className={`kanban-board-desktop ${responsiveConfig.padding} h-full w-full px-4`}>
      <div className={`flex ${responsiveConfig.gap} h-full w-full ${responsiveConfig.cardWidth.includes('flex-1') ? 'overflow-x-auto pb-4' : 'overflow-x-auto pb-4'}`}>
        {allStages.map(stage => {
          const stageProjects = projects[stage] || [];
          
          return (
            <div
              key={stage}
              className={responsiveConfig.cardWidth.includes('flex-1') ? responsiveConfig.cardWidth : 'flex-shrink-0'}
              style={!responsiveConfig.cardWidth.includes('flex-1') ? { width: responsiveConfig.cardWidth } : undefined}
            >
              <KanbanColumn
                stage={stage}
                projects={stageProjects}
                onProjectMove={onProjectMove}
                onProjectSelect={onProjectSelect}
                onProjectAdded={onRefresh}
                useDraggableProject={useDraggableProject}
                useDropZone={useDropZone}
                getStageName={getStageName}
                loading={loading}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  // Board Content - Mobile Layout
  const renderMobileBoard = () => (
    <div className="kanban-board-mobile">
      <MobileKanbanAccordion
        sections={allStages.map(stage => ({
          stage,
          title: getStageName(stage),
          count: projects[stage]?.length || 0,
          projects: projects[stage] || []
        }))}
        onProjectMove={onProjectMove}
        onProjectSelect={onProjectSelect}
        loading={loading}
      />
    </div>
  );

  // Filter Panel State
  const [showFilters, setShowFilters] = React.useState(false);

  return (
    <DndProvider backend={dndBackend} options={dndBackendOptions}>
      <div className="kanban-board-container bg-gray-50 flex flex-col h-full">
        {/* Board Header */}
        <BoardHeader
          totalProjects={totalProjects}
          activeUsers={activeUsers}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onRefresh={onRefresh}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          onNewProject={onNewProject}
          onMoreOptions={onMoreOptions}
        />

        {/* Filter Panel */}
        {showFilters && (
          <BoardFilterPanel
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClose={() => setShowFilters(false)}
            projectCount={totalProjects}
          />
        )}

        {/* User Presence Overlay */}
        <UserPresenceOverlay activeUsers={activeUsers} />

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Board wird geladen...</span>
            </div>
          </div>
        )}

        {/* Board Content */}
        <div className="flex-1 overflow-hidden">
          {!loading && (
            <>
              {isMobile ? renderMobileBoard() : renderDesktopBoard()}
            </>
          )}
        </div>

        {/* Empty State */}
        {!loading && totalProjects === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium mb-2">Keine Projekte gefunden</h3>
            <p className="text-sm">
              {Object.keys(filters).length > 0
                ? 'Versuche deine Filter zu ändern oder ein neues Projekt zu erstellen.'
                : 'Erstelle dein erstes Projekt, um loszulegen.'
              }
            </p>
          </div>
        )}

        {/* Debug Info (nur in Development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded text-xs">
            <div>Layout: {responsiveConfig.layout}</div>
            <div>Width: {windowSize.width}px</div>
            <div>Projects: {totalProjects}</div>
            <div>Active Users: {activeUsers.length}</div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default KanbanBoard;