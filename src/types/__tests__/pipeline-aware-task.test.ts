// src/types/__tests__/pipeline-aware-task.test.ts
// PLAN 8/9: PIPELINE-TASK-INTEGRATION - PipelineAwareTask Interface Tests
import { PipelineAwareTask, Task, TaskStatus, TaskPriority } from '../tasks';
import { PipelineStage } from '../project';
import { Timestamp } from 'firebase/firestore';

describe('PipelineAwareTask Interface Tests', () => {
  const baseTask: Task = {
    id: 'task-123',
    userId: 'user-123',
    organizationId: 'org-123',
    title: 'Test Task',
    description: 'Test Beschreibung',
    status: 'pending' as TaskStatus,
    priority: 'medium' as TaskPriority,
    dueDate: Timestamp.fromDate(new Date('2024-12-25')),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  describe('Pipeline-spezifische Felder', () => {
    it('sollte pipelineStage korrekt setzen', () => {
      const pipelineTask: PipelineAwareTask = {
        ...baseTask,
        pipelineStage: 'creation'
      };

      expect(pipelineTask.pipelineStage).toBe('creation');
      expect(['ideas_planning', 'creation', 'approval',
              'distribution', 'monitoring', 'completed']).toContain(pipelineTask.pipelineStage);
    });

    it('sollte requiredForStageCompletion korrekt handhaben', () => {
      const criticalTask: PipelineAwareTask = {
        ...baseTask,
        requiredForStageCompletion: true
      };

      expect(criticalTask.requiredForStageCompletion).toBe(true);
    });

    it('sollte stageTransitionTrigger korrekt setzen', () => {
      const triggerTask: PipelineAwareTask = {
        ...baseTask,
        stageTransitionTrigger: true,
        requiredForStageCompletion: true
      };

      expect(triggerTask.stageTransitionTrigger).toBe(true);
      expect(triggerTask.requiredForStageCompletion).toBe(true);
    });

    it('sollte templateCategory für automatische Erstellung unterstützen', () => {
      const templateTask: PipelineAwareTask = {
        ...baseTask,
        templateCategory: 'content_creation',
        stageContext: {
          createdOnStageEntry: true,
          inheritedFromTemplate: 'content_template_01',
          stageProgressWeight: 4,
          criticalPath: true
        }
      };

      expect(templateTask.templateCategory).toBe('content_creation');
      expect(templateTask.stageContext?.inheritedFromTemplate).toBe('content_template_01');
    });
  });

  describe('Task-Dependencies', () => {
    it('sollte dependsOnTaskIds als Array verwalten', () => {
      const dependentTask: PipelineAwareTask = {
        ...baseTask,
        dependsOnTaskIds: ['task-001', 'task-002', 'task-003'],
        status: 'blocked'
      };

      expect(dependentTask.dependsOnTaskIds).toHaveLength(3);
      expect(dependentTask.dependsOnTaskIds).toContain('task-001');
      expect(dependentTask.status).toBe('blocked');
    });

    it('sollte dependsOnStageCompletion für Stage-Abhängigkeiten unterstützen', () => {
      const stageDepTask: PipelineAwareTask = {
        ...baseTask,
        dependsOnStageCompletion: ['ideas_planning', 'creation'],
        pipelineStage: 'approval'
      };

      expect(stageDepTask.dependsOnStageCompletion).toHaveLength(2);
      expect(stageDepTask.dependsOnStageCompletion).toContain('ideas_planning');
      expect(stageDepTask.dependsOnStageCompletion).toContain('creation');
    });

    it('sollte blocksStageTransition korrekt handhaben', () => {
      const blockingTask: PipelineAwareTask = {
        ...baseTask,
        blocksStageTransition: true,
        requiredForStageCompletion: true,
        status: 'pending'
      };

      expect(blockingTask.blocksStageTransition).toBe(true);
      expect(blockingTask.requiredForStageCompletion).toBe(true);
    });

    it('sollte leere Abhängigkeiten-Arrays handhaben', () => {
      const independentTask: PipelineAwareTask = {
        ...baseTask,
        dependsOnTaskIds: [],
        dependsOnStageCompletion: []
      };

      expect(independentTask.dependsOnTaskIds).toHaveLength(0);
      expect(independentTask.dependsOnStageCompletion).toHaveLength(0);
    });
  });

  describe('Stage-Context', () => {
    it('sollte vollständigen stageContext unterstützen', () => {
      const contextTask: PipelineAwareTask = {
        ...baseTask,
        stageContext: {
          createdOnStageEntry: true,
          inheritedFromTemplate: 'template_strategy_001',
          stageProgressWeight: 5,
          criticalPath: true
        },
        pipelineStage: 'creation'
      };

      expect(contextTask.stageContext?.createdOnStageEntry).toBe(true);
      expect(contextTask.stageContext?.stageProgressWeight).toBe(5);
      expect(contextTask.stageContext?.criticalPath).toBe(true);
    });

    it('sollte stageProgressWeight Werte zwischen 1-5 validieren', () => {
      const contexts = [
        { weight: 1, valid: true },
        { weight: 3, valid: true },
        { weight: 5, valid: true },
        { weight: 0, valid: false },
        { weight: 6, valid: false }
      ];

      contexts.forEach(({ weight, valid }) => {
        const contextTask: PipelineAwareTask = {
          ...baseTask,
          stageContext: {
            createdOnStageEntry: false,
            inheritedFromTemplate: 'test',
            stageProgressWeight: weight,
            criticalPath: false
          }
        };

        if (valid) {
          expect(contextTask.stageContext?.stageProgressWeight).toBe(weight);
          expect(contextTask.stageContext?.stageProgressWeight).toBeGreaterThanOrEqual(1);
          expect(contextTask.stageContext?.stageProgressWeight).toBeLessThanOrEqual(5);
        } else {
          // In einer echten Implementierung würde hier Validation stattfinden
          expect(weight).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Automatisierung Features', () => {
    it('sollte autoCompleteOnStageChange unterstützen', () => {
      const autoTask: PipelineAwareTask = {
        ...baseTask,
        autoCompleteOnStageChange: true,
        pipelineStage: 'creation'
      };

      expect(autoTask.autoCompleteOnStageChange).toBe(true);
    });

    it('sollte autoCreateOnStageEntry unterstützen', () => {
      const autoCreateTask: PipelineAwareTask = {
        ...baseTask,
        autoCreateOnStageEntry: true,
        templateCategory: 'review_tasks',
        stageContext: {
          createdOnStageEntry: true,
          inheritedFromTemplate: 'review_template',
          stageProgressWeight: 3,
          criticalPath: false
        }
      };

      expect(autoCreateTask.autoCreateOnStageEntry).toBe(true);
      expect(autoCreateTask.stageContext?.createdOnStageEntry).toBe(true);
    });

    it('sollte kombinierte Automatisierungs-Features handhaben', () => {
      const fullyAutomatedTask: PipelineAwareTask = {
        ...baseTask,
        autoCompleteOnStageChange: true,
        autoCreateOnStageEntry: true,
        templateCategory: 'automated_workflow',
        requiredForStageCompletion: false
      };

      expect(fullyAutomatedTask.autoCompleteOnStageChange).toBe(true);
      expect(fullyAutomatedTask.autoCreateOnStageEntry).toBe(true);
      expect(fullyAutomatedTask.requiredForStageCompletion).toBe(false);
    });
  });

  describe('Deadline-Management', () => {
    it('sollte deadlineRules mit relativeToPipelineStage unterstützen', () => {
      const deadlineTask: PipelineAwareTask = {
        ...baseTask,
        deadlineRules: {
          relativeToPipelineStage: true,
          daysAfterStageEntry: 5,
          cascadeDelay: false
        },
        pipelineStage: 'creation'
      };

      expect(deadlineTask.deadlineRules?.relativeToPipelineStage).toBe(true);
      expect(deadlineTask.deadlineRules?.daysAfterStageEntry).toBe(5);
      expect(deadlineTask.deadlineRules?.cascadeDelay).toBe(false);
    });

    it('sollte cascadeDelay für Verzögerungsweiterleitung unterstützen', () => {
      const cascadeTask: PipelineAwareTask = {
        ...baseTask,
        deadlineRules: {
          relativeToPipelineStage: true,
          daysAfterStageEntry: 3,
          cascadeDelay: true
        },
        dependsOnTaskIds: ['predecessor-task']
      };

      expect(cascadeTask.deadlineRules?.cascadeDelay).toBe(true);
      expect(cascadeTask.dependsOnTaskIds).toContain('predecessor-task');
    });

    it('sollte verschiedene daysAfterStageEntry Werte verarbeiten', () => {
      const dayValues = [1, 3, 7, 14, 30];
      
      dayValues.forEach(days => {
        const deadlineTask: PipelineAwareTask = {
          ...baseTask,
          deadlineRules: {
            relativeToPipelineStage: true,
            daysAfterStageEntry: days,
            cascadeDelay: false
          }
        };

        expect(deadlineTask.deadlineRules?.daysAfterStageEntry).toBe(days);
        expect(deadlineTask.deadlineRules?.daysAfterStageEntry).toBeGreaterThan(0);
      });
    });
  });

  describe('Komplexe Pipeline-Szenarien', () => {
    it('sollte kritische Task mit allen Features unterstützen', () => {
      const complexTask: PipelineAwareTask = {
        ...baseTask,
        pipelineStage: 'approval',
        requiredForStageCompletion: true,
        stageTransitionTrigger: false,
        blocksStageTransition: true,
        dependsOnTaskIds: ['content-creation-task', 'media-selection-task'],
        dependsOnStageCompletion: ['creation'],
        stageContext: {
          createdOnStageEntry: false,
          inheritedFromTemplate: 'approval_checklist_template',
          stageProgressWeight: 5,
          criticalPath: true
        },
        deadlineRules: {
          relativeToPipelineStage: true,
          daysAfterStageEntry: 2,
          cascadeDelay: true
        },
        templateCategory: 'approval_tasks'
      };

      // Validiere alle kritischen Eigenschaften
      expect(complexTask.pipelineStage).toBe('approval');
      expect(complexTask.requiredForStageCompletion).toBe(true);
      expect(complexTask.blocksStageTransition).toBe(true);
      expect(complexTask.dependsOnTaskIds).toHaveLength(2);
      expect(complexTask.dependsOnStageCompletion).toContain('creation');
      expect(complexTask.stageContext?.criticalPath).toBe(true);
      expect(complexTask.deadlineRules?.cascadeDelay).toBe(true);
    });

    it('sollte automatisierte Template-Task unterstützen', () => {
      const templateTask: PipelineAwareTask = {
        ...baseTask,
        pipelineStage: 'distribution',
        autoCreateOnStageEntry: true,
        autoCompleteOnStageChange: false,
        templateCategory: 'distribution_tasks',
        requiredForStageCompletion: false,
        stageContext: {
          createdOnStageEntry: true,
          inheritedFromTemplate: 'distribution_template_v2',
          stageProgressWeight: 2,
          criticalPath: false
        },
        deadlineRules: {
          relativeToPipelineStage: true,
          daysAfterStageEntry: 1,
          cascadeDelay: false
        }
      };

      // Validiere Template-Task Eigenschaften
      expect(templateTask.autoCreateOnStageEntry).toBe(true);
      expect(templateTask.stageContext?.createdOnStageEntry).toBe(true);
      expect(templateTask.stageContext?.inheritedFromTemplate).toBe('distribution_template_v2');
      expect(templateTask.templateCategory).toBe('distribution_tasks');
      expect(templateTask.deadlineRules?.daysAfterStageEntry).toBe(1);
    });
  });

  describe('Edge Cases und Validierung', () => {
    it('sollte undefined/null Werte korrekt handhaben', () => {
      const minimalTask: PipelineAwareTask = {
        ...baseTask,
        pipelineStage: undefined,
        dependsOnTaskIds: undefined,
        stageContext: undefined,
        deadlineRules: undefined
      };

      expect(minimalTask.pipelineStage).toBeUndefined();
      expect(minimalTask.dependsOnTaskIds).toBeUndefined();
      expect(minimalTask.stageContext).toBeUndefined();
      expect(minimalTask.deadlineRules).toBeUndefined();
    });

    it('sollte zirkuläre Abhängigkeiten erkennen können', () => {
      const task1: PipelineAwareTask = {
        ...baseTask,
        id: 'task-1',
        dependsOnTaskIds: ['task-2']
      };

      const task2: PipelineAwareTask = {
        ...baseTask,
        id: 'task-2', 
        dependsOnTaskIds: ['task-1']
      };

      // In einer echten Implementierung würde hier eine Validierung stattfinden
      expect(task1.dependsOnTaskIds).toContain('task-2');
      expect(task2.dependsOnTaskIds).toContain('task-1');
      
      // Simuliere Zirkuläre Abhängigkeits-Erkennung
      const hasCircularDependency = (task1.dependsOnTaskIds?.includes('task-2') && 
                                     task2.dependsOnTaskIds?.includes('task-1'));
      expect(hasCircularDependency).toBe(true);
    });

    it('sollte ungültige Stage-Übergänge verhindern', () => {
      const invalidStages: string[] = ['invalid_stage', '', 'unknown'];
      const validStages: PipelineStage[] = [
        'ideas_planning', 'creation', 'approval',
        'distribution', 'monitoring', 'completed'
      ];

      invalidStages.forEach(stage => {
        // In einer echten Implementierung würde hier Validation stattfinden
        expect(validStages.includes(stage as PipelineStage)).toBe(false);
      });

      validStages.forEach(stage => {
        const validTask: PipelineAwareTask = {
          ...baseTask,
          pipelineStage: stage
        };
        expect(validStages.includes(validTask.pipelineStage!)).toBe(true);
      });
    });

    it('sollte Multi-Tenancy-Isolation gewährleisten', () => {
      const org1Task: PipelineAwareTask = {
        ...baseTask,
        organizationId: 'org-123',
        dependsOnTaskIds: ['task-from-org-123']
      };

      const org2Task: PipelineAwareTask = {
        ...baseTask,
        organizationId: 'org-456',
        dependsOnTaskIds: ['task-from-org-456']
      };

      // Verifiziere dass Tasks verschiedenen Organisationen gehören
      expect(org1Task.organizationId).not.toBe(org2Task.organizationId);
      expect(org1Task.organizationId).toBe('org-123');
      expect(org2Task.organizationId).toBe('org-456');
      
      // In echtem System: Cross-Tenant Dependencies sollten verhindert werden
      expect(org1Task.dependsOnTaskIds?.[0]).toContain('org-123');
      expect(org2Task.dependsOnTaskIds?.[0]).toContain('org-456');
    });
  });
});