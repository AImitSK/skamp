// src/types/__tests__/project-wizard-types.test.ts
import { Timestamp } from 'firebase/firestore';
import {
  ProjectCreationWizardData,
  ProjectCreationResult,
  ProjectCreationOptions,
  ValidationResult,
  ResourceInitializationOptions,
  ResourceInitializationResult,
  ProjectTask,
  ProjectTemplate,
  TemplateApplicationResult,
  CreateTemplateData,
  Project,
  PipelineStage,
  ProjectPriority,
  TaskPriority
} from '@/types/project';

describe('Project Wizard Types - Interface Compliance Tests', () => {
  
  describe('ProjectCreationWizardData Interface', () => {
    it('sollte alle erforderlichen Basis-Felder haben', () => {
      const wizardData: ProjectCreationWizardData = {
        // Step 1: Basis-Informationen
        title: 'Test Projekt',
        description: 'Test Beschreibung',
        clientId: 'client123',
        priority: 'medium',
        color: '#3B82F6',
        tags: ['tag1', 'tag2'],
        
        // Step 2: Team & Verantwortung
        assignedTeamMembers: ['user1', 'user2'],
        projectManager: 'user1',
        
        // Step 3: Template & Setup
        templateId: 'template123',
        customTasks: [{
          title: 'Custom Task',
          description: 'Test',
          category: 'custom',
          stage: 'creation',
          priority: 'medium',
          status: 'pending',
          requiredForStageCompletion: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }],
        startDate: new Date(),
        
        // Step 4: Sofortige Aktionen
        createCampaignImmediately: true,
        campaignTitle: 'Test Kampagne',
        initialAssets: ['asset1', 'asset2'],
        distributionLists: ['list1'],
        
        // Wizard-Meta
        completedSteps: [1, 2, 3, 4],
        currentStep: 4
      };

      expect(wizardData.title).toBe('Test Projekt');
      expect(wizardData.clientId).toBe('client123');
      expect(wizardData.priority).toBe('medium');
      expect(wizardData.assignedTeamMembers).toHaveLength(2);
      expect(wizardData.createCampaignImmediately).toBe(true);
      expect(wizardData.completedSteps).toEqual([1, 2, 3, 4]);
    });

    it('sollte optionale Felder korrekt handhaben', () => {
      const minimalWizardData: ProjectCreationWizardData = {
        title: 'Minimal Projekt',
        clientId: 'client123',
        priority: 'low',
        tags: [],
        assignedTeamMembers: ['user1'],
        createCampaignImmediately: false,
        initialAssets: [],
        distributionLists: [],
        completedSteps: [1],
        currentStep: 1
      };

      expect(minimalWizardData.description).toBeUndefined();
      expect(minimalWizardData.projectManager).toBeUndefined();
      expect(minimalWizardData.templateId).toBeUndefined();
      expect(minimalWizardData.customTasks).toBeUndefined();
      expect(minimalWizardData.startDate).toBeUndefined();
      expect(minimalWizardData.campaignTitle).toBeUndefined();
    });

    it('sollte alle ProjectPriority-Werte akzeptieren', () => {
      const priorities: ProjectPriority[] = ['low', 'medium', 'high', 'urgent'];
      
      priorities.forEach(priority => {
        const wizardData: Partial<ProjectCreationWizardData> = {
          priority
        };
        expect(wizardData.priority).toBe(priority);
      });
    });
  });

  describe('ProjectCreationResult Interface', () => {
    it('sollte vollständiges Success-Result korrekt strukturieren', () => {
      const mockProject: Project = {
        id: 'project123',
        userId: 'user1',
        organizationId: 'org1',
        title: 'Test Projekt',
        status: 'active',
        currentStage: 'ideas_planning',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const successResult: ProjectCreationResult = {
        success: true,
        projectId: 'project123',
        project: mockProject,
        campaignId: 'campaign123',
        campaign: {
          id: 'campaign123',
          title: 'Test Campaign',
          organizationId: 'org1',
          userId: 'user1'
        },
        tasksCreated: ['task1', 'task2', 'task3'],
        assetsAttached: 5,
        warnings: ['Template partiell angewendet'],
        infos: ['Projekt erfolgreich erstellt'],
        nextSteps: ['Team benachrichtigen', 'Tasks zuweisen']
      };

      expect(successResult.success).toBe(true);
      expect(successResult.projectId).toBe('project123');
      expect(successResult.tasksCreated).toHaveLength(3);
      expect(successResult.assetsAttached).toBe(5);
      expect(successResult.warnings).toHaveLength(1);
      expect(successResult.nextSteps).toHaveLength(2);
    });

    it('sollte Failure-Result korrekt strukturieren', () => {
      const failureResult: ProjectCreationResult = {
        success: false,
        projectId: '',
        project: {} as Project,
        tasksCreated: [],
        assetsAttached: 0,
        warnings: ['Validierungsfehler'],
        infos: [],
        nextSteps: []
      };

      expect(failureResult.success).toBe(false);
      expect(failureResult.projectId).toBe('');
      expect(failureResult.tasksCreated).toHaveLength(0);
      expect(failureResult.assetsAttached).toBe(0);
    });
  });

  describe('ProjectCreationOptions Interface', () => {
    it('sollte alle verfügbaren Optionen strukturieren', () => {
      const options: ProjectCreationOptions = {
        availableClients: [
          {
            id: 'client1',
            name: 'TechCorp GmbH',
            type: 'enterprise',
            contactCount: 15
          }
        ],
        availableTeamMembers: [
          {
            id: 'user1',
            displayName: 'Max Mustermann',
            email: 'max@example.com',
            role: 'Project Manager',
            avatar: 'avatar.jpg'
          }
        ],
        availableTemplates: [
          {
            id: 'template1',
            name: 'Standard PR-Kampagne',
            description: 'Standard Workflow',
            taskCount: 10,
            category: 'standard'
          }
        ],
        availableDistributionLists: [
          {
            id: 'list1',
            name: 'Hauptverteiler',
            contactCount: 25
          }
        ],
        availableAssets: [
          {
            id: 'asset1',
            name: 'test-image.jpg',
            type: 'image',
            size: '1.2 MB'
          }
        ]
      };

      expect(options.availableClients).toHaveLength(1);
      expect(options.availableTeamMembers[0].email).toBe('max@example.com');
      expect(options.availableTemplates[0].taskCount).toBe(10);
      expect(options.availableDistributionLists[0].contactCount).toBe(25);
    });

    it('sollte leere Arrays für alle Optionen erlauben', () => {
      const emptyOptions: ProjectCreationOptions = {
        availableClients: [],
        availableTeamMembers: [],
        availableTemplates: [],
        availableDistributionLists: [],
        availableAssets: []
      };

      expect(emptyOptions.availableClients).toHaveLength(0);
      expect(emptyOptions.availableTeamMembers).toHaveLength(0);
      expect(emptyOptions.availableTemplates).toHaveLength(0);
      expect(emptyOptions.availableDistributionLists).toHaveLength(0);
    });
  });

  describe('ValidationResult Interface', () => {
    it('sollte gültige Validierung korrekt darstellen', () => {
      const validResult: ValidationResult = {
        isValid: true,
        errors: {}
      };

      expect(validResult.isValid).toBe(true);
      expect(Object.keys(validResult.errors)).toHaveLength(0);
    });

    it('sollte ungültige Validierung mit Fehlern darstellen', () => {
      const invalidResult: ValidationResult = {
        isValid: false,
        errors: {
          title: 'Titel ist erforderlich',
          clientId: 'Kunde muss ausgewählt werden',
          assignedTeamMembers: 'Mindestens ein Team-Mitglied erforderlich'
        }
      };

      expect(invalidResult.isValid).toBe(false);
      expect(Object.keys(invalidResult.errors)).toHaveLength(3);
      expect(invalidResult.errors.title).toBe('Titel ist erforderlich');
      expect(invalidResult.errors.clientId).toBe('Kunde muss ausgewählt werden');
    });
  });

  describe('ResourceInitializationOptions Interface', () => {
    it('sollte alle Ressourcen-Optionen korrekt strukturieren', () => {
      const options: ResourceInitializationOptions = {
        createCampaign: true,
        campaignTitle: 'Test Kampagne',
        attachAssets: ['asset1', 'asset2', 'asset3'],
        linkDistributionLists: ['list1', 'list2'],
        createTasks: true,
        notifyTeam: true
      };

      expect(options.createCampaign).toBe(true);
      expect(options.campaignTitle).toBe('Test Kampagne');
      expect(options.attachAssets).toHaveLength(3);
      expect(options.linkDistributionLists).toHaveLength(2);
      expect(options.createTasks).toBe(true);
      expect(options.notifyTeam).toBe(true);
    });

    it('sollte minimale Konfiguration erlauben', () => {
      const minimalOptions: ResourceInitializationOptions = {
        createCampaign: false,
        attachAssets: [],
        linkDistributionLists: [],
        createTasks: false,
        notifyTeam: false
      };

      expect(minimalOptions.createCampaign).toBe(false);
      expect(minimalOptions.campaignTitle).toBeUndefined();
      expect(minimalOptions.attachAssets).toHaveLength(0);
      expect(minimalOptions.createTasks).toBe(false);
    });
  });

  describe('ResourceInitializationResult Interface', () => {
    it('sollte erfolgreiches Ressourcen-Ergebnis strukturieren', () => {
      const result: ResourceInitializationResult = {
        campaignCreated: true,
        campaignId: 'campaign123',
        assetsAttached: 3,
        listsLinked: 2,
        tasksGenerated: 8,
        teamNotified: true,
        errors: []
      };

      expect(result.campaignCreated).toBe(true);
      expect(result.campaignId).toBe('campaign123');
      expect(result.assetsAttached).toBe(3);
      expect(result.listsLinked).toBe(2);
      expect(result.tasksGenerated).toBe(8);
      expect(result.teamNotified).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('sollte Fehlerhafte Initialisierung mit Errors strukturieren', () => {
      const errorResult: ResourceInitializationResult = {
        campaignCreated: false,
        assetsAttached: 1, // Nur 1 von 3 erfolgreich
        listsLinked: 0,
        tasksGenerated: 0,
        teamNotified: false,
        errors: [
          'Kampagne konnte nicht erstellt werden',
          '2 Assets konnten nicht angehängt werden',
          'Team-Benachrichtigung fehlgeschlagen'
        ]
      };

      expect(errorResult.campaignCreated).toBe(false);
      expect(errorResult.campaignId).toBeUndefined();
      expect(errorResult.assetsAttached).toBe(1);
      expect(errorResult.errors).toHaveLength(3);
    });
  });

  describe('ProjectTemplate Interface', () => {
    it('sollte vollständiges Template korrekt strukturieren', () => {
      const template: ProjectTemplate = {
        id: 'template123',
        name: 'Test Template',
        description: 'Template für Tests',
        category: 'custom',
        defaultTasks: [
          {
            title: 'Task 1',
            category: 'planning',
            stage: 'ideas_planning',
            priority: 'high',
            daysAfterStart: 1,
            assignmentRule: 'project_manager',
            requiredForStageCompletion: true
          }
        ],
        defaultDeadlines: [
          {
            title: 'Milestone 1',
            stage: 'creation',
            daysAfterStart: 7,
            type: 'milestone'
          }
        ],
        defaultConfiguration: {
          autoCreateCampaign: true,
          defaultPriority: 'medium',
          recommendedTeamSize: 3,
          estimatedDuration: 14
        },
        usageCount: 42,
        organizationId: 'org123',
        createdBy: 'user1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      expect(template.id).toBe('template123');
      expect(template.category).toBe('custom');
      expect(template.defaultTasks).toHaveLength(1);
      expect(template.defaultDeadlines).toHaveLength(1);
      expect(template.usageCount).toBe(42);
      expect(template.organizationId).toBe('org123');
    });

    it('sollte Standard-Template ohne organizationId strukturieren', () => {
      const standardTemplate: ProjectTemplate = {
        id: 'standard-template',
        name: 'Standard PR Template',
        description: 'Standard-Template für alle',
        category: 'standard',
        defaultTasks: [],
        defaultDeadlines: [],
        defaultConfiguration: {
          autoCreateCampaign: false,
          defaultPriority: 'low',
          recommendedTeamSize: 2,
          estimatedDuration: 10
        },
        usageCount: 150,
        organizationId: undefined, // Standard-Template
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      expect(standardTemplate.category).toBe('standard');
      expect(standardTemplate.organizationId).toBeUndefined();
      expect(standardTemplate.createdBy).toBeUndefined();
    });
  });

  describe('TemplateApplicationResult Interface', () => {
    it('sollte erfolgreiches Template-Anwenden strukturieren', () => {
      const result: TemplateApplicationResult = {
        success: true,
        tasksCreated: ['task1', 'task2', 'task3'],
        deadlinesCreated: ['deadline1', 'deadline2'],
        configurationApplied: {
          autoCreateCampaign: true,
          defaultPriority: 'medium',
          recommendedTeamSize: 3
        },
        errors: []
      };

      expect(result.success).toBe(true);
      expect(result.tasksCreated).toHaveLength(3);
      expect(result.deadlinesCreated).toHaveLength(2);
      expect(result.configurationApplied.autoCreateCampaign).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('sollte fehlgeschlagenes Template-Anwenden mit Fehlern strukturieren', () => {
      const failedResult: TemplateApplicationResult = {
        success: false,
        tasksCreated: [],
        deadlinesCreated: [],
        configurationApplied: {},
        errors: [
          'Template nicht gefunden',
          'Berechtigung fehlt',
          'Datenbankfehler'
        ]
      };

      expect(failedResult.success).toBe(false);
      expect(failedResult.tasksCreated).toHaveLength(0);
      expect(failedResult.deadlinesCreated).toHaveLength(0);
      expect(failedResult.errors).toHaveLength(3);
    });
  });

  describe('ProjectTask Interface', () => {
    it('sollte vollständigen Task korrekt strukturieren', () => {
      const task: ProjectTask = {
        id: 'task123',
        title: 'Test Task',
        description: 'Beschreibung für Test Task',
        category: 'content_creation',
        stage: 'creation',
        priority: 'high',
        assignedTo: 'user1',
        dueDate: new Date('2024-12-31'),
        status: 'in_progress',
        requiredForStageCompletion: true,
        dependencies: ['task_prereq1', 'task_prereq2'],
        estimatedHours: 8,
        actualHours: 6,
        tags: ['important', 'content'],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      expect(task.id).toBe('task123');
      expect(task.title).toBe('Test Task');
      expect(task.category).toBe('content_creation');
      expect(task.stage).toBe('creation');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('in_progress');
      expect(task.requiredForStageCompletion).toBe(true);
      expect(task.dependencies).toHaveLength(2);
      expect(task.estimatedHours).toBe(8);
      expect(task.tags).toHaveLength(2);
    });

    it('sollte alle TaskPriority-Werte akzeptieren', () => {
      const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
      
      priorities.forEach(priority => {
        const task: Partial<ProjectTask> = {
          priority
        };
        expect(task.priority).toBe(priority);
      });
    });

    it('sollte alle PipelineStage-Werte akzeptieren', () => {
      const stages: PipelineStage[] = [
        'ideas_planning',
        'creation',
        'approval',
        'distribution',
        'monitoring',
        'completed'
      ];

      stages.forEach(stage => {
        const task: Partial<ProjectTask> = {
          stage
        };
        expect(task.stage).toBe(stage);
      });
    });
  });

  describe('CreateTemplateData Interface', () => {
    it('sollte Template-Erstellungsdaten korrekt strukturieren', () => {
      const templateData: CreateTemplateData = {
        name: 'Neues Custom Template',
        description: 'Custom Template für spezielle Projekte',
        category: 'custom',
        defaultTasks: [
          {
            title: 'Custom Task',
            category: 'custom_work',
            stage: 'creation',
            priority: 'medium',
            daysAfterStart: 5,
            assignmentRule: 'auto',
            requiredForStageCompletion: false
          }
        ],
        defaultDeadlines: [
          {
            title: 'Custom Deadline',
            stage: 'distribution',
            daysAfterStart: 14,
            type: 'deadline'
          }
        ],
        defaultConfiguration: {
          autoCreateCampaign: false,
          defaultPriority: 'low',
          recommendedTeamSize: 2,
          estimatedDuration: 7
        }
      };

      expect(templateData.name).toBe('Neues Custom Template');
      expect(templateData.category).toBe('custom');
      expect(templateData.defaultTasks).toHaveLength(1);
      expect(templateData.defaultDeadlines).toHaveLength(1);
      expect(templateData.defaultConfiguration.autoCreateCampaign).toBe(false);
    });

    it('sollte alle category-Werte akzeptieren', () => {
      const categories: ('custom' | 'industry')[] = ['custom', 'industry'];
      
      categories.forEach(category => {
        const templateData: Partial<CreateTemplateData> = {
          category
        };
        expect(templateData.category).toBe(category);
      });
    });
  });

  describe('Project CreationContext Erweiterung', () => {
    it('sollte creationContext korrekt strukturieren', () => {
      const project: Partial<Project> = {
        creationContext: {
          createdViaWizard: true,
          templateId: 'template123',
          templateName: 'PR Standard Template',
          wizardVersion: '1.0.0',
          stepsCompleted: ['1', '2', '3', '4'],
          initialConfiguration: {
            autoCreateCampaign: true,
            autoAssignAssets: false,
            autoCreateTasks: true,
            selectedTemplate: 'template123'
          }
        }
      };

      expect(project.creationContext?.createdViaWizard).toBe(true);
      expect(project.creationContext?.templateId).toBe('template123');
      expect(project.creationContext?.stepsCompleted).toHaveLength(4);
      expect(project.creationContext?.initialConfiguration.autoCreateCampaign).toBe(true);
    });

    it('sollte setupStatus korrekt strukturieren', () => {
      const project: Partial<Project> = {
        setupStatus: {
          campaignLinked: true,
          assetsAttached: false,
          tasksCreated: true,
          teamNotified: true,
          initialReviewComplete: false
        }
      };

      expect(project.setupStatus?.campaignLinked).toBe(true);
      expect(project.setupStatus?.assetsAttached).toBe(false);
      expect(project.setupStatus?.tasksCreated).toBe(true);
      expect(project.setupStatus?.teamNotified).toBe(true);
      expect(project.setupStatus?.initialReviewComplete).toBe(false);
    });

    it('sollte templateConfig korrekt strukturieren', () => {
      const project: Partial<Project> = {
        templateConfig: {
          appliedTemplateId: 'template123',
          templateVersion: '1.0.0',
          customizations: {
            modifiedTasks: ['task1'],
            additionalSteps: ['custom_step_1']
          },
          inheritedTasks: ['task1', 'task2', 'task3'],
          inheritedDeadlines: ['deadline1', 'deadline2']
        }
      };

      expect(project.templateConfig?.appliedTemplateId).toBe('template123');
      expect(project.templateConfig?.templateVersion).toBe('1.0.0');
      expect(project.templateConfig?.inheritedTasks).toHaveLength(3);
      expect(project.templateConfig?.inheritedDeadlines).toHaveLength(2);
      expect(project.templateConfig?.customizations.modifiedTasks).toHaveLength(1);
    });
  });
});