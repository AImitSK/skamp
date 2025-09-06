// src/components/projects/kanban/BoardProvider.tsx - Board Context Provider für Plan 10/9
'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { PipelineStage } from '@/types/project';
import { 
  BoardData, 
  BoardFilters,
  kanbanBoardService 
} from '@/lib/kanban/kanban-board-service';
import { useBoardRealtime } from '@/hooks/useBoardRealtime';
import { useAuth } from '@/hooks/useAuth';

// ========================================
// BOARD STATE INTERFACES
// ========================================

export interface BoardState {
  // Data
  boardData: BoardData | null;
  originalBoardData: BoardData | null; // Unfiltered data
  
  // UI State
  filters: BoardFilters;
  viewMode: 'board' | 'list' | 'calendar';
  selectedProjects: string[];
  dragState: DragState;
  
  // Loading States
  loading: boolean;
  filtering: boolean;
  moving: boolean;
  error: string | null;
  
  // Performance
  lastFilterUpdate: number;
  filterDebounceTimer: NodeJS.Timeout | null;
}

export interface DragState {
  isDragging: boolean;
  draggedProjectId: string | null;
  draggedFromStage: PipelineStage | null;
  draggedToStage: PipelineStage | null;
  dragStartTime: number | null;
}

export interface BoardContextType extends BoardState {
  // Actions
  updateFilter: (filters: Partial<BoardFilters>) => void;
  moveProject: (projectId: string, targetStage: PipelineStage) => Promise<void>;
  selectProject: (projectId: string) => void;
  selectMultipleProjects: (projectIds: string[]) => void;
  clearSelection: () => void;
  setViewMode: (mode: 'board' | 'list' | 'calendar') => void;
  refreshBoard: () => Promise<void>;
  setDragState: (state: Partial<DragState>) => void;
}

// ========================================
// BOARD REDUCER
// ========================================

type BoardAction =
  | { type: 'SET_BOARD_DATA'; payload: BoardData }
  | { type: 'SET_ORIGINAL_BOARD_DATA'; payload: BoardData }
  | { type: 'SET_FILTERS'; payload: BoardFilters }
  | { type: 'SET_VIEW_MODE'; payload: 'board' | 'list' | 'calendar' }
  | { type: 'SET_SELECTED_PROJECTS'; payload: string[] }
  | { type: 'SET_DRAG_STATE'; payload: Partial<DragState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_FILTERING'; payload: boolean }
  | { type: 'SET_MOVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTER_DEBOUNCE_TIMER'; payload: NodeJS.Timeout | null };

const initialBoardState: BoardState = {
  boardData: null,
  originalBoardData: null,
  filters: {},
  viewMode: 'board',
  selectedProjects: [],
  dragState: {
    isDragging: false,
    draggedProjectId: null,
    draggedFromStage: null,
    draggedToStage: null,
    dragStartTime: null
  },
  loading: true,
  filtering: false,
  moving: false,
  error: null,
  lastFilterUpdate: 0,
  filterDebounceTimer: null
};

const boardReducer = (state: BoardState, action: BoardAction): BoardState => {
  switch (action.type) {
    case 'SET_BOARD_DATA':
      return { ...state, boardData: action.payload };
      
    case 'SET_ORIGINAL_BOARD_DATA':
      return { ...state, originalBoardData: action.payload };
      
    case 'SET_FILTERS':
      return { 
        ...state, 
        filters: action.payload, 
        lastFilterUpdate: Date.now() 
      };
      
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
      
    case 'SET_SELECTED_PROJECTS':
      return { ...state, selectedProjects: action.payload };
      
    case 'SET_DRAG_STATE':
      return { 
        ...state, 
        dragState: { ...state.dragState, ...action.payload } 
      };
      
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_FILTERING':
      return { ...state, filtering: action.payload };
      
    case 'SET_MOVING':
      return { ...state, moving: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_FILTER_DEBOUNCE_TIMER':
      // Clear existing timer
      if (state.filterDebounceTimer) {
        clearTimeout(state.filterDebounceTimer);
      }
      return { ...state, filterDebounceTimer: action.payload };
      
    default:
      return state;
  }
};

// ========================================
// BOARD CONTEXT
// ========================================

const BoardContext = createContext<BoardContextType | null>(null);

export const useBoardContext = (): BoardContextType => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error('useBoardContext must be used within a BoardProvider');
  }
  return context;
};

// ========================================
// BOARD PROVIDER KOMPONENTE
// ========================================

export interface BoardProviderProps {
  children: React.ReactNode;
  organizationId: string;
}

export const BoardProvider: React.FC<BoardProviderProps> = ({ 
  children, 
  organizationId 
}) => {
  const [state, dispatch] = useReducer(boardReducer, initialBoardState);
  const { user } = useAuth();
  
  // Real-time data loading
  const { 
    boardData: realtimeBoardData, 
    loading: realtimeLoading, 
    error: realtimeError,
    refresh: refreshRealtime,
    updateProjectsWithFilters
  } = useBoardRealtime(organizationId);

  // Update original board data when real-time data changes
  useEffect(() => {
    if (realtimeBoardData) {
      dispatch({ type: 'SET_ORIGINAL_BOARD_DATA', payload: realtimeBoardData });
      
      // If no filters are applied, use real-time data directly
      if (Object.keys(state.filters).length === 0) {
        dispatch({ type: 'SET_BOARD_DATA', payload: realtimeBoardData });
      }
    }
  }, [realtimeBoardData, state.filters]);

  // Update loading and error states from real-time hook
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: realtimeLoading });
    dispatch({ type: 'SET_ERROR', payload: realtimeError });
  }, [realtimeLoading, realtimeError]);

  // Filter application with debouncing
  const applyFiltersDebounced = useCallback(async (filters: BoardFilters) => {
    if (!state.originalBoardData) return;

    dispatch({ type: 'SET_FILTERING', payload: true });

    try {
      // Apply filters to each stage
      const filteredProjectsByStage: Record<PipelineStage, any[]> = {} as any;
      
      for (const [stage, projects] of Object.entries(state.originalBoardData.projectsByStage)) {
        filteredProjectsByStage[stage as PipelineStage] = await kanbanBoardService.applyFilters(
          projects, 
          filters
        );
      }

      // Create filtered board data
      const filteredBoardData: BoardData = {
        ...state.originalBoardData,
        projectsByStage: filteredProjectsByStage,
        totalProjects: Object.values(filteredProjectsByStage).flat().length
      };

      dispatch({ type: 'SET_BOARD_DATA', payload: filteredBoardData });
    } catch (error: any) {
      console.error('Filter application error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Filter-Fehler' });
    } finally {
      dispatch({ type: 'SET_FILTERING', payload: false });
    }
  }, [state.originalBoardData]);

  // Update filter with debouncing
  const updateFilter = useCallback((newFilters: Partial<BoardFilters>) => {
    const updatedFilters = { ...state.filters, ...newFilters };
    dispatch({ type: 'SET_FILTERS', payload: updatedFilters });

    // Debounce filter application
    const timer = setTimeout(() => {
      applyFiltersDebounced(updatedFilters);
    }, 300);

    dispatch({ type: 'SET_FILTER_DEBOUNCE_TIMER', payload: timer });
  }, [state.filters, applyFiltersDebounced]);

  // Move project action
  const moveProject = useCallback(async (projectId: string, targetStage: PipelineStage) => {
    if (!user || !state.originalBoardData) return;

    dispatch({ type: 'SET_MOVING', payload: true });

    try {
      // Find current stage of the project
      let currentStage: PipelineStage | null = null;
      
      for (const [stage, projects] of Object.entries(state.originalBoardData.projectsByStage)) {
        if (projects.some(p => p.id === projectId)) {
          currentStage = stage as PipelineStage;
          break;
        }
      }

      if (!currentStage) {
        throw new Error('Projekt nicht gefunden');
      }

      // Set drag state
      dispatch({ type: 'SET_DRAG_STATE', payload: {
        isDragging: true,
        draggedProjectId: projectId,
        draggedFromStage: currentStage,
        draggedToStage: targetStage,
        dragStartTime: Date.now()
      }});

      // Move project via service
      const result = await kanbanBoardService.moveProject(
        projectId,
        currentStage,
        targetStage,
        user.uid,
        organizationId
      );

      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Move failed');
      }

      // Success feedback
      console.log('Project moved successfully:', result.validationMessages?.join(', '));
      
    } catch (error: any) {
      console.error('Move project error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Move-Fehler' });
    } finally {
      dispatch({ type: 'SET_MOVING', payload: false });
      dispatch({ type: 'SET_DRAG_STATE', payload: {
        isDragging: false,
        draggedProjectId: null,
        draggedFromStage: null,
        draggedToStage: null,
        dragStartTime: null
      }});
    }
  }, [user, organizationId, state.originalBoardData]);

  // Project selection actions
  const selectProject = useCallback((projectId: string) => {
    const newSelection = state.selectedProjects.includes(projectId)
      ? state.selectedProjects.filter(id => id !== projectId)
      : [...state.selectedProjects, projectId];
    
    dispatch({ type: 'SET_SELECTED_PROJECTS', payload: newSelection });
  }, [state.selectedProjects]);

  const selectMultipleProjects = useCallback((projectIds: string[]) => {
    dispatch({ type: 'SET_SELECTED_PROJECTS', payload: projectIds });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_PROJECTS', payload: [] });
  }, []);

  // View mode action
  const setViewMode = useCallback((mode: 'board' | 'list' | 'calendar') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  // Refresh action
  const refreshBoard = useCallback(async () => {
    await refreshRealtime();
    // Re-apply filters if any
    if (Object.keys(state.filters).length > 0) {
      await applyFiltersDebounced(state.filters);
    }
  }, [refreshRealtime, state.filters, applyFiltersDebounced]);

  // Drag state setter
  const setDragState = useCallback((dragState: Partial<DragState>) => {
    dispatch({ type: 'SET_DRAG_STATE', payload: dragState });
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (state.filterDebounceTimer) {
        clearTimeout(state.filterDebounceTimer);
      }
    };
  }, [state.filterDebounceTimer]);

  // Context value
  const contextValue: BoardContextType = {
    ...state,
    updateFilter,
    moveProject,
    selectProject,
    selectMultipleProjects,
    clearSelection,
    setViewMode,
    refreshBoard,
    setDragState
  };

  return (
    <BoardContext.Provider value={contextValue}>
      {children}
    </BoardContext.Provider>
  );
};

export default BoardProvider;