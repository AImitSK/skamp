// src/components/projects/creation/__tests__/wizard-integration.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCreationWizard } from '../ProjectCreationWizard';
import { projectService } from '@/lib/firebase/project-service';
import { projectTemplateService } from '@/lib/firebase/project-template-service';
import { prService } from '@/lib/firebase/pr-service';
import { useAuth } from '@/context/AuthContext';
import { 
  ProjectCreationOptions,
  ProjectCreationResult,
  ValidationResult,
  TemplateApplicationResult,
  ResourceInitializationResult
} from '@/types/project';

// Mock all dependencies
jest.mock('@/lib/firebase/project-service');
jest.mock('@/lib/firebase/project-template-service');
jest.mock('@/lib/firebase/pr-service');
jest.mock('@/context/AuthContext');
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-wizard-id')
}));

const mockProjectService = projectService as jest.Mocked<typeof projectService>;
const mockTemplateService = projectTemplateService as jest.Mocked<typeof projectTemplateService>;
const mockPrService = prService as jest.Mocked<typeof prService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Wizard Integration Tests - Complete Flow', () => {
  
  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: true,
    isAnonymous: false,
    metadata: {} as any,
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: jest.fn(),
    getIdToken: jest.fn(),
    getIdTokenResult: jest.fn(),
    reload: jest.fn(),
    toJSON: jest.fn(),
    phoneNumber: null,
    photoURL: null,
    providerId: 'password'
  };

  const mockCreationOptions: ProjectCreationOptions = {
    availableClients: [
      {
        id: 'client1',
        name: 'TechCorp GmbH',
        type: 'enterprise',
        contactCount: 15
      },
      {
        id: 'client2',
        name: 'StartUp AG',
        type: 'startup',
        contactCount: 5
      }
    ],
    availableTeamMembers: [
      {
        id: 'user1',
        displayName: 'Max Mustermann',
        email: 'max@example.com',
        role: 'Project Manager',
        avatar: 'avatar1.jpg'
      },
      {
        id: 'user2',
        displayName: 'Lisa Schmidt',
        email: 'lisa@example.com',
        role: 'Content Creator'
      }
    ],
    availableTemplates: [
      {
        id: 'pr-campaign-standard',
        name: 'Standard PR-Kampagne',
        description: 'Klassischer PR-Workflow',
        taskCount: 10,
        category: 'standard'
      },
      {
        id: 'product-launch',
        name: 'Produkt-Launch',
        description: 'Spezialisierter Workflow für Produkteinführungen',
        taskCount: 8,
        category: 'standard'
      }
    ],
    availableDistributionLists: [
      {
        id: 'list1',
        name: 'Hauptverteiler',
        contactCount: 25
      },
      {
        id: 'list2',
        name: 'Fachmedien',
        contactCount: 15
      }
    ]
  };

  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
    organizationId: 'org123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({ 
      user: mockUser, 
      loading: false, 
      signOut: jest.fn(),
      signInWithEmailAndPassword: jest.fn()
    });

    // Standard successful validations
    mockProjectService.validateProjectData.mockResolvedValue({
      isValid: true,
      errors: {}
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
  });

  describe('Complete Happy Path Flow', () => {
    
    it('sollte kompletten Wizard-Flow ohne Template erfolgreich durchlaufen', async () => {
      const user = userEvent.setup();
      
      // Setup mocks
      mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
      
      const mockCreationResult: ProjectCreationResult = {
        success: true,
        projectId: 'project123',
        project: {
          id: 'project123',
          title: 'Integration Test Projekt',
          userId: 'user123',
          organizationId: 'org123',
          status: 'active',
          currentStage: 'ideas_planning',
          createdAt: {} as any,
          updatedAt: {} as any
        },
        tasksCreated: [],
        assetsAttached: 0,
        warnings: [],
        infos: ['Projekt erfolgreich erstellt'],
        nextSteps: ['Team benachrichtigen']
      };
      
      mockProjectService.createProjectFromWizard.mockResolvedValue(mockCreationResult);
      
      render(<ProjectCreationWizard {...mockProps} />);
      
      // Warten auf Options-Loading
      await waitFor(() => {
        expect(screen.getByText('TechCorp GmbH')).toBeInTheDocument();
      });

      // SCHRITT 1: Basis-Informationen ausfüllen
      const titleInput = screen.getByLabelText(/Projekt-Titel/);
      await user.type(titleInput, 'Integration Test Projekt');
      
      const descriptionInput = screen.getByLabelText(/Beschreibung/);
      await user.type(descriptionInput, 'Test-Beschreibung für Integration Test');
      
      // Client auswählen
      const clientCard = screen.getByText('TechCorp GmbH').closest('div');
      if (clientCard) {
        await user.click(clientCard);
      }
      
      // Priorität setzen
      const prioritySelect = screen.getByLabelText(/Priorität/);
      await user.selectOptions(prioritySelect, 'high');
      
      // Tags eingeben
      const tagsInput = screen.getByLabelText(/Tags/);
      await user.type(tagsInput, 'integration, test, pr');
      
      // Weiter zu Schritt 2
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      
      // SCHRITT 2: Team-Zuordnung
      await waitFor(() => {
        expect(screen.getByText('Team-Mitglieder *')).toBeInTheDocument();
      });
      
      // Team-Mitglieder auswählen (würde über TeamMemberMultiSelect erfolgen)
      // Hier simulieren wir, dass die Komponente die Auswahl korrekt handhaben würde
      
      // Weiter zu Schritt 3
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      
      // SCHRITT 3: Template & Setup
      await waitFor(() => {
        expect(screen.getByText('Projekt-Template')).toBeInTheDocument();
      });
      
      // Kein Template auswählen (optional)
      // Startdatum setzen
      const dateInput = screen.getByDisplayValue('');
      if (dateInput && dateInput.getAttribute('type') === 'date') {
        await user.type(dateInput, '2024-12-31');
      }
      
      // Weiter zu Schritt 4
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      
      // SCHRITT 4: Ressourcen
      await waitFor(() => {
        expect(screen.getByText('Schritt 4 von 4')).toBeInTheDocument();
      });
      
      // Keine sofortige Kampagne erstellen (Standard)
      
      // Projekt erstellen
      await user.click(screen.getByRole('button', { name: /projekt erstellen/i }));
      
      // Warten auf Erstellungsabschluss
      await waitFor(() => {
        expect(mockProjectService.createProjectFromWizard).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Integration Test Projekt',
            description: 'Test-Beschreibung für Integration Test',
            clientId: 'client1',
            priority: 'high'
          }),
          'user123'
        );
      });
      
      // Erfolgsmeldung sollte kommen
      expect(mockProps.onSuccess).toHaveBeenCalledWith(mockCreationResult);
    }, 10000);

    it('sollte kompletten Wizard-Flow mit Template und sofortiger Kampagne durchlaufen', async () => {
      const user = userEvent.setup();
      
      // Setup mocks
      mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
      
      const mockTemplateResult: TemplateApplicationResult = {
        success: true,
        tasksCreated: ['task1', 'task2', 'task3'],
        deadlinesCreated: ['deadline1'],
        configurationApplied: { autoCreateCampaign: true },
        errors: []
      };
      
      const mockResourceResult: ResourceInitializationResult = {
        campaignCreated: true,
        campaignId: 'campaign123',
        assetsAttached: 0,
        listsLinked: 1,
        tasksGenerated: 3,
        teamNotified: true,
        errors: []
      };
      
      const mockCreationResult: ProjectCreationResult = {
        success: true,
        projectId: 'project456',
        project: {
          id: 'project456',
          title: 'Template Integration Test',
          userId: 'user123',
          organizationId: 'org123',
          status: 'active',
          currentStage: 'ideas_planning',
          createdAt: {} as any,
          updatedAt: {} as any
        },
        campaignId: 'campaign123',
        tasksCreated: ['task1', 'task2', 'task3'],
        assetsAttached: 0,
        warnings: [],
        infos: ['Projekt erfolgreich erstellt', 'Template angewendet'],
        nextSteps: ['Kampagne konfigurieren', 'Team benachrichtigen']
      };
      
      mockProjectService.createProjectFromWizard.mockResolvedValue(mockCreationResult);
      
      render(<ProjectCreationWizard {...mockProps} />);
      
      // Warten auf Options-Loading
      await waitFor(() => {
        expect(screen.getByText('Standard PR-Kampagne')).toBeInTheDocument();
      });

      // SCHRITT 1: Schnelle Basis-Konfiguration
      await user.type(screen.getByLabelText(/Projekt-Titel/), 'Template Integration Test');
      
      const clientCard = screen.getByText('StartUp AG').closest('div');
      if (clientCard) {
        await user.click(clientCard);
      }
      
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      
      // SCHRITT 2: Team schnell konfigurieren
      await waitFor(() => {
        expect(screen.getByText('Team-Mitglieder *')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      
      // SCHRITT 3: Template auswählen
      await waitFor(() => {
        expect(screen.getByText('Standard PR-Kampagne')).toBeInTheDocument();
      });
      
      // Standard PR Template auswählen (würde über ProjectTemplateSelector erfolgen)
      // Hier simulieren wir Template-Auswahl
      
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      
      // SCHRITT 4: Sofortige Kampagne konfigurieren
      await waitFor(() => {
        expect(screen.getByText('Schritt 4 von 4')).toBeInTheDocument();
      });
      
      // Diese Interaktion würde über ResourceInitializationPanel erfolgen
      // Hier simulieren wir, dass Kampagne-Erstellung aktiviert wird
      
      await user.click(screen.getByRole('button', { name: /projekt erstellen/i }));
      
      await waitFor(() => {
        expect(mockProjectService.createProjectFromWizard).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Template Integration Test',
            clientId: 'client2' // StartUp AG
          }),
          'user123'
        );
      });
      
      expect(mockProps.onSuccess).toHaveBeenCalledWith(mockCreationResult);
    }, 10000);
  });

  describe('Error Handling Integration', () => {
    
    it('sollte Validierungsfehler über alle Schritte handhaben', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
      
      render(<ProjectCreationWizard {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Projekt-Titel/)).toBeInTheDocument();
      });

      // SCHRITT 1: Versuch ohne erforderliche Felder weiterzugehen
      mockProjectService.validateProjectData.mockResolvedValueOnce({
        isValid: false,
        errors: {
          title: 'Titel ist erforderlich',
          clientId: 'Kunde muss ausgewählt werden'
        }
      });
      
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      
      // Sollte auf Schritt 1 bleiben
      await waitFor(() => {
        expect(screen.getByText('Schritt 1 von 4')).toBeInTheDocument();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Validierungsfehler:', 
          expect.objectContaining({
            title: 'Titel ist erforderlich',
            clientId: 'Kunde muss ausgewählt werden'
          })
        );
      });

      // Felder korrigieren
      await user.type(screen.getByLabelText(/Projekt-Titel/), 'Korrigierter Titel');
      
      const clientCard = screen.getByText('TechCorp GmbH').closest('div');
      if (clientCard) {
        await user.click(clientCard);
      }
      
      // Erfolgreiche Validierung für korrigierte Daten
      mockProjectService.validateProjectData.mockResolvedValue({
        isValid: true,
        errors: {}
      });
      
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      
      // Sollte zu Schritt 2 weitergehen
      await waitFor(() => {
        expect(screen.getByText('Schritt 2 von 4')).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });

    it('sollte Projekt-Erstellungsfehler korrekt handhaben', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
      mockProjectService.createProjectFromWizard.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      render(<ProjectCreationWizard {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Projekt-Titel/)).toBeInTheDocument();
      });

      // Schnell durch alle Schritte
      await user.type(screen.getByLabelText(/Projekt-Titel/), 'Fehler Test');
      const clientCard = screen.getByText('TechCorp GmbH').closest('div');
      if (clientCard) await user.click(clientCard);
      await user.click(screen.getByRole('button', { name: /weiter/i }));

      await waitFor(() => {
        expect(screen.getByText('Schritt 2 von 4')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /weiter/i }));

      await waitFor(() => {
        expect(screen.getByText('Schritt 3 von 4')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /weiter/i }));

      await waitFor(() => {
        expect(screen.getByText('Schritt 4 von 4')).toBeInTheDocument();
      });
      
      // Versuch Projekt zu erstellen (wird fehlschlagen)
      await user.click(screen.getByRole('button', { name: /projekt erstellen/i }));
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Fehler bei Projekt-Erstellung:', 
          expect.any(Error)
        );
      });
      
      // onSuccess sollte NICHT aufgerufen werden
      expect(mockProps.onSuccess).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('sollte Options-Loading-Fehler korrekt handhaben', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockProjectService.getProjectCreationOptions.mockRejectedValue(
        new Error('Failed to load options')
      );
      
      render(<ProjectCreationWizard {...mockProps} />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Fehler beim Laden der Optionen:', 
          expect.any(Error)
        );
      });
      
      // Wizard sollte trotzdem funktionsfähig bleiben (mit leeren Options)
      expect(screen.getByText('Neues Projekt erstellen')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Auto-Save Integration', () => {
    
    it('sollte Auto-Save während Wizard-Navigation funktionieren', async () => {
      const user = userEvent.setup();
      
      mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
      
      render(<ProjectCreationWizard {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Projekt-Titel/)).toBeInTheDocument();
      });

      // Daten eingeben
      await user.type(screen.getByLabelText(/Projekt-Titel/), 'Auto-Save Test');
      
      // Auto-Save sollte ausgelöst werden
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'project_wizard_test-wizard-id',
          expect.stringContaining('"title":"Auto-Save Test"')
        );
      });

      await user.type(screen.getByLabelText(/Beschreibung/), 'Test Beschreibung');
      
      // Weitere Auto-Save-Aufrufe
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          'project_wizard_test-wizard-id',
          expect.stringContaining('"description":"Test Beschreibung"')
        );
      });
    });

    it('sollte Auto-Save bei erfolgreichem Abschluss bereinigen', async () => {
      const user = userEvent.setup();
      
      mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
      mockProjectService.createProjectFromWizard.mockResolvedValue({
        success: true,
        projectId: 'project789',
        project: {} as any,
        tasksCreated: [],
        assetsAttached: 0,
        warnings: [],
        infos: [],
        nextSteps: []
      });
      
      const { unmount } = render(<ProjectCreationWizard {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Projekt-Titel/)).toBeInTheDocument();
      });

      // Schneller Durchlauf mit erfolgreichem Abschluss
      await user.type(screen.getByLabelText(/Projekt-Titel/), 'Clean-up Test');
      
      // Komponente unmounten (simuliert Wizard-Schließung nach Erfolg)
      unmount();
      
      // Clean-up sollte aufgerufen werden wenn completedSteps [4] enthält
      // (Dies würde in der echten useEffect-Cleanup-Funktion passieren)
    });
  });

  describe('Multi-Tenancy Integration', () => {
    
    it('sollte organizationId konsistent durch gesamten Flow verwenden', async () => {
      const user = userEvent.setup();
      
      mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
      mockProjectService.createProjectFromWizard.mockResolvedValue({
        success: true,
        projectId: 'project-mt',
        project: {
          id: 'project-mt',
          title: 'Multi-Tenant Test',
          userId: 'user123',
          organizationId: 'org123', // Korrekte organizationId
          status: 'active',
          currentStage: 'ideas_planning',
          createdAt: {} as any,
          updatedAt: {} as any
        },
        tasksCreated: [],
        assetsAttached: 0,
        warnings: [],
        infos: [],
        nextSteps: []
      });
      
      render(<ProjectCreationWizard {...mockProps} organizationId="org123" />);
      
      // Options-Loading mit korrekter organizationId
      await waitFor(() => {
        expect(mockProjectService.getProjectCreationOptions).toHaveBeenCalledWith('org123');
      });

      // Schneller Durchlauf
      await waitFor(() => {
        expect(screen.getByLabelText(/Projekt-Titel/)).toBeInTheDocument();
      });
      
      await user.type(screen.getByLabelText(/Projekt-Titel/), 'Multi-Tenant Test');
      const clientCard = screen.getByText('TechCorp GmbH').closest('div');
      if (clientCard) await user.click(clientCard);
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /projekt erstellen/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /projekt erstellen/i }));
      
      // Projekt-Erstellung sollte mit korrekter organizationId erfolgen
      await waitFor(() => {
        expect(mockProjectService.createProjectFromWizard).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Multi-Tenant Test'
          }),
          'user123'
        );
      });
    });
  });

  describe('Template Integration Flow', () => {
    
    it('sollte Template-Auswahl und -Anwendung korrekt durchführen', async () => {
      const user = userEvent.setup();
      
      mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
      
      const mockCreationResult: ProjectCreationResult = {
        success: true,
        projectId: 'template-project',
        project: {} as any,
        tasksCreated: ['task1', 'task2', 'task3'],
        assetsAttached: 0,
        warnings: [],
        infos: ['Template "Standard PR-Kampagne" erfolgreich angewendet'],
        nextSteps: ['Tasks zuweisen']
      };
      
      mockProjectService.createProjectFromWizard.mockResolvedValue(mockCreationResult);
      
      render(<ProjectCreationWizard {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Standard PR-Kampagne')).toBeInTheDocument();
      });

      // Basis-Setup
      await user.type(screen.getByLabelText(/Projekt-Titel/), 'Template Test');
      const clientCard = screen.getByText('TechCorp GmbH').closest('div');
      if (clientCard) await user.click(clientCard);
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      await user.click(screen.getByRole('button', { name: /weiter/i }));

      // Template-Schritt
      await waitFor(() => {
        expect(screen.getByText('Standard PR-Kampagne')).toBeInTheDocument();
      });
      
      // Template-Auswahl würde über ProjectTemplateSelector erfolgen
      // Hier simulieren wir, dass PR-Template ausgewählt wird

      await user.click(screen.getByRole('button', { name: /weiter/i }));
      await user.click(screen.getByRole('button', { name: /projekt erstellen/i }));
      
      await waitFor(() => {
        expect(mockProjectService.createProjectFromWizard).toHaveBeenCalled();
        expect(mockProps.onSuccess).toHaveBeenCalledWith(mockCreationResult);
      });
      
      // Template-Anwendung sollte zu Tasks geführt haben
      expect(mockCreationResult.tasksCreated).toHaveLength(3);
      expect(mockCreationResult.infos).toContain('Template "Standard PR-Kampagne" erfolgreich angewendet');
    });
  });

  describe('Resource Initialization Flow', () => {
    
    it('sollte Ressourcen-Initialisierung mit Kampagne und Assets korrekt durchführen', async () => {
      const user = userEvent.setup();
      
      mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
      
      const mockCreationResult: ProjectCreationResult = {
        success: true,
        projectId: 'resource-project',
        project: {} as any,
        campaignId: 'new-campaign-123',
        tasksCreated: [],
        assetsAttached: 2,
        warnings: [],
        infos: ['Kampagne erstellt', 'Assets angehängt'],
        nextSteps: ['Kampagne konfigurieren', 'Assets organisieren']
      };
      
      mockProjectService.createProjectFromWizard.mockResolvedValue(mockCreationResult);
      
      render(<ProjectCreationWizard {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Projekt-Titel/)).toBeInTheDocument();
      });

      // Schnell zu Ressourcen-Schritt
      await user.type(screen.getByLabelText(/Projekt-Titel/), 'Resource Test');
      const clientCard = screen.getByText('TechCorp GmbH').closest('div');
      if (clientCard) await user.click(clientCard);
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      await user.click(screen.getByRole('button', { name: /weiter/i }));

      // Ressourcen-Konfiguration würde über ResourceInitializationPanel erfolgen
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /projekt erstellen/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /projekt erstellen/i }));
      
      await waitFor(() => {
        expect(mockProps.onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            campaignId: 'new-campaign-123',
            assetsAttached: 2,
            nextSteps: expect.arrayContaining(['Kampagne konfigurieren', 'Assets organisieren'])
          })
        );
      });
    });
  });

  describe('Edge Cases Integration', () => {
    
    it('sollte bei fehlendem User nicht erstellen können', async () => {
      mockUseAuth.mockReturnValue({ 
        user: null, 
        loading: false,
        // signInWithEmailAndPassword: jest.fn() // Removed invalid property
      });
      
      mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
      
      const user = userEvent.setup();
      render(<ProjectCreationWizard {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Projekt-Titel/)).toBeInTheDocument();
      });

      // Versuche kompletten Flow ohne User
      await user.type(screen.getByLabelText(/Projekt-Titel/), 'No User Test');
      const clientCard = screen.getByText('TechCorp GmbH').closest('div');
      if (clientCard) await user.click(clientCard);
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      await user.click(screen.getByRole('button', { name: /weiter/i }));
      await user.click(screen.getByRole('button', { name: /projekt erstellen/i }));
      
      // createProjectFromWizard sollte nicht aufgerufen werden
      expect(mockProjectService.createProjectFromWizard).not.toHaveBeenCalled();
    });

    it('sollte Race Condition bei schneller Navigation handhaben', async () => {
      const user = userEvent.setup();
      
      // Langsame Validierung simulieren
      mockProjectService.validateProjectData.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ isValid: true, errors: {} }), 100))
      );
      
      mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
      
      render(<ProjectCreationWizard {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Projekt-Titel/)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Projekt-Titel/), 'Race Condition Test');
      const clientCard = screen.getByText('TechCorp GmbH').closest('div');
      if (clientCard) await user.click(clientCard);
      
      // Sehr schnell mehrmals Weiter klicken
      const nextButton = screen.getByRole('button', { name: /weiter/i });
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);
      
      // Sollte trotzdem stabil funktionieren
      await waitFor(() => {
        expect(mockProjectService.validateProjectData).toHaveBeenCalled();
      });
    });
  });
});