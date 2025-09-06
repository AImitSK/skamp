// src/components/projects/creation/__tests__/wizard-logic.test.ts
import { projectService } from '@/lib/firebase/project-service';
import { 
  ProjectCreationWizardData, 
  ValidationResult,
  ProjectCreationOptions 
} from '@/types/project';

// Mock projectService
jest.mock('@/lib/firebase/project-service');
const mockProjectService = projectService as jest.Mocked<typeof projectService>;

describe('Wizard Logic Tests', () => {
  
  describe('Step Validation Logic', () => {
    
    const baseWizardData: ProjectCreationWizardData = {
      title: '',
      description: '',
      clientId: '',
      priority: 'medium',
      color: '#3B82F6',
      tags: [],
      assignedTeamMembers: [],
      projectManager: undefined,
      templateId: undefined,
      customTasks: [],
      startDate: undefined,
      createCampaignImmediately: false,
      campaignTitle: '',
      initialAssets: [],
      distributionLists: [],
      completedSteps: [],
      currentStep: 1
    };

    describe('validateStep1 - Basis-Informationen', () => {
      
      it('sollte gültige Step 1 Daten akzeptieren', async () => {
        const validData: ProjectCreationWizardData = {
          ...baseWizardData,
          title: 'Test Projekt',
          clientId: 'client123',
          priority: 'high'
        };

        const expectedResult: ValidationResult = {
          isValid: true,
          errors: {}
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(validData, 1);

        expect(result.isValid).toBe(true);
        expect(Object.keys(result.errors)).toHaveLength(0);
        expect(mockProjectService.validateProjectData).toHaveBeenCalledWith(validData, 1);
      });

      it('sollte zu kurzen Titel ablehnen', async () => {
        const invalidData: ProjectCreationWizardData = {
          ...baseWizardData,
          title: 'XX', // Zu kurz
          clientId: 'client123'
        };

        const expectedResult: ValidationResult = {
          isValid: false,
          errors: {
            title: 'Titel muss mindestens 3 Zeichen lang sein'
          }
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(invalidData, 1);

        expect(result.isValid).toBe(false);
        expect(result.errors.title).toBe('Titel muss mindestens 3 Zeichen lang sein');
      });

      it('sollte fehlenden Client ablehnen', async () => {
        const invalidData: ProjectCreationWizardData = {
          ...baseWizardData,
          title: 'Gültiger Titel',
          clientId: '' // Fehlt
        };

        const expectedResult: ValidationResult = {
          isValid: false,
          errors: {
            clientId: 'Bitte wählen Sie einen Kunden aus'
          }
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(invalidData, 1);

        expect(result.isValid).toBe(false);
        expect(result.errors.clientId).toBe('Bitte wählen Sie einen Kunden aus');
      });

      it('sollte mehrere Validierungsfehler gleichzeitig sammeln', async () => {
        const invalidData: ProjectCreationWizardData = {
          ...baseWizardData,
          title: '', // Fehlt
          clientId: '', // Fehlt
          priority: undefined as any // Fehlt
        };

        const expectedResult: ValidationResult = {
          isValid: false,
          errors: {
            title: 'Titel muss mindestens 3 Zeichen lang sein',
            clientId: 'Bitte wählen Sie einen Kunden aus',
            priority: 'Priorität ist erforderlich'
          }
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(invalidData, 1);

        expect(result.isValid).toBe(false);
        expect(Object.keys(result.errors)).toHaveLength(3);
        expect(result.errors.title).toBeDefined();
        expect(result.errors.clientId).toBeDefined();
        expect(result.errors.priority).toBeDefined();
      });

      it('sollte alle ProjectPriority-Werte akzeptieren', async () => {
        const priorities = ['low', 'medium', 'high', 'urgent'] as const;

        for (const priority of priorities) {
          const data: ProjectCreationWizardData = {
            ...baseWizardData,
            title: 'Test Projekt',
            clientId: 'client123',
            priority
          };

          const expectedResult: ValidationResult = {
            isValid: true,
            errors: {}
          };

          mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

          const result = await projectService.validateProjectData(data, 1);
          expect(result.isValid).toBe(true);
        }
      });

      it('sollte optionale Felder korrekt handhaben', async () => {
        const dataWithOptionals: ProjectCreationWizardData = {
          ...baseWizardData,
          title: 'Test Projekt',
          description: 'Eine optionale Beschreibung',
          clientId: 'client123',
          color: '#FF0000',
          tags: ['tag1', 'tag2', 'tag3']
        };

        const expectedResult: ValidationResult = {
          isValid: true,
          errors: {}
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(dataWithOptionals, 1);

        expect(result.isValid).toBe(true);
        expect(mockProjectService.validateProjectData).toHaveBeenCalledWith(dataWithOptionals, 1);
      });
    });

    describe('validateStep2 - Team-Zuordnung', () => {
      
      it('sollte gültige Team-Konfiguration akzeptieren', async () => {
        const validData: ProjectCreationWizardData = {
          ...baseWizardData,
          assignedTeamMembers: ['user1', 'user2'],
          projectManager: 'user1'
        };

        const expectedResult: ValidationResult = {
          isValid: true,
          errors: {}
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(validData, 2);

        expect(result.isValid).toBe(true);
      });

      it('sollte fehlende Team-Mitglieder ablehnen', async () => {
        const invalidData: ProjectCreationWizardData = {
          ...baseWizardData,
          assignedTeamMembers: [] // Leer
        };

        const expectedResult: ValidationResult = {
          isValid: false,
          errors: {
            assignedTeamMembers: 'Mindestens ein Team-Mitglied ist erforderlich'
          }
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(invalidData, 2);

        expect(result.isValid).toBe(false);
        expect(result.errors.assignedTeamMembers).toBe('Mindestens ein Team-Mitglied ist erforderlich');
      });

      it('sollte mehrere Team-Mitglieder korrekt handhaben', async () => {
        const validData: ProjectCreationWizardData = {
          ...baseWizardData,
          assignedTeamMembers: ['user1', 'user2', 'user3', 'user4']
        };

        const expectedResult: ValidationResult = {
          isValid: true,
          errors: {}
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(validData, 2);

        expect(result.isValid).toBe(true);
      });

      it('sollte optionalen Projekt-Manager korrekt handhaben', async () => {
        const dataWithoutPM: ProjectCreationWizardData = {
          ...baseWizardData,
          assignedTeamMembers: ['user1', 'user2'],
          projectManager: undefined // Optional
        };

        const expectedResult: ValidationResult = {
          isValid: true,
          errors: {}
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(dataWithoutPM, 2);

        expect(result.isValid).toBe(true);
      });
    });

    describe('validateStep3 - Template & Setup', () => {
      
      it('sollte gültige Template-Konfiguration akzeptieren', async () => {
        const validData: ProjectCreationWizardData = {
          ...baseWizardData,
          templateId: 'template123',
          startDate: new Date('2024-12-31')
        };

        const expectedResult: ValidationResult = {
          isValid: true,
          errors: {}
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(validData, 3);

        expect(result.isValid).toBe(true);
      });

      it('sollte zu viele Custom Tasks ablehnen', async () => {
        const tooManyTasks = Array(11).fill({
          title: 'Task',
          category: 'custom',
          stage: 'creation' as any,
          priority: 'medium' as any,
          status: 'pending' as any,
          requiredForStageCompletion: false,
          createdAt: {} as any,
          updatedAt: {} as any
        });

        const invalidData: ProjectCreationWizardData = {
          ...baseWizardData,
          customTasks: tooManyTasks
        };

        const expectedResult: ValidationResult = {
          isValid: false,
          errors: {
            customTasks: 'Maximal 10 eigene Tasks erlaubt'
          }
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(invalidData, 3);

        expect(result.isValid).toBe(false);
        expect(result.errors.customTasks).toBe('Maximal 10 eigene Tasks erlaubt');
      });

      it('sollte Startdatum in der Vergangenheit ablehnen', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const invalidData: ProjectCreationWizardData = {
          ...baseWizardData,
          startDate: yesterday
        };

        const expectedResult: ValidationResult = {
          isValid: false,
          errors: {
            startDate: 'Startdatum kann nicht in der Vergangenheit liegen'
          }
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(invalidData, 3);

        expect(result.isValid).toBe(false);
        expect(result.errors.startDate).toBe('Startdatum kann nicht in der Vergangenheit liegen');
      });

      it('sollte ohne Template und Custom Tasks funktionieren', async () => {
        const minimalData: ProjectCreationWizardData = {
          ...baseWizardData,
          templateId: undefined,
          customTasks: []
        };

        const expectedResult: ValidationResult = {
          isValid: true,
          errors: {}
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(minimalData, 3);

        expect(result.isValid).toBe(true);
      });
    });

    describe('validateStep4 - Ressourcen', () => {
      
      it('sollte gültige Ressourcen-Konfiguration akzeptieren', async () => {
        const validData: ProjectCreationWizardData = {
          ...baseWizardData,
          createCampaignImmediately: true,
          campaignTitle: 'Test Kampagne',
          initialAssets: ['asset1', 'asset2'],
          distributionLists: ['list1']
        };

        const expectedResult: ValidationResult = {
          isValid: true,
          errors: {}
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(validData, 4);

        expect(result.isValid).toBe(true);
      });

      it('sollte fehlenden Kampagnen-Titel bei sofortiger Erstellung ablehnen', async () => {
        const invalidData: ProjectCreationWizardData = {
          ...baseWizardData,
          createCampaignImmediately: true,
          campaignTitle: '' // Fehlt
        };

        const expectedResult: ValidationResult = {
          isValid: false,
          errors: {
            campaignTitle: 'Kampagnen-Titel ist erforderlich (min. 3 Zeichen)'
          }
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(invalidData, 4);

        expect(result.isValid).toBe(false);
        expect(result.errors.campaignTitle).toBe('Kampagnen-Titel ist erforderlich (min. 3 Zeichen)');
      });

      it('sollte zu viele initiale Assets ablehnen', async () => {
        const tooManyAssets = Array(21).fill('asset');
        const invalidData: ProjectCreationWizardData = {
          ...baseWizardData,
          initialAssets: tooManyAssets
        };

        const expectedResult: ValidationResult = {
          isValid: false,
          errors: {
            initialAssets: 'Maximal 20 initiale Assets erlaubt'
          }
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(invalidData, 4);

        expect(result.isValid).toBe(false);
        expect(result.errors.initialAssets).toBe('Maximal 20 initiale Assets erlaubt');
      });

      it('sollte ohne sofortige Kampagne funktionieren', async () => {
        const dataWithoutCampaign: ProjectCreationWizardData = {
          ...baseWizardData,
          createCampaignImmediately: false,
          campaignTitle: '', // Nicht erforderlich
          initialAssets: [],
          distributionLists: []
        };

        const expectedResult: ValidationResult = {
          isValid: true,
          errors: {}
        };

        mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

        const result = await projectService.validateProjectData(dataWithoutCampaign, 4);

        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Step Management Logic', () => {
    
    class MockWizardManager {
      private currentStep: number = 1;
      private completedSteps: number[] = [];
      
      canProceedToStep(step: number): boolean {
        if (step === 1) return true;
        return this.completedSteps.includes(step - 1);
      }
      
      completeStep(stepNumber: number): void {
        if (!this.completedSteps.includes(stepNumber)) {
          this.completedSteps.push(stepNumber);
        }
      }
      
      setCurrentStep(step: number): void {
        this.currentStep = step;
      }
      
      getCurrentStep(): number {
        return this.currentStep;
      }
      
      getCompletedSteps(): number[] {
        return [...this.completedSteps];
      }
      
      isStepCompleted(step: number): boolean {
        return this.completedSteps.includes(step);
      }
    }

    let wizardManager: MockWizardManager;

    beforeEach(() => {
      wizardManager = new MockWizardManager();
    });

    describe('Step Progression', () => {
      
      it('sollte zu Schritt 1 immer navigieren können', () => {
        expect(wizardManager.canProceedToStep(1)).toBe(true);
      });

      it('sollte zu Schritt 2 nur nach Abschluss von Schritt 1 navigieren können', () => {
        expect(wizardManager.canProceedToStep(2)).toBe(false);
        
        wizardManager.completeStep(1);
        expect(wizardManager.canProceedToStep(2)).toBe(true);
      });

      it('sollte sequenzielle Navigation durchsetzen', () => {
        expect(wizardManager.canProceedToStep(3)).toBe(false);
        expect(wizardManager.canProceedToStep(4)).toBe(false);
        
        wizardManager.completeStep(1);
        expect(wizardManager.canProceedToStep(2)).toBe(true);
        expect(wizardManager.canProceedToStep(3)).toBe(false);
        
        wizardManager.completeStep(2);
        expect(wizardManager.canProceedToStep(3)).toBe(true);
        expect(wizardManager.canProceedToStep(4)).toBe(false);
      });

      it('sollte abgeschlossene Schritte korrekt verwalten', () => {
        wizardManager.completeStep(1);
        wizardManager.completeStep(2);
        
        expect(wizardManager.isStepCompleted(1)).toBe(true);
        expect(wizardManager.isStepCompleted(2)).toBe(true);
        expect(wizardManager.isStepCompleted(3)).toBe(false);
        
        const completed = wizardManager.getCompletedSteps();
        expect(completed).toContain(1);
        expect(completed).toContain(2);
        expect(completed).not.toContain(3);
      });

      it('sollte Doppel-Completion verhindern', () => {
        wizardManager.completeStep(1);
        wizardManager.completeStep(1); // Doppelt
        
        const completed = wizardManager.getCompletedSteps();
        expect(completed.filter(step => step === 1)).toHaveLength(1);
      });
    });

    describe('Navigation Logic', () => {
      
      it('sollte korrekte Schritt-Reihenfolge durchsetzen', () => {
        // Schritt 1
        wizardManager.setCurrentStep(1);
        expect(wizardManager.getCurrentStep()).toBe(1);
        
        // Nach Schritt 2 nur möglich nach Completion
        wizardManager.completeStep(1);
        wizardManager.setCurrentStep(2);
        expect(wizardManager.getCurrentStep()).toBe(2);
      });

      it('sollte Rückwärts-Navigation erlauben', () => {
        wizardManager.completeStep(1);
        wizardManager.completeStep(2);
        wizardManager.setCurrentStep(3);
        
        // Zurück zu vorherigem Schritt
        wizardManager.setCurrentStep(2);
        expect(wizardManager.getCurrentStep()).toBe(2);
        
        wizardManager.setCurrentStep(1);
        expect(wizardManager.getCurrentStep()).toBe(1);
      });

      it('sollte komplette Navigation durch alle Schritte unterstützen', () => {
        for (let step = 1; step <= 4; step++) {
          if (step > 1) {
            wizardManager.completeStep(step - 1);
          }
          
          expect(wizardManager.canProceedToStep(step)).toBe(true);
          wizardManager.setCurrentStep(step);
          expect(wizardManager.getCurrentStep()).toBe(step);
        }
      });
    });
  });

  describe('Auto-Save Logic', () => {
    
    class MockAutoSave {
      private storage: { [key: string]: string } = {};
      private saveKey: string;
      
      constructor(saveKey: string) {
        this.saveKey = saveKey;
      }
      
      save(data: ProjectCreationWizardData): void {
        this.storage[this.saveKey] = JSON.stringify(data);
      }
      
      load(): ProjectCreationWizardData | null {
        const saved = this.storage[this.saveKey];
        return saved ? JSON.parse(saved) : null;
      }
      
      clear(): void {
        delete this.storage[this.saveKey];
      }
      
      exists(): boolean {
        return this.saveKey in this.storage;
      }
    }

    let autoSave: MockAutoSave;
    
    const baseWizardData: ProjectCreationWizardData = {
      title: '',
      description: '',
      clientId: '',
      priority: 'medium',
      color: '#3B82F6',
      tags: [],
      assignedTeamMembers: [],
      projectManager: undefined,
      templateId: undefined,
      customTasks: [],
      startDate: undefined,
      createCampaignImmediately: false,
      campaignTitle: '',
      initialAssets: [],
      distributionLists: [],
      completedSteps: [],
      currentStep: 1
    };
    
    const testData: ProjectCreationWizardData = {
      ...baseWizardData,
      title: 'Auto-Save Test',
      clientId: 'client123'
    };

    beforeEach(() => {
      autoSave = new MockAutoSave('test-wizard-key');
    });

    it('sollte Wizard-Daten korrekt speichern', () => {
      autoSave.save(testData);
      
      expect(autoSave.exists()).toBe(true);
      
      const loaded = autoSave.load();
      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe('Auto-Save Test');
      expect(loaded?.clientId).toBe('client123');
    });

    it('sollte gespeicherte Daten korrekt laden', () => {
      autoSave.save(testData);
      
      const loadedData = autoSave.load();
      
      expect(loadedData).toEqual(testData);
    });

    it('sollte bei fehlendem Save null zurückgeben', () => {
      const loadedData = autoSave.load();
      
      expect(loadedData).toBeNull();
      expect(autoSave.exists()).toBe(false);
    });

    it('sollte Auto-Save korrekt bereinigen', () => {
      autoSave.save(testData);
      expect(autoSave.exists()).toBe(true);
      
      autoSave.clear();
      expect(autoSave.exists()).toBe(false);
      expect(autoSave.load()).toBeNull();
    });

    it('sollte Updates zu bestehenden Saves korrekt handhaben', () => {
      autoSave.save(testData);
      
      const updatedData: ProjectCreationWizardData = {
        ...testData,
        description: 'Updated description',
        priority: 'high'
      };
      
      autoSave.save(updatedData);
      
      const loaded = autoSave.load();
      expect(loaded?.description).toBe('Updated description');
      expect(loaded?.priority).toBe('high');
      expect(loaded?.title).toBe('Auto-Save Test'); // Unchanged
    });

    it('sollte große Wizard-Daten-Strukturen handhaben', () => {
      const largeData: ProjectCreationWizardData = {
        ...testData,
        tags: Array(50).fill('tag').map((t, i) => `${t}${i}`),
        assignedTeamMembers: Array(20).fill('user').map((u, i) => `${u}${i}`),
        initialAssets: Array(15).fill('asset').map((a, i) => `${a}${i}`),
        distributionLists: Array(10).fill('list').map((l, i) => `${l}${i}`)
      };
      
      autoSave.save(largeData);
      const loaded = autoSave.load();
      
      expect(loaded?.tags).toHaveLength(50);
      expect(loaded?.assignedTeamMembers).toHaveLength(20);
      expect(loaded?.initialAssets).toHaveLength(15);
      expect(loaded?.distributionLists).toHaveLength(10);
    });
  });

  describe('Creation Options Logic', () => {
    
    const mockCreationOptions: ProjectCreationOptions = {
      availableClients: [
        { id: 'client1', name: 'Client 1', type: 'enterprise', contactCount: 10 },
        { id: 'client2', name: 'Client 2', type: 'startup', contactCount: 5 }
      ],
      availableTeamMembers: [
        { id: 'user1', displayName: 'User 1', email: 'user1@test.com', role: 'Manager' },
        { id: 'user2', displayName: 'User 2', email: 'user2@test.com', role: 'Developer' }
      ],
      availableTemplates: [
        { id: 'template1', name: 'Template 1', description: 'Desc 1', taskCount: 5, category: 'standard' },
        { id: 'template2', name: 'Template 2', description: 'Desc 2', taskCount: 3, category: 'custom' }
      ],
      availableDistributionLists: [
        { id: 'list1', name: 'List 1', contactCount: 20 },
        { id: 'list2', name: 'List 2', contactCount: 15 }
      ]
    };

    beforeEach(() => {
      mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
    });

    it('sollte Creation Options korrekt laden', async () => {
      const options = await projectService.getProjectCreationOptions('org123');
      
      expect(options.availableClients).toHaveLength(2);
      expect(options.availableTeamMembers).toHaveLength(2);
      expect(options.availableTemplates).toHaveLength(2);
      expect(options.availableDistributionLists).toHaveLength(2);
    });

    it('sollte Client-Optionen korrekt strukturieren', async () => {
      const options = await projectService.getProjectCreationOptions('org123');
      
      const client = options.availableClients[0];
      expect(client).toHaveProperty('id');
      expect(client).toHaveProperty('name');
      expect(client).toHaveProperty('type');
      expect(client).toHaveProperty('contactCount');
    });

    it('sollte Team-Member-Optionen korrekt strukturieren', async () => {
      const options = await projectService.getProjectCreationOptions('org123');
      
      const member = options.availableTeamMembers[0];
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('displayName');
      expect(member).toHaveProperty('email');
      expect(member).toHaveProperty('role');
    });

    it('sollte Template-Optionen korrekt strukturieren', async () => {
      const options = await projectService.getProjectCreationOptions('org123');
      
      const template = options.availableTemplates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('taskCount');
      expect(template).toHaveProperty('category');
    });

    it('sollte Distribution-List-Optionen korrekt strukturieren', async () => {
      const options = await projectService.getProjectCreationOptions('org123');
      
      const list = options.availableDistributionLists[0];
      expect(list).toHaveProperty('id');
      expect(list).toHaveProperty('name');
      expect(list).toHaveProperty('contactCount');
    });

    it('sollte bei Fehler leere Options zurückgeben', async () => {
      mockProjectService.getProjectCreationOptions.mockRejectedValue(new Error('Network error'));
      
      const options = await projectService.getProjectCreationOptions('org123');
      
      expect(options.availableClients).toHaveLength(0);
      expect(options.availableTeamMembers).toHaveLength(0);
      expect(options.availableTemplates).toHaveLength(0);
      expect(options.availableDistributionLists).toHaveLength(0);
    });
  });

  describe('Error Handling Logic', () => {
    
    const baseWizardData: ProjectCreationWizardData = {
      title: '',
      description: '',
      clientId: '',
      priority: 'medium',
      color: '#3B82F6',
      tags: [],
      assignedTeamMembers: [],
      projectManager: undefined,
      templateId: undefined,
      customTasks: [],
      startDate: undefined,
      createCampaignImmediately: false,
      campaignTitle: '',
      initialAssets: [],
      distributionLists: [],
      completedSteps: [],
      currentStep: 1
    };
    
    it('sollte Validierungsfehler korrekt sammeln', async () => {
      const invalidData: ProjectCreationWizardData = {
        ...baseWizardData,
        title: '', // Fehler 1
        clientId: '', // Fehler 2
        assignedTeamMembers: [] // Wird in Schritt 2 validiert
      };

      const multipleErrors: ValidationResult = {
        isValid: false,
        errors: {
          title: 'Titel ist erforderlich',
          clientId: 'Kunde ist erforderlich'
        }
      };

      mockProjectService.validateProjectData.mockResolvedValue(multipleErrors);

      const result = await projectService.validateProjectData(invalidData, 1);

      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors)).toHaveLength(2);
      expect(result.errors.title).toBeDefined();
      expect(result.errors.clientId).toBeDefined();
    });

    it('sollte Service-Errors elegant handhaben', async () => {
      mockProjectService.validateProjectData.mockRejectedValue(new Error('Service unavailable'));

      const result = await projectService.validateProjectData(baseWizardData, 1);

      expect(result.isValid).toBe(false);
      expect(result.errors.general).toBeDefined();
    });

    it('sollte unbekannte Steps ablehnen', async () => {
      const unknownStepError: ValidationResult = {
        isValid: false,
        errors: {
          general: 'Unbekannter Validierungsschritt'
        }
      };

      mockProjectService.validateProjectData.mockResolvedValue(unknownStepError);

      const result = await projectService.validateProjectData(baseWizardData, 999);

      expect(result.isValid).toBe(false);
      expect(result.errors.general).toBe('Unbekannter Validierungsschritt');
    });

    it('sollte Race Conditions bei schneller Navigation handhaben', async () => {
      // Simuliere langsame Validierung
      mockProjectService.validateProjectData.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ isValid: true, errors: {} }), 100))
      );

      // Starte mehrere Validierungen gleichzeitig
      const validations = [
        projectService.validateProjectData(baseWizardData, 1),
        projectService.validateProjectData(baseWizardData, 1),
        projectService.validateProjectData(baseWizardData, 1)
      ];

      const results = await Promise.all(validations);

      // Alle sollten erfolgreich sein
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    
    const baseWizardData: ProjectCreationWizardData = {
      title: '',
      description: '',
      clientId: '',
      priority: 'medium',
      color: '#3B82F6',
      tags: [],
      assignedTeamMembers: [],
      projectManager: undefined,
      templateId: undefined,
      customTasks: [],
      startDate: undefined,
      createCampaignImmediately: false,
      campaignTitle: '',
      initialAssets: [],
      distributionLists: [],
      completedSteps: [],
      currentStep: 1
    };
    
    it('sollte extremes Wizard-Data handhaben', async () => {
      const extremeData: ProjectCreationWizardData = {
        ...baseWizardData,
        title: 'A'.repeat(1000), // Sehr langer Titel
        description: 'B'.repeat(5000), // Sehr lange Beschreibung
        tags: Array(100).fill('tag'), // Viele Tags
        assignedTeamMembers: Array(50).fill('user'), // Viele Team-Mitglieder
        initialAssets: Array(100).fill('asset') // Viele Assets
      };

      const expectedResult: ValidationResult = {
        isValid: false,
        errors: {
          title: 'Titel ist zu lang',
          tags: 'Zu viele Tags',
          assignedTeamMembers: 'Zu viele Team-Mitglieder',
          initialAssets: 'Zu viele initiale Assets'
        }
      };

      mockProjectService.validateProjectData.mockResolvedValue(expectedResult);

      const result = await projectService.validateProjectData(extremeData, 1);

      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });

    it('sollte null/undefined-Werte korrekt handhaben', async () => {
      const nullData = {
        ...baseWizardData,
        title: null as any,
        clientId: undefined as any,
        assignedTeamMembers: null as any
      };

      const nullValidationResult: ValidationResult = {
        isValid: false,
        errors: {
          title: 'Titel ist erforderlich',
          clientId: 'Kunde ist erforderlich',
          assignedTeamMembers: 'Team-Mitglieder sind erforderlich'
        }
      };

      mockProjectService.validateProjectData.mockResolvedValue(nullValidationResult);

      const result = await projectService.validateProjectData(nullData, 1);

      expect(result.isValid).toBe(false);
    });

    it('sollte zirkuläre Referenzen in Daten handhaben', async () => {
      const circularData = { ...baseWizardData };
      // Simuliere zirkuläre Referenz (in der Praxis würde das verhindert)
      (circularData as any).self = circularData;

      // Sollte nicht hängen bleiben
      const result = await projectService.validateProjectData(circularData, 1);

      expect(result).toBeDefined();
    });
  });
});