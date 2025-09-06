// src/lib/firebase/__tests__/pipeline-workflow-service.test.ts  
// PLAN 8/9: PIPELINE-TASK-INTEGRATION - PipelineWorkflowService Tests
import { PipelineWorkflowService, pipelineWorkflowService } from '../pipeline-workflow-service';
import { StageTransitionWorkflow, TransitionAction, ValidationCheck, ProjectProgress, TaskTemplate } from '../pipeline-workflow-service';
import { PipelineStage } from '@/types/project';
import { PipelineAwareTask } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
jest.mock('../client-init', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn()
  }
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'mocked-collection'),
  doc: jest.fn(() => 'mocked-doc'),
  query: jest.fn(() => 'mocked-query'),
  where: jest.fn(() => 'mocked-where'),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => ({ 
    _methodName: 'serverTimestamp',
    toDate: () => new Date(),
    toMillis: () => Date.now()
  } as any)),
  Timestamp: {
    now: jest.fn(() => ({ 
      toDate: () => new Date(),
      toMillis: () => Date.now(),
      seconds: Math.floor(Date.now() / 1000)
    })),
    fromDate: jest.fn((date: Date) => ({ 
      toDate: () => date,
      toMillis: () => date.getTime(),
      seconds: Math.floor(date.getTime() / 1000)
    }))
  }
}));

// Mock Services
jest.mock('../task-service', () => ({
  taskService: {
    getById: jest.fn(),
    getByProjectId: jest.fn(),
    getByProjectStage: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    markAsCompleted: jest.fn(),
    checkStageCompletionRequirements: jest.fn()
  }
}));

jest.mock('../project-service', () => ({
  projectService: {
    getById: jest.fn(),
    update: jest.fn(),
    scheduleStageDeadlines: jest.fn()
  }
}));

const mockFirestore = require('firebase/firestore');
const mockTaskService = require('../task-service').taskService;
const mockProjectService = require('../project-service').projectService;

describe('PipelineWorkflowService Tests', () => {
  const testProjectId = 'project-workflow-123';
  const testOrganizationId = 'org-workflow-123';

  let workflowService: PipelineWorkflowService;

  beforeEach(() => {
    jest.clearAllMocks();
    workflowService = new PipelineWorkflowService();
  });

  describe('processStageTransition', () => {
    const mockProject = {
      id: testProjectId,
      organizationId: testOrganizationId,
      currentStage: 'creation'
    };

    beforeEach(() => {
      mockProjectService.update.mockResolvedValue(undefined);
    });

    it('sollte erfolgreiche Stage-Transition verarbeiten', async () => {
      // Mock workflow validation and execution
      jest.spyOn(workflowService as any, 'validateTransitionRequirements').mockResolvedValue(undefined);
      jest.spyOn(workflowService as any, 'executeTransitionActions').mockResolvedValue(undefined);
      jest.spyOn(workflowService as any, 'postTransitionCleanup').mockResolvedValue(undefined);

      await workflowService.processStageTransition(
        testProjectId,
        'creation',
        'internal_approval'
      );

      expect(mockProjectService.update).toHaveBeenCalledWith(
        testProjectId,
        expect.objectContaining({
          currentStage: 'internal_approval',
          workflowState: expect.objectContaining({
            stageHistory: expect.arrayContaining([
              expect.objectContaining({
                stage: 'internal_approval',
                triggeredBy: 'automatic'
              })
            ])
          })
        }),
        expect.any(Object)
      );
    });

    it('sollte Fehler bei Transition-Validation handhaben', async () => {
      jest.spyOn(workflowService as any, 'validateTransitionRequirements')
        .mockRejectedValue(new Error('Validation failed'));
      
      jest.spyOn(workflowService as any, 'handleTransitionError').mockResolvedValue(undefined);

      await workflowService.processStageTransition(
        testProjectId,
        'creation',
        'internal_approval'
      );

      expect(workflowService['handleTransitionError']).toHaveBeenCalledWith(
        testProjectId,
        'creation',
        'internal_approval',
        expect.any(Error)
      );
    });

    it('sollte alle Stage-Kombinationen unterstützen', async () => {
      const stageTransitions: Array<[PipelineStage, PipelineStage]> = [
        ['ideas_planning', 'creation'],
        ['creation', 'internal_approval'],
        ['internal_approval', 'customer_approval'],
        ['customer_approval', 'distribution'],
        ['distribution', 'monitoring'],
        ['monitoring', 'completed']
      ];

      jest.spyOn(workflowService as any, 'validateTransitionRequirements').mockResolvedValue(undefined);
      jest.spyOn(workflowService as any, 'executeTransitionActions').mockResolvedValue(undefined);
      jest.spyOn(workflowService as any, 'postTransitionCleanup').mockResolvedValue(undefined);

      for (const [fromStage, toStage] of stageTransitions) {
        await workflowService.processStageTransition(testProjectId, fromStage, toStage);
        
        expect(mockProjectService.update).toHaveBeenCalledWith(
          testProjectId,
          expect.objectContaining({
            currentStage: toStage
          }),
          expect.any(Object)
        );
      }
    });
  });

  describe('updateTaskDependencies', () => {
    const completedTask: PipelineAwareTask = {
      id: 'completed-task-123',
      userId: 'user-123',
      organizationId: testOrganizationId,
      title: 'Completed Task',
      status: 'completed',
      priority: 'medium',
      linkedProjectId: testProjectId
    };

    const dependentTasks: PipelineAwareTask[] = [
      {
        id: 'dependent-1',
        userId: 'user-123',
        organizationId: testOrganizationId,
        title: 'Dependent Task 1',
        status: 'blocked',
        priority: 'high',
        linkedProjectId: testProjectId,
        dependsOnTaskIds: ['completed-task-123']
      },
      {
        id: 'dependent-2',
        userId: 'user-123',
        organizationId: testOrganizationId,
        title: 'Dependent Task 2',
        status: 'blocked',
        priority: 'medium',
        linkedProjectId: testProjectId,
        dependsOnTaskIds: ['completed-task-123', 'other-task']
      },
      {
        id: 'other-task',
        userId: 'user-123',
        organizationId: testOrganizationId,
        title: 'Other Task',
        status: 'completed',
        priority: 'low',
        linkedProjectId: testProjectId
      }
    ];

    beforeEach(() => {
      mockTaskService.getById.mockResolvedValue(completedTask);
      mockTaskService.getByProjectId.mockResolvedValue(dependentTasks);
      mockTaskService.update.mockResolvedValue(undefined);
    });

    it('sollte abhängige Tasks entsperren wenn alle Dependencies erfüllt sind', async () => {
      await workflowService.updateTaskDependencies('completed-task-123');

      expect(mockTaskService.update).toHaveBeenCalledWith('dependent-1', { status: 'pending' });
      expect(mockTaskService.update).toHaveBeenCalledWith('dependent-2', { status: 'pending' });
    });

    it('sollte Tasks nicht entsperren wenn Dependencies fehlen', async () => {
      const partialDependentTasks = [
        ...dependentTasks,
        {
          id: 'other-task',
          status: 'pending' // Nicht completed
        }
      ] as PipelineAwareTask[];

      mockTaskService.getByProjectId.mockResolvedValue(partialDependentTasks);

      await workflowService.updateTaskDependencies('completed-task-123');

      expect(mockTaskService.update).toHaveBeenCalledWith('dependent-1', { status: 'pending' });
      expect(mockTaskService.update).not.toHaveBeenCalledWith('dependent-2', { status: 'pending' });
    });

    it('sollte mit Task ohne linkedProjectId umgehen', async () => {
      mockTaskService.getById.mockResolvedValue({
        ...completedTask,
        linkedProjectId: undefined
      });

      await workflowService.updateTaskDependencies('completed-task-123');

      expect(mockTaskService.getByProjectId).not.toHaveBeenCalled();
    });

    it('sollte mit nicht existierender Task umgehen', async () => {
      mockTaskService.getById.mockResolvedValue(null);

      await workflowService.updateTaskDependencies('non-existent-task');

      expect(mockTaskService.getByProjectId).not.toHaveBeenCalled();
    });
  });

  describe('calculateProjectProgress', () => {
    const mockProject = {
      id: testProjectId,
      organizationId: testOrganizationId
    };

    const mockTasks: PipelineAwareTask[] = [
      {
        id: 'task-1',
        pipelineStage: 'creation',
        status: 'completed',
        requiredForStageCompletion: true
      },
      {
        id: 'task-2', 
        pipelineStage: 'creation',
        status: 'pending',
        requiredForStageCompletion: true
      },
      {
        id: 'task-3',
        pipelineStage: 'internal_approval',
        status: 'completed',
        requiredForStageCompletion: false
      },
      {
        id: 'task-4',
        pipelineStage: 'monitoring',
        status: 'pending',
        requiredForStageCompletion: true
      }
    ] as PipelineAwareTask[];

    beforeEach(() => {
      mockProjectService.getById.mockResolvedValue(mockProject);
      mockTaskService.getByProjectId.mockResolvedValue(mockTasks);
    });

    it('sollte korrekten Projekt-Progress berechnen', async () => {
      const result: ProjectProgress = await workflowService.calculateProjectProgress(testProjectId);

      expect(result.overallPercent).toBeGreaterThan(0);
      expect(result.stageProgress.creation).toBe(50); // 1 von 2 Tasks completed
      expect(result.stageProgress.internal_approval).toBe(100); // 1 von 1 Tasks completed
      expect(result.stageProgress.monitoring).toBe(0); // 0 von 1 Tasks completed
      expect(result.taskCompletion).toBe(50); // 2 von 4 Tasks completed
      expect(result.criticalTasksRemaining).toBe(2); // task-2 und task-4
      expect(result.lastUpdated).toBeDefined();
      expect(result.milestones).toEqual([]);
    });

    it('sollte mit Projekt ohne Tasks umgehen', async () => {
      mockTaskService.getByProjectId.mockResolvedValue([]);

      const result = await workflowService.calculateProjectProgress(testProjectId);

      expect(result.overallPercent).toBe(0);
      expect(result.taskCompletion).toBe(0);
      expect(result.criticalTasksRemaining).toBe(0);
      
      // Alle Stage-Progress sollten 0 sein
      Object.values(result.stageProgress).forEach(progress => {
        expect(progress).toBe(0);
      });
    });

    it('sollte Stage-Gewichtung korrekt anwenden', async () => {
      // Mock nur creation tasks als completed
      mockTaskService.getByProjectId.mockResolvedValue([
        { pipelineStage: 'creation', status: 'completed' },
        { pipelineStage: 'creation', status: 'completed' }
      ] as PipelineAwareTask[]);

      const result = await workflowService.calculateProjectProgress(testProjectId);

      expect(result.stageProgress.creation).toBe(100);
      expect(result.overallPercent).toBe(25); // creation hat 25% Gewichtung
    });

    it('sollte Fehler für nicht existierendes Projekt werfen', async () => {
      mockProjectService.getById.mockResolvedValue(null);

      await expect(workflowService.calculateProjectProgress('non-existent-project'))
        .rejects.toThrow('Projekt nicht gefunden');
    });
  });

  describe('Workflow-spezifische Tests', () => {
    describe('getWorkflowForTransition', () => {
      it('sollte korrekten Workflow für ideas_planning -> creation zurückgeben', () => {
        const workflow = workflowService['getWorkflowForTransition']('ideas_planning', 'creation');

        expect(workflow.currentStage).toBe('ideas_planning');
        expect(workflow.nextStage).toBe('creation');
        expect(workflow.requiredTasks).toContain('Projekt-Briefing erstellen');
        expect(workflow.requiredTasks).toContain('Strategie-Dokument verfassen');
        expect(workflow.validationChecks).toHaveLength(1);
        expect(workflow.validationChecks[0].check).toBe('strategy_document_exists');
      });

      it('sollte Default-Workflow für unbekannte Transitions zurückgeben', () => {
        const workflow = workflowService['getWorkflowForTransition']('creation', 'distribution');

        expect(workflow.currentStage).toBe('creation');
        expect(workflow.nextStage).toBe('distribution');
        expect(workflow.requiredTasks).toHaveLength(0);
        expect(workflow.validationChecks).toHaveLength(0);
        expect(workflow.onTransition).toHaveLength(0);
      });
    });

    describe('validateTransitionRequirements', () => {
      const mockWorkflow: StageTransitionWorkflow = {
        currentStage: 'creation',
        nextStage: 'internal_approval',
        requiredTasks: ['Content-Outline erstellen', 'Texte verfassen'],
        validationChecks: [{
          check: 'strategy_document_exists',
          rule: 'project.linkedElements.strategyDocument !== null',
          message: 'Strategie-Dokument muss erstellt werden'
        }],
        onTransition: []
      };

      beforeEach(() => {
        mockTaskService.getByProjectId.mockResolvedValue([
          { title: 'Content-Outline erstellen', status: 'completed' },
          { title: 'Texte verfassen', status: 'pending' },
          { title: 'Strategie erstellen', status: 'completed' }
        ]);
      });

      it('sollte Fehler für fehlende erforderliche Tasks werfen', async () => {
        await expect(workflowService['validateTransitionRequirements'](testProjectId, mockWorkflow))
          .rejects.toThrow('Erforderliche Task nicht abgeschlossen: Texte verfassen');
      });

      it('sollte erfolgreich validieren wenn alle Tasks abgeschlossen sind', async () => {
        mockTaskService.getByProjectId.mockResolvedValue([
          { title: 'Content-Outline erstellen', status: 'completed' },
          { title: 'Texte verfassen', status: 'completed' },
          { title: 'Strategie erstellen', status: 'completed' }
        ]);

        await expect(workflowService['validateTransitionRequirements'](testProjectId, mockWorkflow))
          .resolves.toBeUndefined();
      });
    });

    describe('executeTransitionActions', () => {
      const mockActions: TransitionAction[] = [
        {
          action: 'auto_complete_tasks',
          data: { filter: { autoCompleteOnStageChange: true } }
        },
        {
          action: 'create_stage_tasks',
          data: { templates: ['content_outline', 'text_creation'] }
        }
      ];

      beforeEach(() => {
        jest.spyOn(workflowService as any, 'autoCompleteTasks').mockResolvedValue(undefined);
        jest.spyOn(workflowService as any, 'createStageTasks').mockResolvedValue(undefined);
      });

      it('sollte alle Transition-Actions ausführen', async () => {
        await workflowService['executeTransitionActions'](testProjectId, {
          currentStage: 'creation',
          nextStage: 'internal_approval',
          requiredTasks: [],
          validationChecks: [],
          onTransition: mockActions
        });

        expect(workflowService['autoCompleteTasks']).toHaveBeenCalledWith(
          testProjectId,
          { autoCompleteOnStageChange: true }
        );
        expect(workflowService['createStageTasks']).toHaveBeenCalledWith(
          testProjectId,
          ['content_outline', 'text_creation']
        );
      });

      it('sollte unbekannte Actions warnen aber nicht fehlschlagen', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const unknownAction: TransitionAction = {
          action: 'unknown_action',
          data: {}
        };

        await workflowService['executeTransitionActions'](testProjectId, {
          currentStage: 'creation',
          nextStage: 'internal_approval',
          requiredTasks: [],
          validationChecks: [],
          onTransition: [unknownAction]
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith('Unbekannte Transition-Action: unknown_action');
        consoleWarnSpy.mockRestore();
      });
    });
  });

  describe('Task-Template-Management', () => {
    describe('getTaskTemplatesForCategories', () => {
      it('sollte Templates für content_outline zurückgeben', () => {
        const templates = workflowService['getTaskTemplatesForCategories'](['content_outline']);

        expect(templates).toHaveLength(1);
        expect(templates[0].title).toBe('Content-Outline erstellen');
        expect(templates[0].category).toBe('content_creation');
        expect(templates[0].requiredForStageCompletion).toBe(true);
        expect(templates[0].daysAfterStageEntry).toBe(2);
      });

      it('sollte Templates für text_creation zurückgeben', () => {
        const templates = workflowService['getTaskTemplatesForCategories'](['text_creation']);

        expect(templates).toHaveLength(1);
        expect(templates[0].title).toBe('Texte verfassen');
        expect(templates[0].priority).toBe('high');
        expect(templates[0].daysAfterStageEntry).toBe(5);
      });

      it('sollte mehrere Templates für mehrere Kategorien zurückgeben', () => {
        const templates = workflowService['getTaskTemplatesForCategories']([
          'content_outline',
          'text_creation'
        ]);

        expect(templates).toHaveLength(2);
        expect(templates.map(t => t.title)).toEqual([
          'Content-Outline erstellen',
          'Texte verfassen'
        ]);
      });

      it('sollte leere Liste für unbekannte Kategorien zurückgeben', () => {
        const templates = workflowService['getTaskTemplatesForCategories'](['unknown_category']);

        expect(templates).toHaveLength(0);
      });
    });

    describe('createStageTasks', () => {
      beforeEach(() => {
        mockTaskService.create.mockResolvedValue('created-task-id');
      });

      it('sollte Tasks aus Templates erstellen', async () => {
        await workflowService['createStageTasks'](testProjectId, ['content_outline']);

        expect(mockTaskService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Content-Outline erstellen',
            priority: 'high',
            linkedProjectId: testProjectId,
            requiredForStageCompletion: true,
            templateCategory: 'content_creation',
            stageContext: expect.objectContaining({
              createdOnStageEntry: true,
              inheritedFromTemplate: 'content_outline_template',
              stageProgressWeight: 3,
              criticalPath: true
            })
          })
        );
      });

      it('sollte keine Tasks für leere Template-Liste erstellen', async () => {
        await workflowService['createStageTasks'](testProjectId, []);

        expect(mockTaskService.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Real-time Pipeline Listener', () => {
    const mockTask: PipelineAwareTask = {
      id: 'listener-task',
      userId: 'user-123',
      organizationId: testOrganizationId,
      title: 'Listener Task',
      status: 'completed',
      priority: 'high',
      linkedProjectId: testProjectId,
      pipelineStage: 'creation',
      requiredForStageCompletion: true
    };

    beforeEach(() => {
      mockTaskService.checkStageCompletionRequirements.mockResolvedValue({
        readyForTransition: true
      });
      mockProjectService.getById.mockResolvedValue({
        workflowConfig: { autoStageTransition: true }
      });
      jest.spyOn(workflowService, 'processStageTransition').mockResolvedValue(undefined);
    });

    it('sollte Pipeline-Task-Listener korrekt einrichten', () => {
      const mockSnapshot = {
        docChanges: () => [
          {
            type: 'modified',
            doc: {
              id: mockTask.id,
              data: () => mockTask
            }
          }
        ]
      };

      let snapshotCallback: any;
      mockFirestore.onSnapshot.mockImplementation((query, callback) => {
        snapshotCallback = callback;
        return jest.fn(); // unsubscribe function
      });

      const unsubscribe = workflowService.setupPipelineTaskListener(testProjectId);

      expect(mockFirestore.onSnapshot).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('sollte kritische Task-Completion korrekt handhaben', async () => {
      await workflowService['handleCriticalTaskCompletion'](mockTask);

      expect(mockTaskService.checkStageCompletionRequirements).toHaveBeenCalledWith(
        testProjectId,
        'creation'
      );
      expect(workflowService.processStageTransition).toHaveBeenCalledWith(
        testProjectId,
        'creation',
        'internal_approval'
      );
    });

    it('sollte nicht automatisch transitionieren ohne autoStageTransition', async () => {
      mockProjectService.getById.mockResolvedValue({
        workflowConfig: { autoStageTransition: false }
      });

      await workflowService['handleCriticalTaskCompletion'](mockTask);

      expect(workflowService.processStageTransition).not.toHaveBeenCalled();
    });
  });

  describe('Utility-Methoden', () => {
    describe('getNextStage', () => {
      it('sollte korrekte nächste Stage für alle Stages zurückgeben', () => {
        const stageSequence: Array<[PipelineStage, PipelineStage | null]> = [
          ['ideas_planning', 'creation'],
          ['creation', 'internal_approval'],
          ['internal_approval', 'customer_approval'],
          ['customer_approval', 'distribution'],
          ['distribution', 'monitoring'],
          ['monitoring', 'completed'],
          ['completed', null]
        ];

        stageSequence.forEach(([currentStage, expectedNext]) => {
          const nextStage = workflowService['getNextStage'](currentStage);
          expect(nextStage).toBe(expectedNext);
        });
      });
    });

    describe('checkAllDependencies', () => {
      const task: PipelineAwareTask = {
        id: 'test-task',
        dependsOnTaskIds: ['dep-1', 'dep-2'],
        userId: 'user-123',
        organizationId: testOrganizationId,
        title: 'Test Task',
        status: 'blocked',
        priority: 'medium'
      };

      const allTasks: PipelineAwareTask[] = [
        { id: 'dep-1', status: 'completed' } as PipelineAwareTask,
        { id: 'dep-2', status: 'completed' } as PipelineAwareTask,
        { id: 'dep-3', status: 'pending' } as PipelineAwareTask
      ];

      it('sollte true für erfüllte Abhängigkeiten zurückgeben', async () => {
        const result = await workflowService['checkAllDependencies'](task, allTasks);
        expect(result).toBe(true);
      });

      it('sollte false für unerfüllte Abhängigkeiten zurückgeben', async () => {
        const taskWithPendingDep = {
          ...task,
          dependsOnTaskIds: ['dep-1', 'dep-3']
        };

        const result = await workflowService['checkAllDependencies'](taskWithPendingDep, allTasks);
        expect(result).toBe(false);
      });

      it('sollte true für Task ohne Abhängigkeiten zurückgeben', async () => {
        const independentTask = { ...task, dependsOnTaskIds: undefined };
        const result = await workflowService['checkAllDependencies'](independentTask, allTasks);
        expect(result).toBe(true);
      });

      it('sollte true für Task mit leeren Abhängigkeiten zurückgeben', async () => {
        const taskWithEmptyDeps = { ...task, dependsOnTaskIds: [] };
        const result = await workflowService['checkAllDependencies'](taskWithEmptyDeps, allTasks);
        expect(result).toBe(true);
      });
    });
  });

  describe('Error Handling und Edge Cases', () => {
    it('sollte Fehler beim Project-Update handhaben', async () => {
      mockProjectService.update.mockRejectedValue(new Error('Update failed'));
      jest.spyOn(workflowService as any, 'validateTransitionRequirements').mockResolvedValue(undefined);
      jest.spyOn(workflowService as any, 'executeTransitionActions').mockResolvedValue(undefined);
      jest.spyOn(workflowService as any, 'handleTransitionError').mockResolvedValue(undefined);

      await workflowService.processStageTransition(testProjectId, 'creation', 'internal_approval');

      expect(workflowService['handleTransitionError']).toHaveBeenCalled();
    });

    it('sollte Task-Dependency-Updates bei Service-Fehlern handhaben', async () => {
      mockTaskService.getById.mockRejectedValue(new Error('Task service error'));

      await expect(workflowService.updateTaskDependencies('failing-task'))
        .rejects.toThrow('Task service error');
    });

    it('sollte Progress-Calculation bei leeren Daten handhaben', async () => {
      mockProjectService.getById.mockResolvedValue({ organizationId: testOrganizationId });
      mockTaskService.getByProjectId.mockResolvedValue([]);

      const result = await workflowService.calculateProjectProgress(testProjectId);

      expect(result.overallPercent).toBe(0);
      expect(result.taskCompletion).toBe(0);
    });

    it('sollte Memory-Leaks bei großen Task-Sets vermeiden', async () => {
      const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
        id: `task-${i}`,
        pipelineStage: 'creation',
        status: i % 2 === 0 ? 'completed' : 'pending'
      })) as PipelineAwareTask[];

      mockProjectService.getById.mockResolvedValue({ organizationId: testOrganizationId });
      mockTaskService.getByProjectId.mockResolvedValue(largeTasks);

      const result = await workflowService.calculateProjectProgress(testProjectId);

      expect(result.stageProgress.creation).toBe(50);
      expect(result.taskCompletion).toBe(50);
    });
  });

  describe('Service Instance Export', () => {
    it('sollte exportierte Service-Instance verwenden können', async () => {
      mockProjectService.getById.mockResolvedValue({ organizationId: testOrganizationId });
      mockTaskService.getByProjectId.mockResolvedValue([]);

      const result = await pipelineWorkflowService.calculateProjectProgress(testProjectId);

      expect(result).toBeDefined();
      expect(result.overallPercent).toBeDefined();
    });
  });
});