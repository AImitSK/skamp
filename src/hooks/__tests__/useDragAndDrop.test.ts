// src/hooks/__tests__/useDragAndDrop.test.ts
// Umfassende Tests für useDragAndDrop Hook
import { renderHook } from '@testing-library/react';
import { useDragAndDrop } from '../useDragAndDrop';
import { useAuth } from '@/context/AuthContext';
import { Project, PipelineStage } from '@/types/project';
import { Timestamp } from 'firebase/firestore';

// ========================================
// MOCKS SETUP
// ========================================

// useAuth Mock - Muss den gleichen Pfad wie in der Hook-Implementierung mocken
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    loading: false,
    logout: jest.fn(),
    register: jest.fn(),
    login: jest.fn(),
    uploadProfileImage: jest.fn(),
    deleteProfileImage: jest.fn(),
    getAvatarUrl: jest.fn(() => null),
    getInitials: jest.fn(() => ''),
    updateUserProfile: jest.fn(),
    sendVerificationEmail: jest.fn()
  }))
}));

// react-dnd Mocks - Muss korrekt als Array [collected, ref, preview?] zurückgeben
// Wichtig: Mock-Funktionen müssen vor dem Import der zu testenden Datei definiert werden
jest.mock('react-dnd', () => {
  const mockDragRef = jest.fn();
  const mockDropRef = jest.fn();

  return {
    useDrag: jest.fn(() => [
      { isDragging: false },
      mockDragRef,
      jest.fn()
    ]),
    useDrop: jest.fn(() => [
      { isOver: false, canDrop: true },
      mockDropRef,
      jest.fn()
    ])
  };
});

// ========================================
// TEST DATA
// ========================================

const mockTimestamp = Timestamp.now();

const mockUser = {
  uid: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: jest.fn(),
  getIdToken: jest.fn(),
  getIdTokenResult: jest.fn(),
  reload: jest.fn(),
  toJSON: jest.fn(),
  providerId: '',
  phoneNumber: null,
  photoURL: null
};

const mockProject: Project = {
  id: 'project-1',
  title: 'Test Projekt',
  description: 'Test Beschreibung',
  currentStage: 'creation' as PipelineStage,
  status: 'active',
  organizationId: 'org-1',
  userId: 'user-1',
  createdAt: mockTimestamp,
  updatedAt: mockTimestamp,
  assignedTo: ['user-1', 'user-2']
};

const mockProjectNotAssigned: Project = {
  ...mockProject,
  id: 'project-2',
  userId: 'user-3',
  assignedTo: ['user-3', 'user-4']
};

// ========================================
// TESTS
// ========================================

describe('useDragAndDrop', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  const mockOnProjectMove = jest.fn();

  beforeEach(() => {
    // WICHTIG: Verwende jest.restoreAllMocks() statt jest.clearAllMocks()
    // clearAllMocks löscht auch die Mock-Implementierungen von useDrag/useDrop
    mockOnProjectMove.mockClear();

    // Standard Mock: User ist eingeloggt
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      logout: jest.fn(),
      register: jest.fn(),
      login: jest.fn(),
      uploadProfileImage: jest.fn(),
      deleteProfileImage: jest.fn(),
      getAvatarUrl: jest.fn(() => null),
      getInitials: jest.fn(() => 'TU'),
      updateUserProfile: jest.fn(),
      sendVerificationEmail: jest.fn()
    });
  });

  afterEach(() => {
    // Verwende mockClear statt resetAllMocks um Mock-Implementierungen zu erhalten
    mockOnProjectMove.mockClear();
  });

  // ========================================
  // BASIC FUNCTIONALITY TESTS
  // ========================================

  describe('Basic Functionality', () => {
    it('sollte Hook ohne Fehler initialisieren', () => {
      // Act
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));

      // Assert
      expect(result.current).toBeDefined();
      expect(typeof result.current.useDraggableProject).toBe('function');
      expect(typeof result.current.useDropZone).toBe('function');
      expect(typeof result.current.canMoveProject).toBe('function');
      expect(typeof result.current.validateStageTransition).toBe('function');
      expect(typeof result.current.getValidTargetStages).toBe('function');
      expect(typeof result.current.getTransitionType).toBe('function');
      expect(typeof result.current.getDragFeedback).toBe('function');
      expect(typeof result.current.getStageName).toBe('function');
    });

    it('sollte useDraggableProject Placeholder zurückgeben', () => {
      // Arrange
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));

      // Act
      const draggableResult = result.current.useDraggableProject(mockProject);

      // Assert
      expect(draggableResult.isDragging).toBe(false);
      expect(typeof draggableResult.drag).toBe('function');
    });

    it('sollte useDropZone Placeholder zurückgeben', () => {
      // Arrange
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));

      // Act
      const dropZoneResult = result.current.useDropZone('approval');

      // Assert
      expect(dropZoneResult.isOver).toBe(false);
      expect(dropZoneResult.canDrop).toBe(true);
      expect(typeof dropZoneResult.drop).toBe('function');
    });
  });

  // ========================================
  // CANMOVEPROJECT TESTS
  // ========================================

  describe('canMoveProject', () => {
    it('sollte true zurückgeben wenn User dem Projekt zugewiesen ist', () => {
      // Arrange
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));

      // Act
      const canMove = result.current.canMoveProject(mockProject);

      // Assert
      expect(canMove).toBe(true);
    });

    it('sollte true zurückgeben wenn User der Projekt-Owner ist', () => {
      // Arrange
      const projectOwnedByUser = {
        ...mockProject,
        userId: 'user-1',
        assignedTo: ['user-3', 'user-4'] // User nicht zugewiesen, aber Owner
      };
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));

      // Act
      const canMove = result.current.canMoveProject(projectOwnedByUser);

      // Assert
      expect(canMove).toBe(true);
    });

    it('sollte true zurückgeben für Projekt-Manager (Placeholder)', () => {
      // Arrange
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));

      // Act
      const canMove = result.current.canMoveProject(mockProjectNotAssigned);

      // Assert
      expect(canMove).toBe(true); // Placeholder implementierung gibt immer true zurück
    });

    it('sollte false zurückgeben wenn kein User eingeloggt ist', () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        logout: jest.fn(),
        register: jest.fn(),
        login: jest.fn(),
        uploadProfileImage: jest.fn(),
        deleteProfileImage: jest.fn(),
        getAvatarUrl: jest.fn(() => null),
        getInitials: jest.fn(() => 'TU'),
        updateUserProfile: jest.fn(),
        sendVerificationEmail: jest.fn()
      });
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));

      // Act
      const canMove = result.current.canMoveProject(mockProject);

      // Assert
      expect(canMove).toBe(false);
    });

    it('sollte mit leerer assignedTo-Liste umgehen', () => {
      // Arrange
      const projectWithoutAssignments = {
        ...mockProject,
        assignedTo: undefined,
        userId: 'user-2' // Nicht der aktuelle User
      };
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));

      // Act
      const canMove = result.current.canMoveProject(projectWithoutAssignments);

      // Assert
      expect(canMove).toBe(true); // Project Manager Role gibt true zurück
    });

    it('sollte mit leerer assignedTo-Array umgehen', () => {
      // Arrange
      const projectWithEmptyAssignments = {
        ...mockProject,
        assignedTo: [],
        userId: 'user-2' // Nicht der aktuelle User
      };
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));

      // Act
      const canMove = result.current.canMoveProject(projectWithEmptyAssignments);

      // Assert
      expect(canMove).toBe(true); // Project Manager Role gibt true zurück
    });
  });

  // ========================================
  // VALIDATESTAGETRANSITION TESTS
  // ========================================

  describe('validateStageTransition', () => {
    const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));
    const validate = result.current.validateStageTransition;

    it('sollte gültige Vorwärts-Übergänge erlauben', () => {
      // Valid forward transitions
      expect(validate('ideas_planning', 'creation')).toBe(true);
      expect(validate('creation', 'approval')).toBe(true);
      expect(validate('approval', 'distribution')).toBe(true);
      expect(validate('distribution', 'monitoring')).toBe(true);
      expect(validate('monitoring', 'completed')).toBe(true);
    });

    it('sollte gültige Rückwärts-Übergänge erlauben', () => {
      // Valid backward transitions
      expect(validate('creation', 'ideas_planning')).toBe(true);
      expect(validate('approval', 'creation')).toBe(true);
      expect(validate('distribution', 'approval')).toBe(true);
      expect(validate('monitoring', 'distribution')).toBe(true);
      expect(validate('completed', 'monitoring')).toBe(true);
    });

    it('sollte ungültige Übergänge ablehnen', () => {
      // Invalid transitions - skipping stages
      expect(validate('ideas_planning', 'approval')).toBe(false);
      expect(validate('creation', 'distribution')).toBe(false);
      expect(validate('ideas_planning', 'completed')).toBe(false);
      expect(validate('approval', 'monitoring')).toBe(false);
    });

    it('sollte Übergänge zur selben Stage ablehnen', () => {
      // Same stage transitions
      expect(validate('creation', 'creation')).toBe(false);
      expect(validate('approval', 'approval')).toBe(false);
      expect(validate('completed', 'completed')).toBe(false);
    });

    it('sollte mit unbekannten Stages umgehen', () => {
      // Unknown stages
      expect(validate('unknown' as PipelineStage, 'creation')).toBe(false);
      expect(validate('creation', 'unknown' as PipelineStage)).toBe(false);
      expect(validate('unknown1' as PipelineStage, 'unknown2' as PipelineStage)).toBe(false);
    });
  });

  // ========================================
  // GETVALIDTARGETSTAGES TESTS
  // ========================================

  describe('getValidTargetStages', () => {
    const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));
    const getValidStages = result.current.getValidTargetStages;

    it('sollte korrekte gültige Stages für jede Pipeline-Stage zurückgeben', () => {
      expect(getValidStages('ideas_planning')).toEqual(['creation']);
      expect(getValidStages('creation')).toEqual(['ideas_planning', 'approval']);
      expect(getValidStages('approval')).toEqual(['creation', 'distribution']);
      expect(getValidStages('distribution')).toEqual(['approval', 'monitoring']);
      expect(getValidStages('monitoring')).toEqual(['distribution', 'completed']);
      expect(getValidStages('completed')).toEqual(['monitoring']);
    });

    it('sollte leeres Array für unbekannte Stages zurückgeben', () => {
      expect(getValidStages('unknown' as PipelineStage)).toEqual([]);
    });

    it('sollte immer mindestens eine gültige Stage haben (außer bei unbekannten)', () => {
      const validStages: PipelineStage[] = [
        'ideas_planning',
        'creation',
        'approval',
        'distribution',
        'monitoring',
        'completed'
      ];

      validStages.forEach(stage => {
        const targets = getValidStages(stage);
        expect(targets.length).toBeGreaterThan(0);
      });
    });
  });

  // ========================================
  // GETTRANSITIONTYPE TESTS
  // ========================================

  describe('getTransitionType', () => {
    const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));
    const getType = result.current.getTransitionType;

    it('sollte forward für Vorwärts-Übergänge erkennen', () => {
      expect(getType('ideas_planning', 'creation')).toBe('forward');
      expect(getType('creation', 'approval')).toBe('forward');
      expect(getType('approval', 'distribution')).toBe('forward');
      expect(getType('monitoring', 'completed')).toBe('forward');
    });

    it('sollte backward für Rückwärts-Übergänge erkennen', () => {
      expect(getType('creation', 'ideas_planning')).toBe('backward');
      expect(getType('approval', 'creation')).toBe('backward');
      expect(getType('distribution', 'approval')).toBe('backward');
      expect(getType('completed', 'monitoring')).toBe('backward');
    });

    it('sollte invalid für ungültige Übergänge erkennen', () => {
      expect(getType('ideas_planning', 'approval')).toBe('invalid');
      expect(getType('creation', 'distribution')).toBe('invalid');
      expect(getType('ideas_planning', 'completed')).toBe('invalid');
      expect(getType('creation', 'creation')).toBe('invalid');
    });

    it('sollte invalid für unbekannte Stages erkennen', () => {
      expect(getType('unknown' as PipelineStage, 'creation')).toBe('invalid');
      expect(getType('creation', 'unknown' as PipelineStage)).toBe('invalid');
    });
  });

  // ========================================
  // GETDRAGFEEDBACK TESTS
  // ========================================

  describe('getDragFeedback', () => {
    const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));
    const getFeedback = result.current.getDragFeedback;

    it('sollte leeren Feedback geben wenn nicht isOver', () => {
      // Act
      const feedback = getFeedback(false, true, 'creation');

      // Assert
      expect(feedback.dropZoneClass).toBe('');
      expect(feedback.message).toBe('');
      expect(feedback.canDropHere).toBe(false);
    });

    it('sollte positiven Feedback geben bei gültigem Drop', () => {
      // Act
      const feedback = getFeedback(true, true, 'creation');

      // Assert
      expect(feedback.dropZoneClass).toBe('bg-green-100 border-2 border-green-300 border-dashed');
      expect(feedback.message).toBe('Hier ablegen für Content und Materialien');
      expect(feedback.canDropHere).toBe(true);
    });

    it('sollte negativen Feedback geben bei ungültigem Drop', () => {
      // Act
      const feedback = getFeedback(true, false, 'creation');

      // Assert
      expect(feedback.dropZoneClass).toBe('bg-red-100 border-2 border-red-300 border-dashed');
      expect(feedback.message).toBe('Übergang nicht erlaubt');
      expect(feedback.canDropHere).toBe(false);
    });

    it('sollte korrekte Stage-Namen in Feedback verwenden', () => {
      // Act
      const feedbacks = [
        getFeedback(true, true, 'ideas_planning'),
        getFeedback(true, true, 'creation'),
        getFeedback(true, true, 'approval'),
        getFeedback(true, true, 'distribution'),
        getFeedback(true, true, 'monitoring'),
        getFeedback(true, true, 'completed')
      ];

      // Assert
      expect(feedbacks[0].message).toContain('Ideen & Planung');
      expect(feedbacks[1].message).toContain('Content und Materialien');
      expect(feedbacks[2].message).toContain('Freigabe');
      expect(feedbacks[3].message).toContain('Verteilung');
      expect(feedbacks[4].message).toContain('Monitoring');
      expect(feedbacks[5].message).toContain('Abgeschlossen');
    });
  });

  // ========================================
  // GETSTAGENAME TESTS
  // ========================================

  describe('getStageName', () => {
    const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));
    const getStageName = result.current.getStageName;

    it('sollte korrekte deutsche Stage-Namen zurückgeben', () => {
      expect(getStageName('ideas_planning')).toBe('Ideen & Planung');
      expect(getStageName('creation')).toBe('Content und Materialien');
      expect(getStageName('approval')).toBe('Freigabe');
      expect(getStageName('distribution')).toBe('Verteilung');
      expect(getStageName('monitoring')).toBe('Monitoring');
      expect(getStageName('completed')).toBe('Abgeschlossen');
    });

    it('sollte unbekannte Stages als Original-String zurückgeben', () => {
      const unknownStage = 'unknown_stage' as PipelineStage;
      expect(getStageName(unknownStage)).toBe('unknown_stage');
    });

    it('sollte konsistente Namen für UI-Verwendung liefern', () => {
      const allStages: PipelineStage[] = [
        'ideas_planning',
        'creation',
        'approval',
        'distribution',
        'monitoring',
        'completed'
      ];

      allStages.forEach(stage => {
        const stageName = getStageName(stage);
        expect(typeof stageName).toBe('string');
        expect(stageName.length).toBeGreaterThan(0);
        // Sollte deutsche Sonderzeichen unterstützen
        expect(stageName).toMatch(/^[a-zA-ZäöüßÄÖÜ\s&-]+$/);
      });
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe('Integration Tests', () => {
    it('sollte vollständigen Drag & Drop Workflow simulieren', () => {
      // Arrange
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));
      const fromStage = 'creation' as PipelineStage;
      const toStage = 'approval' as PipelineStage;

      // Act & Assert - Step 1: Check permissions
      expect(result.current.canMoveProject(mockProject)).toBe(true);

      // Step 2: Validate transition
      expect(result.current.validateStageTransition(fromStage, toStage)).toBe(true);

      // Step 3: Get transition type
      expect(result.current.getTransitionType(fromStage, toStage)).toBe('forward');

      // Step 4: Get valid targets (should include toStage)
      expect(result.current.getValidTargetStages(fromStage)).toContain(toStage);

      // Step 5: Get feedback for valid drop
      const feedback = result.current.getDragFeedback(true, true, toStage);
      expect(feedback.canDropHere).toBe(true);
      expect(feedback.message).toContain('Freigabe');
    });

    it('sollte ungültigen Drag & Drop Workflow ablehnen', () => {
      // Arrange
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));
      const fromStage = 'ideas_planning' as PipelineStage;
      const toStage = 'completed' as PipelineStage; // Ungültiger Sprung

      // Act & Assert - Permissions ok
      expect(result.current.canMoveProject(mockProject)).toBe(true);

      // But transition invalid
      expect(result.current.validateStageTransition(fromStage, toStage)).toBe(false);
      expect(result.current.getTransitionType(fromStage, toStage)).toBe('invalid');
      expect(result.current.getValidTargetStages(fromStage)).not.toContain(toStage);

      // Feedback should be negative
      const feedback = result.current.getDragFeedback(true, false, toStage);
      expect(feedback.canDropHere).toBe(false);
      expect(feedback.message).toBe('Übergang nicht erlaubt');
    });

    it('sollte User-Permissions korrekt mit Stage-Validierung kombinieren', () => {
      // Arrange - User hat keine Berechtigung
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        logout: jest.fn(),
        register: jest.fn(),
        login: jest.fn(),
        uploadProfileImage: jest.fn(),
        deleteProfileImage: jest.fn(),
        getAvatarUrl: jest.fn(() => null),
        getInitials: jest.fn(() => 'TU'),
        updateUserProfile: jest.fn(),
        sendVerificationEmail: jest.fn()
      });

      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));
      const fromStage = 'creation' as PipelineStage;
      const toStage = 'approval' as PipelineStage;

      // Act & Assert - Kein User
      expect(result.current.canMoveProject(mockProject)).toBe(false);

      // Stage-Transition wäre gültig, aber User hat keine Berechtigung
      expect(result.current.validateStageTransition(fromStage, toStage)).toBe(true);
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================

  describe('Edge Cases', () => {
    it('sollte mit null/undefined Projekten umgehen', () => {
      // Arrange
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));

      // Act & Assert
      // HINWEIS: Die aktuelle Implementierung wirft einen Fehler bei null
      // Dies ist technisch korrekt, da der Type Project erwartet wird (nicht Project | null)
      expect(() => {
        result.current.canMoveProject(null as any);
      }).toThrow();
    });

    it('sollte Hook-Referenzen stabil halten bei Re-renders', () => {
      // Arrange
      const { result, rerender } = renderHook(() => useDragAndDrop(mockOnProjectMove));
      
      const initialRefs = {
        canMoveProject: result.current.canMoveProject,
        validateStageTransition: result.current.validateStageTransition,
        getValidTargetStages: result.current.getValidTargetStages
      };

      // Act - Re-render
      rerender();

      // Assert - Referenzen sollten stabil bleiben
      expect(result.current.canMoveProject).toBe(initialRefs.canMoveProject);
      expect(result.current.validateStageTransition).toBe(initialRefs.validateStageTransition);
      expect(result.current.getValidTargetStages).toBe(initialRefs.getValidTargetStages);
    });

    it('sollte bei User-Änderungen neu evaluieren', () => {
      // Arrange - Initial kein User
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        logout: jest.fn(),
        register: jest.fn(),
        login: jest.fn(),
        uploadProfileImage: jest.fn(),
        deleteProfileImage: jest.fn(),
        getAvatarUrl: jest.fn(() => null),
        getInitials: jest.fn(() => 'TU'),
        updateUserProfile: jest.fn(),
        sendVerificationEmail: jest.fn()
      });

      const { result, rerender } = renderHook(() => useDragAndDrop(mockOnProjectMove));
      
      // Act & Assert - Initial kein Move möglich
      expect(result.current.canMoveProject(mockProject)).toBe(false);

      // User loggt sich ein
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        logout: jest.fn(),
        register: jest.fn(),
        login: jest.fn(),
        uploadProfileImage: jest.fn(),
        deleteProfileImage: jest.fn(),
        getAvatarUrl: jest.fn(() => null),
        getInitials: jest.fn(() => 'TU'),
        updateUserProfile: jest.fn(),
        sendVerificationEmail: jest.fn()
      });
      
      rerender();

      // Move jetzt möglich
      expect(result.current.canMoveProject(mockProject)).toBe(true);
    });

    it('sollte Performance bei häufigen Validierungen optimieren', () => {
      // Arrange
      const { result } = renderHook(() => useDragAndDrop(mockOnProjectMove));

      // Act - Viele Validierungen durchführen
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        result.current.validateStageTransition('creation', 'approval');
        result.current.getValidTargetStages('creation');
        result.current.getTransitionType('creation', 'approval');
      }
      const end = Date.now();

      // Assert - Sollte performant sein
      expect(end - start).toBeLessThan(100); // Weniger als 100ms für 1000 Operationen
    });
  });
});