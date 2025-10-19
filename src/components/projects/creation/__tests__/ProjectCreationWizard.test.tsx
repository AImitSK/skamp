// src/components/projects/creation/__tests__/ProjectCreationWizard.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCreationWizard } from '../ProjectCreationWizard';
import { projectService } from '@/lib/firebase/project-service';
import { tagsService } from '@/lib/firebase/tags-service';
import { useAuth } from '@/context/AuthContext';

// Mock dependencies
jest.mock('@/lib/firebase/project-service');
jest.mock('@/lib/firebase/tags-service');
jest.mock('@/context/AuthContext');

// Mock Step Components
jest.mock('../steps', () => ({
  ProjectStep: ({ formData, onUpdate }: any) => (
    <div data-testid="project-step">
      <input
        aria-label="Projekt-Titel"
        value={formData.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
      />
      <textarea
        aria-label="Beschreibung"
        value={formData.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
      />
      <select
        aria-label="Priorität"
        value={formData.priority}
        onChange={(e) => onUpdate({ priority: e.target.value })}
      >
        <option value="low">Niedrig</option>
        <option value="medium">Mittel</option>
        <option value="high">Hoch</option>
        <option value="urgent">Dringend</option>
      </select>
    </div>
  ),
  ClientStep: ({ formData, onUpdate }: any) => (
    <div data-testid="client-step">
      <select
        aria-label="Kunde auswählen"
        value={formData.clientId}
        onChange={(e) => onUpdate({ clientId: e.target.value })}
      >
        <option value="">-- Bitte wählen --</option>
        <option value="client-1">Test Client 1</option>
        <option value="client-2">Test Client 2</option>
      </select>
    </div>
  ),
  TeamStep: ({ formData, onUpdate }: any) => (
    <div data-testid="team-step">
      <div>Team Members: {formData.assignedTeamMembers.join(', ')}</div>
      <button onClick={() => onUpdate({ assignedTeamMembers: ['member-1'] })}>
        Add Member
      </button>
    </div>
  )
}));

// Mock CreationSuccessDashboard
jest.mock('../CreationSuccessDashboard', () => ({
  CreationSuccessDashboard: ({ projectId }: any) => (
    <div data-testid="success-dashboard">Project created: {projectId}</div>
  )
}));

const mockProjectService = projectService as jest.Mocked<typeof projectService>;
const mockTagsService = tagsService as jest.Mocked<typeof tagsService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('ProjectCreationWizard', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
    organizationId: 'org123'
  };

  const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    displayName: 'Test User'
  };

  const mockCreationOptions = {
    availableClients: [
      { id: 'client-1', name: 'Test Client 1', type: 'customer' },
      { id: 'client-2', name: 'Test Client 2', type: 'publisher' }
    ],
    availableTeamMembers: [
      { id: 'member-1', displayName: 'Test User 1', role: 'Admin', userId: 'user-1' },
      { id: 'member-2', displayName: 'Test User 2', role: 'Editor', userId: 'user-2' }
    ],
    availableTemplates: [],
    availableDistributionLists: [],
    availableAssets: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser as any,
      loading: false
    });
    mockProjectService.getProjectCreationOptions.mockResolvedValue(mockCreationOptions);
    mockTagsService.getAll.mockResolvedValue([]);
  });

  describe('Wizard Initialization', () => {
    it('sollte nicht rendern wenn isOpen false', () => {
      render(<ProjectCreationWizard {...mockProps} isOpen={false} />);

      expect(screen.queryByText('Neues Projekt erstellen')).not.toBeInTheDocument();
    });

    it('sollte Wizard-Header rendern', () => {
      render(<ProjectCreationWizard {...mockProps} />);

      expect(screen.getByText('Neues Projekt erstellen')).toBeInTheDocument();
    });

    it('sollte Tab-Navigation mit 3 Steps rendern', async () => {
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Projekt')).toBeInTheDocument();
        expect(screen.getByText('Kunde')).toBeInTheDocument();
        expect(screen.getByText('Team')).toBeInTheDocument();
      });
    });

    it('sollte Creation Options beim Öffnen laden', async () => {
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(mockProjectService.getProjectCreationOptions).toHaveBeenCalledWith('org123');
      });
    });

    it('sollte mit Schritt 1 starten', async () => {
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('project-step')).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Step Navigation', () => {
    it('sollte zu Step 2 navigieren nach gültigem Step 1', async () => {
      const user = userEvent.setup();
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('project-step')).toBeInTheDocument();
      });

      // Fill Step 1 with valid data (min 3 chars title)
      const titleInput = screen.getByLabelText(/Projekt-Titel/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Test Projekt');

      // Click Weiter
      const weiterButton = screen.getByRole('button', { name: /Weiter/i });
      await user.click(weiterButton);

      // Should show Step 2
      await waitFor(() => {
        expect(screen.getByTestId('client-step')).toBeInTheDocument();
      });
    });

    it('sollte Zurück-Button NICHT auf Step 1 anzeigen', async () => {
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('project-step')).toBeInTheDocument();
      });

      // No Zurück button on step 1
      expect(screen.queryByRole('button', { name: /Zurück/i })).not.toBeInTheDocument();
    });
  });

  describe('Step Validation', () => {
    it('sollte Weiter-Button disablen wenn Titel zu kurz (< 3 Zeichen)', async () => {
      const user = userEvent.setup();
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('project-step')).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/Projekt-Titel/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'AB'); // Only 2 chars

      const weiterButton = screen.getByRole('button', { name: /Weiter/i });
      expect(weiterButton).toBeDisabled();
    });

    it('sollte Weiter-Button enablen wenn Titel gültig (>= 3 Zeichen)', async () => {
      const user = userEvent.setup();
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('project-step')).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/Projekt-Titel/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'ABC'); // 3 chars - valid

      const weiterButton = screen.getByRole('button', { name: /Weiter/i });
      expect(weiterButton).not.toBeDisabled();
    });

    it('sollte Weiter-Button default disablen wenn Titel leer', async () => {
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('project-step')).toBeInTheDocument();
      });

      const weiterButton = screen.getByRole('button', { name: /Weiter/i });
      expect(weiterButton).toBeDisabled();
    });

    it('sollte Abbrechen-Button immer enablen', async () => {
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('project-step')).toBeInTheDocument();
      });

      const abbrechenButton = screen.getByRole('button', { name: /Abbrechen/i });
      expect(abbrechenButton).not.toBeDisabled();
    });
  });

  describe('Form Data Management', () => {
    it('sollte alle Form-Felder korrekt initialisieren', async () => {
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('project-step')).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/Projekt-Titel/i) as HTMLInputElement;
      const descInput = screen.getByLabelText(/Beschreibung/i) as HTMLTextAreaElement;
      const prioritySelect = screen.getByLabelText(/Priorität/i) as HTMLSelectElement;

      expect(titleInput.value).toBe('');
      expect(descInput.value).toBe('');
      expect(prioritySelect.value).toBe('medium');
    });

    it('sollte Priorität-Änderungen propagieren', async () => {
      const user = userEvent.setup();
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('project-step')).toBeInTheDocument();
      });

      const prioritySelect = screen.getByLabelText(/Priorität/i);
      await user.selectOptions(prioritySelect, 'high');

      const prioritySelectAfter = screen.getByLabelText(/Priorität/i) as HTMLSelectElement;
      expect(prioritySelectAfter.value).toBe('high');
    });

    it('sollte Client-Selection auf Step 2 anzeigen', async () => {
      const user = userEvent.setup();
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('project-step')).toBeInTheDocument();
      });

      // Navigate to Step 2
      const titleInput = screen.getByLabelText(/Projekt-Titel/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Test Projekt');

      const weiterButton = screen.getByRole('button', { name: /Weiter/i });
      await user.click(weiterButton);

      await waitFor(() => {
        expect(screen.getByTestId('client-step')).toBeInTheDocument();
      });

      // Client selection should be visible
      expect(screen.getByLabelText(/Kunde auswählen/i)).toBeInTheDocument();
    });
  });

  describe('Close Behavior', () => {
    it('sollte onClose aufrufen beim Klick auf Abbrechen', async () => {
      const user = userEvent.setup();
      render(<ProjectCreationWizard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('project-step')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /Abbrechen/i });
      await user.click(closeButton);

      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });
});
