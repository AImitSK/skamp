// src/__tests__/components/projects/ProjectSelector-pipeline.test.tsx - ✅ Plan 2/9: ProjectSelector Pipeline Tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { projectService } from '@/lib/firebase/project-service';
import { Project } from '@/types/project';
import { Timestamp } from 'firebase/firestore';

// Mock Project Service
jest.mock('@/lib/firebase/project-service', () => ({
  projectService: {
    getActiveProjects: jest.fn(),
    getProjectsByClient: jest.fn()
  }
}));

// Cast Mock
const mockProjectService = projectService as jest.Mocked<typeof projectService>;

describe('ProjectSelector - Plan 2/9: Pipeline Project-Selector Tests', () => {
  const mockOrganizationId = 'org-123';
  const mockClientId = 'client-456';
  const mockOnProjectSelect = jest.fn();

  const mockProject1: Project = {
    id: 'project-1',
    title: 'Alpha Projekt',
    organizationId: mockOrganizationId,
    userId: 'creator-1',
    status: 'active',
    currentStage: 'creation',
    customer: {
      id: mockClientId,
      name: 'Alpha Client GmbH',
      email: 'contact@alpha-client.de'
    },
    linkedCampaigns: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockProject2: Project = {
    id: 'project-2',
    title: 'Beta Projekt',
    organizationId: mockOrganizationId,
    userId: 'creator-2',
    status: 'active',
    currentStage: 'review',
    customer: {
      id: mockClientId,
      name: 'Alpha Client GmbH',
      email: 'contact@alpha-client.de'
    },
    linkedCampaigns: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockProjectWithoutCustomer: Project = {
    id: 'project-no-customer',
    title: 'Projekt ohne Kunde',
    organizationId: mockOrganizationId,
    userId: 'creator-3',
    status: 'active',
    currentStage: 'approval',
    // customer: undefined, // Kein Kunde
    linkedCampaigns: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockProjectDifferentClient: Project = {
    id: 'project-different-client',
    title: 'Projekt für anderen Kunden',
    organizationId: mockOrganizationId,
    userId: 'creator-1',
    status: 'active',
    currentStage: 'creation',
    customer: {
      id: 'different-client-789',
      name: 'Beta Client AG',
      email: 'info@beta-client.com'
    },
    linkedCampaigns: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default Mock Setup
    mockProjectService.getActiveProjects.mockResolvedValue([
      mockProject1, 
      mockProject2, 
      mockProjectWithoutCustomer, 
      mockProjectDifferentClient
    ]);
    
    mockProjectService.getProjectsByClient.mockResolvedValue([
      mockProject1, 
      mockProject2
    ]);
  });

  describe('✅ Plan 2/9: Client-Filter Support', () => {
    it('sollte getProjectsByClient aufrufen wenn clientId übergeben', async () => {
      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(mockProjectService.getProjectsByClient).toHaveBeenCalledWith(
          mockOrganizationId,
          mockClientId
        );
      });

      expect(mockProjectService.getActiveProjects).not.toHaveBeenCalled();
    });

    it('sollte getActiveProjects aufrufen wenn keine clientId übergeben', async () => {
      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          // clientId nicht gesetzt
        />
      );

      await waitFor(() => {
        expect(mockProjectService.getActiveProjects).toHaveBeenCalledWith(mockOrganizationId);
      });

      expect(mockProjectService.getProjectsByClient).not.toHaveBeenCalled();
    });

    it('sollte bei clientId-Änderung neue Projekte laden', async () => {
      const { rerender } = render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(mockProjectService.getProjectsByClient).toHaveBeenCalledWith(
          mockOrganizationId,
          mockClientId
        );
      });

      // Client-ID ändern
      const newClientId = 'new-client-789';
      mockProjectService.getProjectsByClient.mockResolvedValue([mockProjectDifferentClient]);

      rerender(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={newClientId}
        />
      );

      await waitFor(() => {
        expect(mockProjectService.getProjectsByClient).toHaveBeenCalledWith(
          mockOrganizationId,
          newClientId
        );
      });
    });

    it('sollte bei organizationId-Änderung neue Projekte laden', async () => {
      const { rerender } = render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(mockProjectService.getProjectsByClient).toHaveBeenCalledTimes(1);
      });

      const newOrgId = 'new-org-789';

      rerender(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={newOrgId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(mockProjectService.getProjectsByClient).toHaveBeenCalledWith(
          newOrgId,
          mockClientId
        );
      });
    });
  });

  describe('Projekt-Auswahl und Callback-Handling', () => {
    it('sollte Projekte in Select-Dropdown anzeigen', async () => {
      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Projekte sollten als Optionen verfügbar sein
      expect(screen.getByRole('option', { name: 'Kein Projekt zuordnen' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Alpha Projekt.*Alpha Client GmbH/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Beta Projekt.*Alpha Client GmbH/ })).toBeInTheDocument();
    });

    it('sollte Projekt mit Kunde in Select-Option anzeigen', async () => {
      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      expect(select).toContainHTML('Alpha Projekt (Alpha Client GmbH)');
      expect(select).toContainHTML('Beta Projekt (Alpha Client GmbH)');
    });

    it('sollte Projekt ohne Kunde korrekt anzeigen', async () => {
      mockProjectService.getActiveProjects.mockResolvedValue([mockProjectWithoutCustomer]);

      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          // Kein clientId -> getActiveProjects
        />
      );

      await waitFor(() => {
        const option = screen.getByRole('option', { name: 'Projekt ohne Kunde' });
        expect(option).toBeInTheDocument();
      });
    });

    it('sollte onProjectSelect bei Projekt-Auswahl aufrufen', async () => {
      const user = userEvent.setup();

      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'project-1');

      expect(mockOnProjectSelect).toHaveBeenCalledWith('project-1', mockProject1);
    });

    it('sollte onProjectSelect mit leerem Projekt bei "Kein Projekt" aufrufen', async () => {
      const user = userEvent.setup();

      render(
        <ProjectSelector
          selectedProjectId="project-1" // Initial ausgewählt
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, ''); // "Kein Projekt zuordnen"

      expect(mockOnProjectSelect).toHaveBeenCalledWith('', {});
    });

    it('sollte selectedProjectId korrekt im Select anzeigen', async () => {
      render(
        <ProjectSelector
          selectedProjectId="project-2"
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('project-2');
      });
    });
  });

  describe('✅ Plan 2/9: Interne PDF-Info-Box', () => {
    it('sollte Projekt-Integration Info-Box bei ausgewähltem Projekt anzeigen', async () => {
      render(
        <ProjectSelector
          selectedProjectId="project-1"
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('✅ Projekt-Integration aktiviert')).toBeInTheDocument();
        expect(screen.getByText(/Diese Kampagne wird dem ausgewählten Projekt zugeordnet/)).toBeInTheDocument();
        expect(screen.getByText(/Erstellung.*verwaltet/)).toBeInTheDocument();
      });
    });

    it('sollte Interne PDF-Aktivierung Info in Info-Box anzeigen', async () => {
      render(
        <ProjectSelector
          selectedProjectId="project-1"
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Interne PDFs aktiviert:')).toBeInTheDocument();
        expect(screen.getByText(/Bei Speicherung werden automatisch interne PDF-Versionen im Projekt-Ordner generiert/)).toBeInTheDocument();
      });
    });

    it('sollte Kunde in Info-Box anzeigen wenn verfügbar', async () => {
      render(
        <ProjectSelector
          selectedProjectId="project-1"
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Kunde: Alpha Client GmbH')).toBeInTheDocument();
      });
    });

    it('sollte KEINE Info-Box anzeigen wenn kein Projekt ausgewählt', async () => {
      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      expect(screen.queryByText('✅ Projekt-Integration aktiviert')).not.toBeInTheDocument();
    });

    it('sollte Info-Box ausblenden wenn Projekt abgewählt wird', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <ProjectSelector
          selectedProjectId="project-1"
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('✅ Projekt-Integration aktiviert')).toBeInTheDocument();
      });

      rerender(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      expect(screen.queryByText('✅ Projekt-Integration aktiviert')).not.toBeInTheDocument();
    });

    it('sollte Kunden-Info NICHT anzeigen wenn Projekt keinen Kunden hat', async () => {
      mockProjectService.getActiveProjects.mockResolvedValue([mockProjectWithoutCustomer]);

      render(
        <ProjectSelector
          selectedProjectId="project-no-customer"
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('✅ Projekt-Integration aktiviert')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Kunde:/)).not.toBeInTheDocument();
    });
  });

  describe('Loading und Error States', () => {
    it('sollte Loading-State während Projekt-Laden anzeigen', async () => {
      // Mock langsame API-Response
      mockProjectService.getActiveProjects.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
        />
      );

      // Loading-Skeleton sollte sichtbar sein
      expect(screen.getByTestId(/loading/i) || document.querySelector('.animate-pulse')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });

    it('sollte Error-Recovery durchführen bei Service-Fehlern', async () => {
      mockProjectService.getActiveProjects.mockRejectedValue(new Error('Service error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Error sollte geloggt werden, aber Component funktioniert
      expect(consoleSpy).toHaveBeenCalledWith('Error loading projects:', expect.any(Error));
      
      // Nur "Kein Projekt" Option sollte verfügbar sein
      expect(screen.getByRole('option', { name: 'Kein Projekt zuordnen' })).toBeInTheDocument();
    });

    it('sollte "Keine Projekte" Nachricht bei leerem Result anzeigen', async () => {
      mockProjectService.getActiveProjects.mockResolvedValue([]);

      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Keine aktiven Projekte gefunden.')).toBeInTheDocument();
      });
    });

    it('sollte Client-spezifische "Keine Projekte" Nachricht anzeigen', async () => {
      mockProjectService.getProjectsByClient.mockResolvedValue([]);

      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Keine aktiven Projekte für diesen Kunden gefunden.')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-Population und Default-Verhalten', () => {
    it('sollte erstes Projekt NICHT automatisch auswählen', async () => {
      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe(''); // "Kein Projekt zuordnen" bleibt ausgewählt
      });

      expect(mockOnProjectSelect).not.toHaveBeenCalled();
    });

    it('sollte bei nur einem verfügbaren Projekt NICHT automatisch auswählen', async () => {
      mockProjectService.getProjectsByClient.mockResolvedValue([mockProject1]);

      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('');
      });

      expect(mockOnProjectSelect).not.toHaveBeenCalled();
    });

    it('sollte externe selectedProjectId korrekt handhaben auch wenn nicht in Liste', async () => {
      // selectedProjectId ist gesetzt, aber Projekt nicht in geladener Liste
      render(
        <ProjectSelector
          selectedProjectId="non-existent-project"
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('non-existent-project'); // Select zeigt Wert trotzdem an
      });
    });
  });

  describe('UI/UX Elemente', () => {
    it('sollte korrekte Icons und Labels anzeigen', async () => {
      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Projekt-Verknüpfung (optional)')).toBeInTheDocument();
      });

      // LinkIcon sollte vorhanden sein (schwer zu testen ohne test-ids)
      const linkIcons = document.querySelectorAll('svg');
      expect(linkIcons.length).toBeGreaterThan(0);
    });

    it('sollte Info-Box mit korrekten Styling-Classes rendern', async () => {
      render(
        <ProjectSelector
          selectedProjectId="project-1"
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        const infoBox = screen.getByText('✅ Projekt-Integration aktiviert').closest('div');
        expect(infoBox).toHaveClass('bg-blue-50', 'border-blue-200', 'rounded-lg');
      });
    });

    it('sollte Select-Element mit korrekten Styling-Classes haben', async () => {
      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toHaveClass(
          'block',
          'w-full',
          'rounded-lg',
          'border',
          'border-zinc-950/10',
          'bg-white',
          'py-2',
          'px-3'
        );
      });
    });
  });

  describe('Performance und Edge Cases', () => {
    it('sollte große Anzahl von Projekten effizient handhaben', async () => {
      const manyProjects = Array.from({ length: 100 }, (_, i) => ({
        ...mockProject1,
        id: `project-${i}`,
        title: `Projekt ${i}`
      }));

      mockProjectService.getActiveProjects.mockResolvedValue(manyProjects);

      const startTime = Date.now();
      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000); // Unter 2 Sekunden

      // Alle Projekte sollten als Optionen verfügbar sein
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(101); // 100 Projekte + "Kein Projekt"
    });

    it('sollte Unicode-Zeichen in Projekt-Namen korrekt handhaben', async () => {
      const unicodeProject = {
        ...mockProject1,
        title: '🚀 Projekt für Émile Café & Müller AG',
        customer: {
          ...mockProject1.customer!,
          name: 'Café & Bäckerei "Zum Glück" GmbH'
        }
      };

      mockProjectService.getActiveProjects.mockResolvedValue([unicodeProject]);

      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('option', { 
          name: /🚀 Projekt für Émile Café & Müller AG.*Café & Bäckerei/ 
        })).toBeInTheDocument();
      });
    });

    it('sollte sehr lange Projekt-Namen truncaten oder handhaben', async () => {
      const longTitleProject = {
        ...mockProject1,
        title: 'Sehr langer Projekt-Titel '.repeat(20) + ' Ende',
        customer: {
          ...mockProject1.customer!,
          name: 'Sehr langer Kunden-Name '.repeat(10) + ' GmbH'
        }
      };

      mockProjectService.getActiveProjects.mockResolvedValue([longTitleProject]);

      render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
        
        // Option sollte verfügbar sein, auch mit langem Namen
        const option = screen.getByRole('option', { name: new RegExp(longTitleProject.title) });
        expect(option).toBeInTheDocument();
      });
    });

    it('sollte Memory-Leaks durch useEffect cleanup vermeiden', async () => {
      const { unmount } = render(
        <ProjectSelector
          selectedProjectId=""
          onProjectSelect={mockOnProjectSelect}
          organizationId={mockOrganizationId}
          clientId={mockClientId}
        />
      );

      // Component unmounten
      unmount();

      // Sollte keine weiteren Service-Calls nach unmount auslösen
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const initialCallCount = mockProjectService.getProjectsByClient.mock.calls.length;
      
      // Warten auf potentielle Memory-Leak Calls
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockProjectService.getProjectsByClient.mock.calls.length).toBe(initialCallCount);
    });
  });
});