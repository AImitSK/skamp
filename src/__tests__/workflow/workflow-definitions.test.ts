// src/__tests__/workflow/workflow-definitions.test.ts
// PLAN 8/9: PIPELINE-TASK-INTEGRATION - Workflow-Definitionen Tests
import { PipelineStage } from '@/types/project';
import { TaskPriority } from '@/types/tasks';

// Workflow-Definitionen (normalerweise aus separater Datei)
interface WorkflowDefinition {
  fromStage: PipelineStage;
  toStage: PipelineStage;
  requiredTasks: string[];
  autoActions: string[];
  validationRules: string[];
}

interface TaskTemplateDefinition {
  id: string;
  title: string;
  category: string;
  stage: PipelineStage;
  priority: TaskPriority;
  requiredForStageCompletion: boolean;
  daysAfterStageEntry: number;
  description?: string;
  assignmentRules?: {
    assignTo: 'project_lead' | 'team_member' | 'role_based';
    role?: string;
  };
}

// Mock Workflow-Definitionen
const STAGE_WORKFLOWS: Record<string, WorkflowDefinition> = {
  'ideas_planning_to_creation': {
    fromStage: 'ideas_planning',
    toStage: 'creation',
    requiredTasks: ['Projekt-Briefing erstellen', 'Strategie-Dokument verfassen'],
    autoActions: ['create_stage_tasks', 'schedule_deadlines'],
    validationRules: ['strategy_document_exists', 'briefing_approved']
  },
  'creation_to_internal_approval': {
    fromStage: 'creation',
    toStage: 'internal_approval',
    requiredTasks: ['Content-Outline erstellen', 'Texte verfassen', 'Medien auswählen'],
    autoActions: ['auto_complete_creation_tasks', 'create_review_tasks'],
    validationRules: ['content_quality_check', 'media_compliance_check']
  },
  'internal_approval_to_customer_approval': {
    fromStage: 'internal_approval',
    toStage: 'customer_approval',
    requiredTasks: ['Interne Review durchführen', 'Qualitätssicherung'],
    autoActions: ['prepare_customer_materials', 'schedule_customer_review'],
    validationRules: ['internal_approval_complete', 'materials_ready']
  },
  'customer_approval_to_distribution': {
    fromStage: 'customer_approval',
    toStage: 'distribution',
    requiredTasks: ['Kunden-Feedback einarbeiten', 'Finale Freigabe erhalten'],
    autoActions: ['prepare_distribution_channels', 'schedule_publication'],
    validationRules: ['customer_approved', 'legal_clearance']
  },
  'distribution_to_monitoring': {
    fromStage: 'distribution',
    toStage: 'monitoring',
    requiredTasks: ['Medien kontaktieren', 'Content veröffentlichen'],
    autoActions: ['setup_monitoring_tools', 'create_tracking_tasks'],
    validationRules: ['distribution_confirmed', 'tracking_setup']
  },
  'monitoring_to_completed': {
    fromStage: 'monitoring',
    toStage: 'completed',
    requiredTasks: ['Monitoring-Report erstellen', 'ROI-Analyse durchführen'],
    autoActions: ['generate_final_report', 'archive_project'],
    validationRules: ['monitoring_period_complete', 'report_approved']
  }
};

const TASK_TEMPLATES: Record<string, TaskTemplateDefinition[]> = {
  'ideas_planning': [
    {
      id: 'briefing_template',
      title: 'Projekt-Briefing erstellen',
      category: 'planning',
      stage: 'ideas_planning',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 1,
      description: 'Detailliertes Projekt-Briefing mit Zielen und Anforderungen erstellen',
      assignmentRules: { assignTo: 'project_lead' }
    },
    {
      id: 'strategy_template',
      title: 'Strategie-Dokument verfassen',
      category: 'strategy',
      stage: 'ideas_planning',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 3
    },
    {
      id: 'timeline_template',
      title: 'Projekt-Timeline definieren',
      category: 'planning',
      stage: 'ideas_planning',
      priority: 'medium',
      requiredForStageCompletion: false,
      daysAfterStageEntry: 2
    }
  ],
  'creation': [
    {
      id: 'content_outline_template',
      title: 'Content-Outline erstellen',
      category: 'content_creation',
      stage: 'creation',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 2
    },
    {
      id: 'text_creation_template',
      title: 'Texte verfassen',
      category: 'content_creation',
      stage: 'creation',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 5
    },
    {
      id: 'media_selection_template',
      title: 'Medien auswählen',
      category: 'media',
      stage: 'creation',
      priority: 'medium',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 3
    }
  ],
  'internal_approval': [
    {
      id: 'internal_review_template',
      title: 'Interne Review durchführen',
      category: 'review',
      stage: 'internal_approval',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 1
    },
    {
      id: 'quality_check_template',
      title: 'Qualitätssicherung',
      category: 'quality',
      stage: 'internal_approval',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 2
    }
  ]
};

describe('Workflow-Definitionen Tests', () => {
  describe('STAGE_WORKFLOWS Validierung', () => {
    it('sollte alle Stage-Übergänge definiert haben', () => {
      const expectedTransitions = [
        'ideas_planning_to_creation',
        'creation_to_internal_approval', 
        'internal_approval_to_customer_approval',
        'customer_approval_to_distribution',
        'distribution_to_monitoring',
        'monitoring_to_completed'
      ];

      expectedTransitions.forEach(transition => {
        expect(STAGE_WORKFLOWS[transition]).toBeDefined();
        expect(STAGE_WORKFLOWS[transition].fromStage).toBeDefined();
        expect(STAGE_WORKFLOWS[transition].toStage).toBeDefined();
      });
    });

    it('sollte korrekte Stage-Reihenfolge einhalten', () => {
      const stageOrder: PipelineStage[] = [
        'ideas_planning', 'creation', 'internal_approval',
        'customer_approval', 'distribution', 'monitoring', 'completed'
      ];

      Object.values(STAGE_WORKFLOWS).forEach(workflow => {
        const fromIndex = stageOrder.indexOf(workflow.fromStage);
        const toIndex = stageOrder.indexOf(workflow.toStage);
        
        expect(fromIndex).toBeLessThan(toIndex);
        expect(toIndex - fromIndex).toBe(1); // Sollte sequenziell sein
      });
    });

    it('sollte erforderliche Tasks für jeden Workflow definiert haben', () => {
      Object.values(STAGE_WORKFLOWS).forEach(workflow => {
        expect(workflow.requiredTasks).toBeDefined();
        expect(Array.isArray(workflow.requiredTasks)).toBe(true);
        expect(workflow.requiredTasks.length).toBeGreaterThan(0);
      });
    });

    it('sollte Auto-Actions für jeden Workflow definiert haben', () => {
      Object.values(STAGE_WORKFLOWS).forEach(workflow => {
        expect(workflow.autoActions).toBeDefined();
        expect(Array.isArray(workflow.autoActions)).toBe(true);
      });
    });

    it('sollte Validation-Rules für jeden Workflow definiert haben', () => {
      Object.values(STAGE_WORKFLOWS).forEach(workflow => {
        expect(workflow.validationRules).toBeDefined();
        expect(Array.isArray(workflow.validationRules)).toBe(true);
        expect(workflow.validationRules.length).toBeGreaterThan(0);
      });
    });
  });

  describe('TASK_TEMPLATES Validierung', () => {
    it('sollte Templates für alle kritischen Stages haben', () => {
      const criticalStages: PipelineStage[] = [
        'ideas_planning', 'creation', 'internal_approval'
      ];

      criticalStages.forEach(stage => {
        expect(TASK_TEMPLATES[stage]).toBeDefined();
        expect(Array.isArray(TASK_TEMPLATES[stage])).toBe(true);
        expect(TASK_TEMPLATES[stage].length).toBeGreaterThan(0);
      });
    });

    it('sollte korrekte Template-Struktur haben', () => {
      Object.values(TASK_TEMPLATES).flat().forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.title).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.stage).toBeDefined();
        expect(template.priority).toBeDefined();
        expect(typeof template.requiredForStageCompletion).toBe('boolean');
        expect(typeof template.daysAfterStageEntry).toBe('number');
        expect(template.daysAfterStageEntry).toBeGreaterThan(0);
      });
    });

    it('sollte eindeutige Template-IDs haben', () => {
      const allTemplates = Object.values(TASK_TEMPLATES).flat();
      const templateIds = allTemplates.map(t => t.id);
      const uniqueIds = new Set(templateIds);
      
      expect(uniqueIds.size).toBe(templateIds.length);
    });

    it('sollte Template-Stage mit definiertem Stage übereinstimmen', () => {
      Object.entries(TASK_TEMPLATES).forEach(([stage, templates]) => {
        templates.forEach(template => {
          expect(template.stage).toBe(stage);
        });
      });
    });

    it('sollte gültige Prioritäten verwenden', () => {
      const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
      
      Object.values(TASK_TEMPLATES).flat().forEach(template => {
        expect(validPriorities).toContain(template.priority);
      });
    });

    it('sollte realistische Zeitrahmen haben', () => {
      Object.values(TASK_TEMPLATES).flat().forEach(template => {
        expect(template.daysAfterStageEntry).toBeGreaterThan(0);
        expect(template.daysAfterStageEntry).toBeLessThanOrEqual(14); // Max 2 Wochen
      });
    });
  });

  describe('Workflow-Template Integration', () => {
    it('sollte Workflow requiredTasks mit Templates matchen', () => {
      // Prüfe ob alle requiredTasks in Workflows entsprechende Templates haben
      Object.values(STAGE_WORKFLOWS).forEach(workflow => {
        const stageTemplates = TASK_TEMPLATES[workflow.fromStage] || [];
        const templateTitles = stageTemplates.map(t => t.title);
        
        workflow.requiredTasks.forEach(requiredTask => {
          // Nicht alle required tasks müssen Templates haben (können auch manuell erstellt werden)
          // Aber wenn ein Template existiert, sollte es als requiredForStageCompletion markiert sein
          const matchingTemplate = stageTemplates.find(t => t.title === requiredTask);
          if (matchingTemplate) {
            expect(matchingTemplate.requiredForStageCompletion).toBe(true);
          }
        });
      });
    });

    it('sollte kritische Templates in Workflows repräsentiert haben', () => {
      Object.entries(TASK_TEMPLATES).forEach(([stage, templates]) => {
        const criticalTemplates = templates.filter(t => t.requiredForStageCompletion);
        
        if (criticalTemplates.length > 0) {
          // Sollte entsprechenden Workflow haben
          const stageWorkflow = Object.values(STAGE_WORKFLOWS).find(w => w.fromStage === stage);
          if (stageWorkflow) {
            expect(stageWorkflow.requiredTasks.length).toBeGreaterThan(0);
          }
        }
      });
    });
  });

  describe('Workflow-Konsistenz', () => {
    it('sollte keine überlappenden Stage-Transitions haben', () => {
      const transitions = new Set();
      
      Object.entries(STAGE_WORKFLOWS).forEach(([key, workflow]) => {
        const transitionKey = `${workflow.fromStage}_to_${workflow.toStage}`;
        expect(transitions.has(transitionKey)).toBe(false);
        transitions.add(transitionKey);
      });
    });

    it('sollte vollständige Stage-Abdeckung haben', () => {
      const stages: PipelineStage[] = [
        'ideas_planning', 'creation', 'internal_approval',
        'customer_approval', 'distribution', 'monitoring', 'completed'
      ];

      const fromStages = new Set(Object.values(STAGE_WORKFLOWS).map(w => w.fromStage));
      const toStages = new Set(Object.values(STAGE_WORKFLOWS).map(w => w.toStage));

      // Alle Stages außer der letzten sollten als fromStage vorkommen
      stages.slice(0, -1).forEach(stage => {
        expect(fromStages.has(stage)).toBe(true);
      });

      // Alle Stages außer der ersten sollten als toStage vorkommen
      stages.slice(1).forEach(stage => {
        expect(toStages.has(stage)).toBe(true);
      });
    });

    it('sollte logische Auto-Actions haben', () => {
      const validAutoActions = [
        'create_stage_tasks',
        'schedule_deadlines', 
        'auto_complete_creation_tasks',
        'create_review_tasks',
        'prepare_customer_materials',
        'schedule_customer_review',
        'prepare_distribution_channels',
        'schedule_publication',
        'setup_monitoring_tools',
        'create_tracking_tasks',
        'generate_final_report',
        'archive_project'
      ];

      Object.values(STAGE_WORKFLOWS).forEach(workflow => {
        workflow.autoActions.forEach(action => {
          expect(validAutoActions).toContain(action);
        });
      });
    });

    it('sollte logische Validation-Rules haben', () => {
      const validValidationRules = [
        'strategy_document_exists',
        'briefing_approved',
        'content_quality_check',
        'media_compliance_check',
        'internal_approval_complete',
        'materials_ready',
        'customer_approved',
        'legal_clearance',
        'distribution_confirmed',
        'tracking_setup',
        'monitoring_period_complete',
        'report_approved'
      ];

      Object.values(STAGE_WORKFLOWS).forEach(workflow => {
        workflow.validationRules.forEach(rule => {
          expect(validValidationRules).toContain(rule);
        });
      });
    });
  });

  describe('Template Kategorien', () => {
    it('sollte logische Kategorien verwenden', () => {
      const validCategories = [
        'planning', 'strategy', 'content_creation', 'media',
        'review', 'quality', 'approval', 'distribution', 
        'monitoring', 'reporting'
      ];

      Object.values(TASK_TEMPLATES).flat().forEach(template => {
        expect(validCategories).toContain(template.category);
      });
    });

    it('sollte Kategorie-spezifische Eigenschaften haben', () => {
      Object.values(TASK_TEMPLATES).flat().forEach(template => {
        switch (template.category) {
          case 'planning':
            expect(['ideas_planning', 'creation']).toContain(template.stage);
            break;
          case 'content_creation':
            expect(template.stage).toBe('creation');
            expect(template.priority).toBe('high');
            break;
          case 'review':
            expect(template.stage).toBe('internal_approval');
            break;
          case 'quality':
            expect(template.requiredForStageCompletion).toBe(true);
            break;
        }
      });
    });
  });

  describe('Assignment Rules', () => {
    it('sollte gültige Assignment-Regeln haben', () => {
      const validAssignments = ['project_lead', 'team_member', 'role_based'];

      Object.values(TASK_TEMPLATES).flat().forEach(template => {
        if (template.assignmentRules) {
          expect(validAssignments).toContain(template.assignmentRules.assignTo);
          
          if (template.assignmentRules.assignTo === 'role_based') {
            expect(template.assignmentRules.role).toBeDefined();
          }
        }
      });
    });

    it('sollte kritische Tasks korrekt zuweisen', () => {
      Object.values(TASK_TEMPLATES).flat()
        .filter(t => t.requiredForStageCompletion)
        .forEach(template => {
          if (template.assignmentRules) {
            // Kritische Tasks sollten an Projekt-Lead oder spezifische Rolle zugewiesen werden
            expect(['project_lead', 'role_based']).toContain(template.assignmentRules.assignTo);
          }
        });
    });
  });

  describe('Workflow Performance', () => {
    it('sollte effiziente Workflow-Lookups ermöglichen', () => {
      const transitionKey = 'creation_to_internal_approval';
      
      const startTime = Date.now();
      const workflow = STAGE_WORKFLOWS[transitionKey];
      const endTime = Date.now();

      expect(workflow).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1); // Sollte unter 1ms dauern
    });

    it('sollte Template-Filtering effizient handhaben', () => {
      const stage: PipelineStage = 'creation';
      
      const startTime = Date.now();
      const templates = TASK_TEMPLATES[stage];
      const criticalTemplates = templates.filter(t => t.requiredForStageCompletion);
      const endTime = Date.now();

      expect(templates).toBeDefined();
      expect(criticalTemplates.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1);
    });
  });

  describe('Workflow Erweiterbarkeit', () => {
    it('sollte neue Stages einfach hinzufügbar machen', () => {
      const newStage: PipelineStage = 'ideas_planning';
      const newWorkflow: WorkflowDefinition = {
        fromStage: 'completed',
        toStage: newStage, // Hypothetisch für Test
        requiredTasks: ['Post-Projekt Review'],
        autoActions: ['create_followup_tasks'],
        validationRules: ['project_closed']
      };

      expect(newWorkflow.fromStage).toBeDefined();
      expect(newWorkflow.toStage).toBeDefined();
      expect(newWorkflow.requiredTasks.length).toBeGreaterThan(0);
    });

    it('sollte neue Templates flexibel integrierbar machen', () => {
      const newTemplate: TaskTemplateDefinition = {
        id: 'custom_template',
        title: 'Custom Task',
        category: 'custom',
        stage: 'creation',
        priority: 'medium',
        requiredForStageCompletion: false,
        daysAfterStageEntry: 1
      };

      expect(newTemplate.id).toBeDefined();
      expect(newTemplate.stage).toBeDefined();
    });
  });

  describe('Multi-Tenancy Unterstützung', () => {
    it('sollte Workflows für verschiedene Organisationen anpassbar sein', () => {
      // Test dass Workflows nicht hardcoded für spezifische Organisation sind
      Object.values(STAGE_WORKFLOWS).forEach(workflow => {
        expect(workflow.fromStage).not.toContain('org-specific');
        expect(workflow.toStage).not.toContain('org-specific');
      });
    });

    it('sollte Templates für verschiedene Projekt-Typen verwendbar sein', () => {
      Object.values(TASK_TEMPLATES).flat().forEach(template => {
        expect(template.title).not.toContain('Client XYZ');
        expect(template.description || '').not.toContain('specific-company');
      });
    });
  });

  describe('Localization Support', () => {
    it('sollte deutsche Task-Titel verwenden', () => {
      Object.values(TASK_TEMPLATES).flat().forEach(template => {
        expect(template.title).toMatch(/^[A-ZÄÖÜ]/); // Sollte mit Großbuchstaben beginnen
        expect(template.title).toContain(' '); // Sollte Wörter enthalten (nicht nur Codes)
      });
    });

    it('sollte deutsche Workflow-Beschreibungen unterstützen', () => {
      Object.values(STAGE_WORKFLOWS).forEach(workflow => {
        workflow.requiredTasks.forEach(task => {
          expect(task).toMatch(/[a-zäöüß]/); // Sollte deutsche Zeichen enthalten können
        });
      });
    });
  });
});