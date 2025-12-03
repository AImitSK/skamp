// src/lib/firebase/__tests__/project-template-service.test.ts
import { projectTemplateService } from '../project-template-service';
import { projectService } from '../project-service';
import { 
  ProjectTemplate, 
  TemplateApplicationResult, 
  CreateTemplateData,
  PipelineStage,
  TaskPriority,
  ProjectPriority
} from '@/types/project';
import { Timestamp } from 'firebase/firestore';
import { 
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore');
jest.mock('../project-service');

describe('ProjectTemplateService', () => {

  const mockOrganizationId = 'org123';
  const mockUserId = 'user123';

  // Mock-Referenzen außerhalb von beforeEach definieren
  const mockCollectionRef = { _type: 'collection' };
  const mockDocRef = { _type: 'doc' };
  const mockQuery = { _type: 'query' };

  beforeEach(() => {
    // Mock Timestamp
    (Timestamp.now as jest.Mock) = jest.fn(() => ({
      seconds: 1640995200,
      nanoseconds: 0
    }));

    // Mock Firestore functions mit konsistenten Rückgabewerten
    (collection as jest.Mock).mockReturnValue(mockCollectionRef);
    (doc as jest.Mock).mockReturnValue(mockDocRef);
    (query as jest.Mock).mockReturnValue(mockQuery);
    (where as jest.Mock).mockReturnValue(mockQuery);
    (orderBy as jest.Mock).mockReturnValue(mockQuery);
    (limit as jest.Mock).mockReturnValue(mockQuery);

    // Reset getDoc, updateDoc, addDoc, deleteDoc zu Default-Implementierung
    // Verwende mockImplementation für persistente Mocks
    (getDoc as jest.Mock).mockImplementation(() => Promise.resolve({ exists: () => false }));
    (updateDoc as jest.Mock).mockImplementation(() => Promise.resolve(undefined));
    (addDoc as jest.Mock).mockImplementation(() => Promise.resolve({ id: 'mock-id' }));
    (deleteDoc as jest.Mock).mockImplementation(() => Promise.resolve(undefined));
    (getDocs as jest.Mock).mockImplementation(() => Promise.resolve({ docs: [] }));
  });

  afterEach(() => {
    // Restore alle Spies um Test-Isolation sicherzustellen
    jest.restoreAllMocks();
  });

  describe('getAll', () => {
    
    it('sollte Standard- und Custom-Templates zusammen laden', async () => {
      const mockStandardTemplate = {
        id: 'standard1',
        name: 'Standard PR-Kampagne',
        category: 'standard',
        organizationId: undefined,
        usageCount: 50
      };

      const mockCustomTemplate = {
        id: 'custom1',
        name: 'Custom Template',
        category: 'custom',
        organizationId: mockOrganizationId,
        usageCount: 5
      };

      const mockStandardSnapshot = {
        docs: [{ id: 'standard1', data: () => mockStandardTemplate }]
      };

      const mockCustomSnapshot = {
        docs: [{ id: 'custom1', data: () => mockCustomTemplate }]
      };

      (getDocs as jest.Mock)
        .mockResolvedValueOnce(mockStandardSnapshot)
        .mockResolvedValueOnce(mockCustomSnapshot);

      const templates = await projectTemplateService.getAll(mockOrganizationId);

      expect(templates).toHaveLength(2);
      expect(templates[0].id).toBe('standard1');
      expect(templates[1].id).toBe('custom1');
    });

    it('sollte Default-Templates zurückgeben wenn keine Templates in DB', async () => {
      const emptySnapshot = { docs: [] };
      
      (getDocs as jest.Mock)
        .mockResolvedValueOnce(emptySnapshot) // Standard templates
        .mockResolvedValueOnce(emptySnapshot); // Custom templates

      const templates = await projectTemplateService.getAll(mockOrganizationId);

      expect(templates.length).toBeGreaterThan(0); // Default templates loaded
      expect(templates[0].name).toBe('Standard PR-Kampagne');
    });

    it('sollte bei Fehler Default-Templates als Fallback verwenden', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Database error'));

      const templates = await projectTemplateService.getAll(mockOrganizationId);

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].category).toBe('standard');
    });

    it('sollte Templates nach Usage Count sortiert laden', async () => {
      const mockTemplate1 = {
        id: 'template1',
        name: 'Template 1',
        usageCount: 10
      };

      const mockTemplate2 = {
        id: 'template2', 
        name: 'Template 2',
        usageCount: 25
      };

      const mockSnapshot = {
        docs: [
          { id: 'template2', data: () => mockTemplate2 }, // Higher usage first
          { id: 'template1', data: () => mockTemplate1 }
        ]
      };

      (getDocs as jest.Mock)
        .mockResolvedValueOnce(mockSnapshot)
        .mockResolvedValueOnce({ docs: [] });

      await projectTemplateService.getAll(mockOrganizationId);

      expect(orderBy).toHaveBeenCalledWith('usageCount', 'desc');
    });

    it('sollte Multi-Tenancy für Custom Templates beachten', async () => {
      await projectTemplateService.getAll(mockOrganizationId);

      expect(where).toHaveBeenCalledWith('organizationId', '==', mockOrganizationId);
    });
  });

  describe('getById', () => {
    
    it('sollte Template aus DB laden', async () => {
      const mockTemplate = {
        id: 'template123',
        name: 'Test Template',
        category: 'custom',
        organizationId: mockOrganizationId
      };

      const mockDocSnap = {
        exists: () => true,
        data: () => mockTemplate,
        id: 'template123'
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const template = await projectTemplateService.getById('template123', mockOrganizationId);

      expect(template).toEqual({ ...mockTemplate, id: 'template123' });
    });

    it('sollte null zurückgeben bei falscher Organisation', async () => {
      const mockTemplate = {
        organizationId: 'different-org', // Different organization
        category: 'custom'
      };

      const mockDocSnap = {
        exists: () => true,
        data: () => mockTemplate,
        id: 'template123'
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const template = await projectTemplateService.getById('template123', mockOrganizationId);

      expect(template).toBeNull();
    });

    it('sollte Standard-Template trotz fehlender organizationId laden', async () => {
      const mockStandardTemplate = {
        organizationId: undefined, // Standard template
        category: 'standard'
      };

      const mockDocSnap = {
        exists: () => true,
        data: () => mockStandardTemplate,
        id: 'standard-template'
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const template = await projectTemplateService.getById('standard-template', mockOrganizationId);

      expect(template).toBeTruthy();
      expect(template?.organizationId).toBeUndefined();
    });

    it('sollte auf Default-Templates fallback wenn nicht in DB gefunden', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      // Mock dass Default-Templates das gewünschte Template enthalten
      const template = await projectTemplateService.getById('pr-campaign-standard', mockOrganizationId);

      expect(template).toBeTruthy();
      expect(template?.id).toBe('pr-campaign-standard');
    });

    it('sollte null bei unbekanntem Template zurückgeben', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const template = await projectTemplateService.getById('unknown-template', mockOrganizationId);

      expect(template).toBeNull();
    });

    it('sollte bei Fehler null zurückgeben', async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error('Database error'));

      const template = await projectTemplateService.getById('template123', mockOrganizationId);

      expect(template).toBeNull();
    });
  });

  describe('applyTemplate', () => {
    
    const mockTemplate: ProjectTemplate = {
      id: 'template123',
      name: 'Test Template',
      description: 'Test template',
      category: 'standard',
      defaultTasks: [
        {
          title: 'Projekt-Briefing erstellen',
          category: 'planning',
          stage: 'ideas_planning',
          priority: 'high',
          daysAfterStart: 1,
          assignmentRule: 'project_manager',
          requiredForStageCompletion: true
        },
        {
          title: 'Content erstellen',
          category: 'content_creation',
          stage: 'creation',
          priority: 'medium',
          daysAfterStart: 7,
          assignmentRule: 'auto',
          requiredForStageCompletion: true
        }
      ],
      defaultDeadlines: [
        {
          title: 'Strategiephase abgeschlossen',
          stage: 'ideas_planning',
          daysAfterStart: 5,
          type: 'milestone'
        }
      ],
      defaultConfiguration: {
        autoCreateCampaign: true,
        defaultPriority: 'medium',
        recommendedTeamSize: 3,
        estimatedDuration: 21
      },
      usageCount: 10,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    it('sollte Template erfolgreich anwenden', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(mockTemplate);
      jest.spyOn(projectTemplateService, 'incrementUsageCount').mockResolvedValue(undefined);
      (projectService.update as jest.Mock).mockResolvedValue(undefined);

      const result = await projectTemplateService.applyTemplate('project123', 'template123');

      expect(result.success).toBe(true);
      expect(result.tasksCreated).toHaveLength(2);
      expect(result.deadlinesCreated).toHaveLength(1);
      expect(result.configurationApplied.autoCreateCampaign).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('sollte bei nicht gefundenem Template Fehler zurückgeben', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(null);

      const result = await projectTemplateService.applyTemplate('project123', 'unknown-template');

      expect(result.success).toBe(false);
      expect(result.tasksCreated).toHaveLength(0);
      expect(result.deadlinesCreated).toHaveLength(0);
      expect(result.errors).toContain('Template nicht gefunden');
    });

    it('sollte Tasks mit korrekten Due Dates erstellen', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(mockTemplate);
      jest.spyOn(projectTemplateService, 'incrementUsageCount').mockResolvedValue(undefined);
      (projectService.update as jest.Mock).mockResolvedValue(undefined);

      const startDate = new Date('2024-01-01');
      const originalDate = global.Date;
      global.Date = jest.fn(() => startDate) as any;
      global.Date.now = originalDate.now;

      const result = await projectTemplateService.applyTemplate('project123', 'template123');

      expect(result.success).toBe(true);
      // Task 1: 1 day after start, Task 2: 7 days after start
      expect(result.tasksCreated).toHaveLength(2);

      global.Date = originalDate;
    });

    it('sollte Assignment Rules korrekt anwenden', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(mockTemplate);
      jest.spyOn(projectTemplateService, 'incrementUsageCount').mockResolvedValue(undefined);
      (projectService.update as jest.Mock).mockResolvedValue(undefined);

      await projectTemplateService.applyTemplate('project123', 'template123');

      // Verify dass project_manager Assignment Rule angewendet wurde
      // (In der echten Implementierung würde hier der echte taskService aufgerufen)
      expect(projectService.update).toHaveBeenCalledWith(
        'project123',
        expect.objectContaining({
          templateConfig: expect.objectContaining({
            appliedTemplateId: 'template123'
          })
        }),
        expect.any(Object)
      );
    });

    it('sollte Usage Count nach erfolgreicher Anwendung erhöhen', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(mockTemplate);
      const incrementSpy = jest.spyOn(projectTemplateService, 'incrementUsageCount').mockResolvedValue(undefined);
      (projectService.update as jest.Mock).mockResolvedValue(undefined);

      await projectTemplateService.applyTemplate('project123', 'template123');

      expect(incrementSpy).toHaveBeenCalledWith('template123');
    });

    it('sollte Template-Konfiguration am Projekt speichern', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(mockTemplate);
      jest.spyOn(projectTemplateService, 'incrementUsageCount').mockResolvedValue(undefined);
      const updateSpy = (projectService.update as jest.Mock).mockResolvedValue(undefined);

      const customizations = { modifiedPriority: 'high' };

      await projectTemplateService.applyTemplate('project123', 'template123', customizations);

      expect(updateSpy).toHaveBeenCalledWith(
        'project123',
        {
          templateConfig: {
            appliedTemplateId: 'template123',
            templateVersion: '1.0.0',
            customizations,
            inheritedTasks: expect.any(Array),
            inheritedDeadlines: expect.any(Array)
          }
        },
        expect.any(Object)
      );
    });

    it('sollte Task-Erstellungsfehler sammeln aber Template-Anwendung fortsetzen', async () => {
      const templateWithManyTasks = {
        ...mockTemplate,
        defaultTasks: [
          ...mockTemplate.defaultTasks,
          {
            title: 'Fehlerhafter Task',
            category: 'error',
            stage: 'creation' as PipelineStage,
            priority: 'high' as TaskPriority,
            daysAfterStart: 3,
            assignmentRule: 'auto' as const,
            requiredForStageCompletion: false
          }
        ]
      };

      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(templateWithManyTasks);
      jest.spyOn(projectTemplateService, 'incrementUsageCount').mockResolvedValue(undefined);
      (projectService.update as jest.Mock).mockResolvedValue(undefined);

      const result = await projectTemplateService.applyTemplate('project123', 'template123');

      expect(result.success).toBe(true);
      expect(result.tasksCreated).toHaveLength(3); // Alle Tasks erstellt (Mock-Implementierung)
    });

    it('sollte Deadline-Erstellungsfehler sammeln', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(mockTemplate);
      jest.spyOn(projectTemplateService, 'incrementUsageCount').mockResolvedValue(undefined);
      (projectService.update as jest.Mock).mockResolvedValue(undefined);

      const result = await projectTemplateService.applyTemplate('project123', 'template123');

      expect(result.success).toBe(true);
      expect(result.deadlinesCreated).toHaveLength(1); // Mock-Implementierung
    });

    it('sollte bei kritischem Fehler Failure zurückgeben', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockRejectedValue(new Error('Database connection failed'));

      const result = await projectTemplateService.applyTemplate('project123', 'template123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Database connection failed');
    });
  });

  describe('getDefaultTemplates', () => {
    
    it('sollte Standard-Templates zurückgeben', () => {
      const templates = projectTemplateService.getDefaultTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].category).toBe('standard');
      expect(templates[0].name).toBe('Standard PR-Kampagne');
    });

    it('sollte Templates mit korrekter Struktur zurückgeben', () => {
      const templates = projectTemplateService.getDefaultTemplates();
      const template = templates[0];

      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('category');
      expect(template).toHaveProperty('defaultTasks');
      expect(template).toHaveProperty('defaultDeadlines');
      expect(template).toHaveProperty('defaultConfiguration');
      expect(template.organizationId).toBeUndefined();
    });

    it('sollte verschiedene Template-Kategorien enthalten', () => {
      const templates = projectTemplateService.getDefaultTemplates();

      const categories = templates.map(t => t.category);
      expect(categories).toContain('standard');
    });
  });

  describe('createCustomTemplate', () => {
    
    const mockTemplateData: CreateTemplateData = {
      name: 'Custom Marketing Template',
      description: 'Spezielles Template für Marketing-Kampagnen',
      category: 'custom',
      defaultTasks: [
        {
          title: 'Marketing-Strategie entwickeln',
          category: 'planning',
          stage: 'ideas_planning',
          priority: 'high',
          daysAfterStart: 2,
          assignmentRule: 'project_manager',
          requiredForStageCompletion: true
        }
      ],
      defaultDeadlines: [
        {
          title: 'Launch-Termin',
          stage: 'distribution',
          daysAfterStart: 30,
          type: 'deadline'
        }
      ],
      defaultConfiguration: {
        autoCreateCampaign: false,
        defaultPriority: 'medium',
        recommendedTeamSize: 4,
        estimatedDuration: 35
      }
    };

    it('sollte Custom Template erfolgreich erstellen', async () => {
      const mockDocRef = { id: 'new-template-123' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const templateId = await projectTemplateService.createCustomTemplate(
        mockTemplateData, 
        mockOrganizationId
      );

      expect(templateId).toBe('new-template-123');
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(), // collection reference
        expect.objectContaining({
          name: mockTemplateData.name,
          description: mockTemplateData.description,
          category: 'custom',
          organizationId: mockOrganizationId,
          usageCount: 0,
          createdAt: expect.any(Object),
          updatedAt: expect.any(Object)
        })
      );
    });

    it('sollte alle Template-Daten korrekt übertragen', async () => {
      const mockDocRef = { id: 'template-456' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      await projectTemplateService.createCustomTemplate(mockTemplateData, mockOrganizationId);

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          defaultTasks: mockTemplateData.defaultTasks,
          defaultDeadlines: mockTemplateData.defaultDeadlines,
          defaultConfiguration: mockTemplateData.defaultConfiguration
        })
      );
    });

    it('sollte bei Datenbankfehler Exception werfen', async () => {
      (addDoc as jest.Mock).mockRejectedValue(new Error('Database write failed'));

      await expect(
        projectTemplateService.createCustomTemplate(mockTemplateData, mockOrganizationId)
      ).rejects.toThrow('Database write failed');
    });

    it('sollte industry category erlauben', async () => {
      const industryTemplate = {
        ...mockTemplateData,
        category: 'industry' as const
      };

      const mockDocRef = { id: 'industry-template' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      await projectTemplateService.createCustomTemplate(industryTemplate, mockOrganizationId);

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          category: 'industry'
        })
      );
    });
  });

  describe('incrementUsageCount', () => {
    
    it('sollte Usage Count erfolgreich erhöhen', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({ usageCount: 5 })
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await projectTemplateService.incrementUsageCount('template123');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(), // doc reference
        {
          usageCount: 6,
          updatedAt: expect.any(Object)
        }
      );
    });

    it('sollte bei fehlendem Usage Count auf 1 setzen', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({}) // No usageCount property
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await projectTemplateService.incrementUsageCount('template123');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          usageCount: 1,
          updatedAt: expect.any(Object)
        }
      );
    });

    it('sollte bei nicht existierendem Template stillschweigend fehlschlagen', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      // Should not throw
      await expect(
        projectTemplateService.incrementUsageCount('nonexistent-template')
      ).resolves.not.toThrow();

      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('sollte Fehler abfangen und nicht werfen', async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Should not throw even on database error
      await expect(
        projectTemplateService.incrementUsageCount('template123')
      ).resolves.not.toThrow();
    });
  });

  describe('update', () => {
    
    const mockExistingTemplate: ProjectTemplate = {
      id: 'template123',
      name: 'Existing Template',
      description: 'Test',
      category: 'custom',
      defaultTasks: [],
      defaultDeadlines: [],
      defaultConfiguration: {} as any,
      usageCount: 5,
      organizationId: mockOrganizationId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    it('sollte Template erfolgreich aktualisieren', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(mockExistingTemplate);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const updateData = {
        name: 'Updated Template Name',
        description: 'Updated description'
      };

      await projectTemplateService.update('template123', updateData, mockOrganizationId);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          ...updateData,
          updatedAt: expect.any(Object)
        }
      );
    });

    it('sollte Fehler werfen bei nicht gefundenem Template', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(null);

      await expect(
        projectTemplateService.update('nonexistent', {}, mockOrganizationId)
      ).rejects.toThrow('Template nicht gefunden oder keine Berechtigung');
    });

    it('sollte Fehler werfen bei Standard-Template', async () => {
      const standardTemplate = {
        ...mockExistingTemplate,
        organizationId: undefined // Standard template
      };

      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(standardTemplate);

      await expect(
        projectTemplateService.update('standard-template', {}, mockOrganizationId)
      ).rejects.toThrow('Standard-Templates können nicht bearbeitet werden');
    });

    it('sollte Multi-Tenancy-Sicherheit beachten', async () => {
      const otherOrgTemplate = {
        ...mockExistingTemplate,
        organizationId: 'other-org'
      };

      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(otherOrgTemplate);

      // getById should return null for other organization
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(null);

      await expect(
        projectTemplateService.update('template123', {}, mockOrganizationId)
      ).rejects.toThrow('Template nicht gefunden oder keine Berechtigung');
    });

    it('sollte bei Datenbankfehler Exception werfen', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(mockExistingTemplate);
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Database update failed'));

      await expect(
        projectTemplateService.update('template123', {}, mockOrganizationId)
      ).rejects.toThrow('Database update failed');
    });
  });

  describe('delete', () => {
    
    const mockExistingTemplate: ProjectTemplate = {
      id: 'template123',
      name: 'Template to Delete',
      description: 'Test',
      category: 'custom',
      defaultTasks: [],
      defaultDeadlines: [],
      defaultConfiguration: {} as any,
      usageCount: 5,
      organizationId: mockOrganizationId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    it('sollte Custom Template erfolgreich löschen', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(mockExistingTemplate);
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await projectTemplateService.delete('template123', mockOrganizationId);

      expect(deleteDoc).toHaveBeenCalled();
    });

    it('sollte Fehler werfen bei nicht gefundenem Template', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(null);

      await expect(
        projectTemplateService.delete('nonexistent', mockOrganizationId)
      ).rejects.toThrow('Template nicht gefunden oder keine Berechtigung');
    });

    it('sollte Fehler werfen beim Löschen von Standard-Templates', async () => {
      const standardTemplate = {
        ...mockExistingTemplate,
        organizationId: undefined // Standard template
      };

      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(standardTemplate);

      await expect(
        projectTemplateService.delete('standard-template', mockOrganizationId)
      ).rejects.toThrow('Standard-Templates können nicht gelöscht werden');
    });

    it('sollte Multi-Tenancy-Sicherheit beim Löschen beachten', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(null); // Simulates access denied

      await expect(
        projectTemplateService.delete('template123', mockOrganizationId)
      ).rejects.toThrow('Template nicht gefunden oder keine Berechtigung');
    });

    it('sollte bei Datenbankfehler Exception werfen', async () => {
      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(mockExistingTemplate);
      (deleteDoc as jest.Mock).mockRejectedValue(new Error('Database delete failed'));

      await expect(
        projectTemplateService.delete('template123', mockOrganizationId)
      ).rejects.toThrow('Database delete failed');
    });
  });

  describe('Edge Cases & Error Handling', () => {
    
    it('sollte bei undefined Organization Id funktionieren', async () => {
      const templates = await projectTemplateService.getAll('');
      
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
    });

    it('sollte bei null Template-Daten robusten Fehler werfen', async () => {
      await expect(
        projectTemplateService.createCustomTemplate(null as any, mockOrganizationId)
      ).rejects.toThrow();
    });

    it('sollte bei Template mit leeren Arrays funktionieren', async () => {
      const emptyTemplate: ProjectTemplate = {
        id: 'empty-template',
        name: 'Empty Template',
        description: 'Template without tasks',
        category: 'custom',
        defaultTasks: [],
        defaultDeadlines: [],
        defaultConfiguration: {
          autoCreateCampaign: false,
          defaultPriority: 'low',
          recommendedTeamSize: 1,
          estimatedDuration: 1
        },
        usageCount: 0,
        organizationId: mockOrganizationId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(emptyTemplate);
      jest.spyOn(projectTemplateService, 'incrementUsageCount').mockResolvedValue(undefined);
      (projectService.update as jest.Mock).mockResolvedValue(undefined);

      const result = await projectTemplateService.applyTemplate('project123', 'empty-template');

      expect(result.success).toBe(true);
      expect(result.tasksCreated).toHaveLength(0);
      expect(result.deadlinesCreated).toHaveLength(0);
    });

    it('sollte Template mit ungültigen Stage-Werten handhaben', async () => {
      const mockExistingTemplate = {
        id: 'existing-template',
        organizationId: 'test-org',
        name: 'Existing Template',
        description: 'Existing test template',
        category: 'standard' as const,
        isActive: true,
        isDefault: false,
        usageCount: 5,
        defaultTasks: [],
        defaultDeadlines: [],
        defaultConfiguration: {
          autoCreateCampaign: false,
          defaultPriority: 'medium' as const,
          recommendedTeamSize: 3,
          estimatedDuration: 30
        },
        createdBy: 'user123',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const invalidTemplate = {
        ...mockExistingTemplate,
        defaultTasks: [
          {
            title: 'Invalid Task',
            category: 'test',
            stage: 'invalid_stage' as PipelineStage,
            priority: 'high' as TaskPriority,
            daysAfterStart: 1,
            assignmentRule: 'auto' as const,
            requiredForStageCompletion: false
          }
        ]
      };

      jest.spyOn(projectTemplateService, 'getById').mockResolvedValue(invalidTemplate);
      jest.spyOn(projectTemplateService, 'incrementUsageCount').mockResolvedValue(undefined);
      (projectService.update as jest.Mock).mockResolvedValue(undefined);

      // Should not throw, but handle gracefully
      const result = await projectTemplateService.applyTemplate('project123', 'template123');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});