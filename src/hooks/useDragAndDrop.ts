// src/hooks/useDragAndDrop.ts - Drag & Drop Hook für Plan 10/9
import { useDrag, useDrop } from 'react-dnd';
import { useCallback } from 'react';
import { Project, PipelineStage } from '@/types/project';
import { useAuth } from '@/context/AuthContext';

// ========================================
// DRAG & DROP INTERFACES
// ========================================

interface DragItem {
  id: string;
  currentStage: PipelineStage;
  title: string;
}

interface DragCollectedProps {
  isDragging: boolean;
}

interface DropCollectedProps {
  isOver: boolean;
  canDrop: boolean;
}

// ========================================
// DRAG & DROP HOOK
// ========================================

export const useDragAndDrop = (
  onProjectMove: (projectId: string, targetStage: PipelineStage) => void
) => {
  const { user } = useAuth();

  // Drag Source - für draggable Projekt-Karten
  const useDraggableProject = (project: Project) => {
    const [{ isDragging }, drag] = useDrag<DragItem, void, DragCollectedProps>({
      type: 'PROJECT',
      item: {
        id: project.id || '',
        currentStage: project.currentStage,
        title: project.title
      },
      canDrag: () => canMoveProject(project),
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    });
    
    return { isDragging, drag };
  };

  // Drop Target - für Stage-Spalten
  const useDropZone = (targetStage: PipelineStage) => {
    const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, DropCollectedProps>({
      accept: 'PROJECT',
      drop: (item: DragItem) => {
        if (validateStageTransition(item.currentStage, targetStage)) {
          onProjectMove(item.id, targetStage);
        }
      },
      canDrop: (item: DragItem) => {
        return validateStageTransition(item.currentStage, targetStage);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop()
      })
    });
    
    return { isOver, canDrop, drop };
  };

  // Business Logic für Drag-Berechtigung
  const canMoveProject = useCallback((project: Project): boolean => {
    if (!user) return false;

    // Benutzer muss dem Projekt zugewiesen sein oder Admin/Manager sein
    const isAssignedToProject = project.assignedTo?.includes(user.uid) || false;
    const isProjectOwner = project.userId === user.uid;
    
    // TODO: Role-based permissions implementieren
    // const hasProjectManagerRole = hasRole('project_manager');
    const hasProjectManagerRole = true; // Placeholder
    
    return isAssignedToProject || isProjectOwner || hasProjectManagerRole;
  }, [user]);

  // Validierung der Stage-Übergänge
  const validateStageTransition = useCallback((
    fromStage: PipelineStage,
    toStage: PipelineStage
  ): boolean => {
    // Kein Move zu derselben Stage
    if (fromStage === toStage) return false;

    // Gültige Übergänge definieren
    const validTransitions: Record<PipelineStage, PipelineStage[]> = {
      'ideas_planning': ['creation'],
      'creation': ['ideas_planning', 'approval'],
      'approval': ['creation', 'distribution'],
      'distribution': ['approval', 'monitoring'],
      'monitoring': ['distribution', 'completed'],
      'completed': ['monitoring'] // Rollback möglich
    };

    return validTransitions[fromStage]?.includes(toStage) || false;
  }, []);

  // Hilfsfunktion: Bekomme nächste erlaubte Stages
  const getValidTargetStages = useCallback((currentStage: PipelineStage): PipelineStage[] => {
    const validTransitions: Record<PipelineStage, PipelineStage[]> = {
      'ideas_planning': ['creation'],
      'creation': ['ideas_planning', 'approval'],
      'approval': ['creation', 'distribution'],
      'distribution': ['approval', 'monitoring'],
      'monitoring': ['distribution', 'completed'],
      'completed': ['monitoring']
    };

    return validTransitions[currentStage] || [];
  }, []);

  // Hilfsfunktion: Ermittle Stage-Transition-Typ
  const getTransitionType = useCallback((
    fromStage: PipelineStage,
    toStage: PipelineStage
  ): 'forward' | 'backward' | 'invalid' => {
    const stageOrder: PipelineStage[] = [
      'ideas_planning',
      'creation',
      'approval',
      'distribution',
      'monitoring',
      'completed'
    ];

    const fromIndex = stageOrder.indexOf(fromStage);
    const toIndex = stageOrder.indexOf(toStage);

    if (fromIndex === -1 || toIndex === -1) return 'invalid';
    if (!validateStageTransition(fromStage, toStage)) return 'invalid';
    
    return toIndex > fromIndex ? 'forward' : 'backward';
  }, [validateStageTransition]);

  // Visual Feedback Helper
  const getDragFeedback = useCallback((
    isOver: boolean,
    canDrop: boolean,
    targetStage: PipelineStage
  ): {
    dropZoneClass: string;
    message: string;
    canDropHere: boolean;
  } => {
    if (!isOver) {
      return {
        dropZoneClass: '',
        message: '',
        canDropHere: false
      };
    }

    if (canDrop) {
      return {
        dropZoneClass: 'bg-green-100 border-2 border-green-300 border-dashed',
        message: `Hier ablegen für ${getStageName(targetStage)}`,
        canDropHere: true
      };
    } else {
      return {
        dropZoneClass: 'bg-red-100 border-2 border-red-300 border-dashed',
        message: 'Übergang nicht erlaubt',
        canDropHere: false
      };
    }
  }, []);

  // Stage-Namen für UI
  const getStageName = useCallback((stage: PipelineStage): string => {
    const stageNames: Record<PipelineStage, string> = {
      'ideas_planning': 'Ideen & Planung',
      'creation': 'Content und Materialien erstellen',
      'approval': 'Freigabe',
      'distribution': 'Verteilung',
      'monitoring': 'Monitoring',
      'completed': 'Abgeschlossen'
    };

    return stageNames[stage] || stage;
  }, []);

  return { 
    useDraggableProject, 
    useDropZone,
    canMoveProject,
    validateStageTransition,
    getValidTargetStages,
    getTransitionType,
    getDragFeedback,
    getStageName
  };
};