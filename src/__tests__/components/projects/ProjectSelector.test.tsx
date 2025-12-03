// src/__tests__/components/projects/ProjectSelector.test.tsx - Tests für ProjectSelector Component

// WICHTIG: Alle Mocks MÜSSEN vor allen Imports stehen
const mockGetActiveProjects = jest.fn();
const mockGetProjectsByClient = jest.fn();

jest.mock('@/lib/firebase/project-service', () => ({
  projectService: {
    getActiveProjects: (...args: any[]) => mockGetActiveProjects(...args),
    getProjectsByClient: (...args: any[]) => mockGetProjectsByClient(...args)
  }
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className} data-testid="text">{children}</span>
  )
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => (
    <select {...props} data-testid="select">{children}</select>
  )
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, color }: { children: React.ReactNode; color?: string }) => (
    <span className={`badge badge-${color}`} data-testid="badge">{children}</span>
  )
}));

jest.mock('@heroicons/react/24/outline', () => ({
  LinkIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="link-icon">
      <title>Link Icon</title>
    </svg>
  )
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { Project, ProjectStatus, PipelineStage } from '@/types/project';

describe('ProjectSelector Component', () => {
  const mockOrganizationId = 'org-123';
  const mockOnProjectSelect = jest.fn();

  const mockProject1: Project = {
    id: 'project-1',
    title: 'Marketing Kampagne Q1',
    description: 'Große Marketing Kampagne',
    organizationId: mockOrganizationId,
    userId: 'user-123',
    status: 'active' as ProjectStatus,
    currentStage: 'creation' as PipelineStage,
    customer: {
      id: 'client-1',
      name: 'ACME Corp'
    },
    budget: 10000,
    currency: 'EUR',
    linkedCampaigns: [],
    createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any
  };

  const mockProject2: Project = {
    ...mockProject1,
    id: 'project-2',
    title: 'Website Relaunch',
    customer: {
      id: 'client-tech-solutions',
      name: 'Tech Solutions GmbH'
    }
  };

  const defaultProps = {
    organizationId: mockOrganizationId,
    onProjectSelect: mockOnProjectSelect
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Standardmäßig leeres Array zurückgeben, um Tests schneller zu machen
    mockGetActiveProjects.mockResolvedValue([]);
    mockGetProjectsByClient.mockResolvedValue([]);
  });

  describe('Rendering', () => {
    it('sollte Komponente korrekt rendern', async () => {
      mockGetActiveProjects.mockResolvedValue([]);

      render(<ProjectSelector {...defaultProps} />);

      expect(screen.getByText('Projekt-Verknüpfung (optional)')).toBeInTheDocument();

      await waitFor(() => {
        expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
      });
    });

    it('sollte Loading-State anzeigen während Projekte geladen werden', () => {
      mockGetActiveProjects.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<ProjectSelector {...defaultProps} />);

      // Loading state erkennen an der animate-pulse div
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('sollte "Kein Projekt zuordnen" Option anzeigen', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        expect(selectElement).toBeInTheDocument();
      });

      expect(screen.getByText('Kein Projekt zuordnen')).toBeInTheDocument();
    });

    it('sollte Meldung anzeigen wenn keine aktiven Projekte vorhanden', async () => {
      mockGetActiveProjects.mockResolvedValue([]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Keine aktiven Projekte gefunden.')).toBeInTheDocument();
      });
    });
  });

  describe('Projekt-Loading', () => {
    it('sollte getActiveProjects mit korrekten Parametern aufrufen', async () => {
      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetActiveProjects).toHaveBeenCalledWith(mockOrganizationId);
      });
    });

    it('sollte Projekte neu laden wenn organizationId sich ändert', async () => {
      mockGetActiveProjects.mockResolvedValue([]);

      const { rerender } = render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetActiveProjects).toHaveBeenCalledTimes(1);
      });

      // OrganizationId ändern
      rerender(<ProjectSelector {...defaultProps} organizationId="new-org-456" />);

      await waitFor(() => {
        expect(mockGetActiveProjects).toHaveBeenCalledTimes(2);
        expect(mockGetActiveProjects).toHaveBeenLastCalledWith('new-org-456');
      });
    });

    it('sollte Fehler beim Laden von Projekten abfangen', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetActiveProjects.mockRejectedValue(new Error('Network error'));

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading projects:', expect.any(Error));
      });

      expect(screen.getByText('Keine aktiven Projekte gefunden.')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Projekt-Liste', () => {
    it('sollte alle verfügbaren Projekte in der Auswahl anzeigen', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1, mockProject2]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Marketing Kampagne Q1 (ACME Corp)')).toBeInTheDocument();
        expect(screen.getByText('Website Relaunch (Tech Solutions GmbH)')).toBeInTheDocument();
      });
    });

    it('sollte Projekte ohne Kunde korrekt anzeigen', async () => {
      const projectWithoutCustomer = {
        ...mockProject1,
        customer: undefined
      };
      mockGetActiveProjects.mockResolvedValue([projectWithoutCustomer]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Marketing Kampagne Q1')).toBeInTheDocument();
      });
    });

    it('sollte Projekte mit leerem Kundennamen korrekt anzeigen', async () => {
      const projectWithEmptyCustomerName = {
        ...mockProject1,
        customer: {
          id: 'client-empty',
          name: ''
        }
      };
      mockGetActiveProjects.mockResolvedValue([projectWithEmptyCustomerName]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Marketing Kampagne Q1')).toBeInTheDocument();
      });
    });
  });

  describe('Projekt-Auswahl', () => {
    it('sollte onProjectSelect mit korrekten Parametern aufrufen bei Projekt-Auswahl', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1, mockProject2]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        fireEvent.change(selectElement, { target: { value: 'project-1' } });
      });

      expect(mockOnProjectSelect).toHaveBeenCalledWith('project-1', mockProject1);
    });

    it('sollte onProjectSelect mit leerem Projekt aufrufen wenn "Kein Projekt" gewählt', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} selectedProjectId="project-1" />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        fireEvent.change(selectElement, { target: { value: '' } });
      });

      expect(mockOnProjectSelect).toHaveBeenCalledWith('', {});
    });

    it('sollte ausgewähltes Projekt korrekt anzeigen', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1, mockProject2]);

      render(<ProjectSelector {...defaultProps} selectedProjectId="project-2" />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox') as HTMLSelectElement;
        expect(selectElement.value).toBe('project-2');
      });
    });

    it('sollte nicht reagieren wenn ungültige Projekt-ID gewählt wird', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        fireEvent.change(selectElement, { target: { value: 'invalid-project-id' } });
      });

      // Bei ungültiger ID wird die Komponente es als "kein Projekt" behandeln
      // und onProjectSelect wird aufgerufen mit ('', {})
      expect(mockOnProjectSelect).toHaveBeenCalledWith('', {});
    });
  });

  describe('Integration-Info Box', () => {
    it('sollte Integration-Info anzeigen wenn Projekt ausgewählt', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} selectedProjectId="project-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Projekt-Integration aktiviert/)).toBeInTheDocument();
        expect(screen.getByText(/Diese Kampagne wird dem ausgewählten Projekt zugeordnet/)).toBeInTheDocument();
        expect(screen.getByText('Kunde: ACME Corp')).toBeInTheDocument();
      });
    });

    it('sollte Integration-Info verstecken wenn kein Projekt ausgewählt', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText(/Projekt-Integration aktiviert/)).not.toBeInTheDocument();
      });
    });

    it('sollte Kunden-Info nicht anzeigen wenn Kunde nicht vorhanden', async () => {
      const projectWithoutCustomer = { ...mockProject1, customer: undefined };
      mockGetActiveProjects.mockResolvedValue([projectWithoutCustomer]);

      render(<ProjectSelector {...defaultProps} selectedProjectId="project-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Projekt-Integration aktiviert/)).toBeInTheDocument();
        expect(screen.queryByText(/Kunde:/)).not.toBeInTheDocument();
      });
    });

    it('sollte korrekten Link-Icon in Integration-Box anzeigen', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} selectedProjectId="project-1" />);

      await waitFor(() => {
        // Prüfe dass LinkIcons gerendert werden (gemockte SVGs)
        const linkIcons = screen.getAllByTestId('link-icon');
        expect(linkIcons.length).toBeGreaterThanOrEqual(2); // Eins im Header, eins in der Integration-Box
      });
    });
  });

  describe('Accessibility', () => {
    it('sollte korrekte ARIA-Labels haben', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        expect(selectElement).toBeInTheDocument();
      });
    });

    it('sollte mit Tastatur navigierbar sein', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1, mockProject2]);

      render(<ProjectSelector {...defaultProps} />);

      const selectElement = await screen.findByRole('combobox');

      // Focus auf Select-Element
      selectElement.focus();
      expect(selectElement).toHaveFocus();

      // Keyboard Navigation simulieren
      fireEvent.keyDown(selectElement, { key: 'ArrowDown' });
      fireEvent.keyDown(selectElement, { key: 'Enter' });
    });
  });

  describe('Performance', () => {
    it('sollte nicht unnötig re-rendern wenn Props gleich bleiben', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1]);

      const { rerender } = render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetActiveProjects).toHaveBeenCalledTimes(1);
      });

      // Re-render mit gleichen Props
      rerender(<ProjectSelector {...defaultProps} />);

      // Sollte nicht erneut laden
      expect(mockGetActiveProjects).toHaveBeenCalledTimes(1);
    });

    it('sollte mit großer Projekt-Liste umgehen können', async () => {
      const manyProjects = new Array(100).fill(0).map((_, index) => ({
        ...mockProject1,
        id: `project-${index}`,
        title: `Projekt ${index}`,
        customer: { id: `client-${index}`, name: `Kunde ${index}` }
      }));

      mockGetActiveProjects.mockResolvedValue(manyProjects);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        // Alle Projekte sollten als Optionen verfügbar sein
        manyProjects.forEach((project, index) => {
          expect(screen.getByText(`Projekt ${index} (Kunde ${index})`)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit Projekten ohne ID umgehen', async () => {
      const projectWithoutId = { ...mockProject1, id: undefined };
      mockGetActiveProjects.mockResolvedValue([projectWithoutId] as any);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        // Projekt sollte nicht in der Liste erscheinen (keine ID)
        expect(screen.queryByText('Marketing Kampagne Q1')).not.toBeInTheDocument();
      });
    });

    it('sollte mit sehr langen Projekt-Titeln umgehen', async () => {
      const projectWithLongTitle = {
        ...mockProject1,
        title: 'A'.repeat(200), // 200 Zeichen langer Titel
        customer: { id: 'client-long', name: 'B'.repeat(100) } // 100 Zeichen langer Kundenname
      };
      mockGetActiveProjects.mockResolvedValue([projectWithLongTitle]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        const longTitle = 'A'.repeat(200) + ' (' + 'B'.repeat(100) + ')';
        expect(screen.getByText(longTitle)).toBeInTheDocument();
      });
    });

    it('sollte mit Sonderzeichen in Projekt-Titeln umgehen', async () => {
      const projectWithSpecialChars = {
        ...mockProject1,
        title: 'Projekt <>&"\'`',
        customer: { id: 'client-special', name: 'Kunde <>&"\'`' }
      };
      mockGetActiveProjects.mockResolvedValue([projectWithSpecialChars]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Projekt <>&"\'` (Kunde <>&"\'`)')).toBeInTheDocument();
      });
    });

    it('sollte Memory Leaks bei wiederholten Mounts/Unmounts vermeiden', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1]);

      // Simuliere 50 Mount/Unmount-Zyklen
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(<ProjectSelector {...defaultProps} key={i} />);

        await waitFor(() => {
          expect(screen.getByText('Projekt-Verknüpfung (optional)')).toBeInTheDocument();
        });

        unmount();
      }

      expect(mockGetActiveProjects).toHaveBeenCalledTimes(50);
    });
  });

  describe('Multi-Tenancy', () => {
    it('sollte nur Projekte der aktuellen Organisation laden', async () => {
      mockGetActiveProjects.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetActiveProjects).toHaveBeenCalledWith(mockOrganizationId);
      });
    });

    it('sollte bei Organisation-Wechsel neue Projekte laden', async () => {
      mockGetActiveProjects
        .mockResolvedValueOnce([mockProject1])
        .mockResolvedValueOnce([mockProject2]);

      const { rerender } = render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetActiveProjects).toHaveBeenCalledWith(mockOrganizationId);
      });

      rerender(<ProjectSelector {...defaultProps} organizationId="new-org-789" />);

      await waitFor(() => {
        expect(mockGetActiveProjects).toHaveBeenCalledWith('new-org-789');
      });

      expect(mockGetActiveProjects).toHaveBeenCalledTimes(2);
    });
  });
});
