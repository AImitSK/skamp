// src/__tests__/components/projects/ProjectSelector.test.tsx - Tests für ProjectSelector Component
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock ProjectService
const mockProjectServiceGetAll = jest.fn();

jest.mock('@/lib/firebase/project-service', () => ({
  projectService: {
    getAll: mockProjectServiceGetAll
  }
}));

// Mock UI Components
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

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  LinkIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="link-icon">
      <title>Link Icon</title>
    </svg>
  )
}));

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
    budget: {
      allocated: 10000,
      spent: 2500,
      currency: 'EUR'
    },
    timeline: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
      milestones: []
    },
    linkedCampaigns: [],
    createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
    updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any
  };

  const mockProject2: Project = {
    ...mockProject1,
    id: 'project-2',
    title: 'Website Relaunch',
    customer: {
      name: 'Tech Solutions GmbH',
      contactPerson: 'Maria Schmidt',
      email: 'maria@techsolutions.de'
    }
  };

  const defaultProps = {
    organizationId: mockOrganizationId,
    onProjectSelect: mockOnProjectSelect
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('sollte Komponente korrekt rendern', async () => {
      mockProjectServiceGetAll.mockResolvedValue([]);

      render(<ProjectSelector {...defaultProps} />);

      expect(screen.getByTestId('link-icon')).toBeInTheDocument();
      expect(screen.getByText('Projekt-Verknüpfung (optional)')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('animate-pulse')).not.toBeInTheDocument();
      });
    });

    it('sollte Loading-State anzeigen während Projekte geladen werden', () => {
      mockProjectServiceGetAll.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<ProjectSelector {...defaultProps} />);

      // Loading state erkennen an der animate-pulse div
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('sollte "Kein Projekt zuordnen" Option anzeigen', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        expect(selectElement).toBeInTheDocument();
      });

      expect(screen.getByText('Kein Projekt zuordnen')).toBeInTheDocument();
    });

    it('sollte Meldung anzeigen wenn keine aktiven Projekte vorhanden', async () => {
      mockProjectServiceGetAll.mockResolvedValue([]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Keine aktiven Projekte in der Erstellung-Phase gefunden.')).toBeInTheDocument();
      });
    });
  });

  describe('Projekt-Loading', () => {
    it('sollte projektService.getAll mit korrekten Parametern aufrufen', async () => {
      mockProjectServiceGetAll.mockResolvedValue([]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(mockProjectServiceGetAll).toHaveBeenCalledWith({
          organizationId: mockOrganizationId,
          filters: {
            currentStage: 'creation'
          }
        });
      });
    });

    it('sollte Projekte neu laden wenn organizationId sich ändert', async () => {
      mockProjectServiceGetAll.mockResolvedValue([]);

      const { rerender } = render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(mockProjectServiceGetAll).toHaveBeenCalledTimes(1);
      });

      // OrganizationId ändern
      rerender(<ProjectSelector {...defaultProps} organizationId="new-org-456" />);

      await waitFor(() => {
        expect(mockProjectServiceGetAll).toHaveBeenCalledTimes(2);
        expect(mockProjectServiceGetAll).toHaveBeenLastCalledWith({
          organizationId: 'new-org-456',
          filters: {
            currentStage: 'creation'
          }
        });
      });
    });

    it('sollte Fehler beim Laden von Projekten abfangen', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockProjectServiceGetAll.mockRejectedValue(new Error('Network error'));

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading projects:', expect.any(Error));
      });

      expect(screen.getByText('Keine aktiven Projekte in der Erstellung-Phase gefunden.')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Projekt-Liste', () => {
    it('sollte alle verfügbaren Projekte in der Auswahl anzeigen', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1, mockProject2]);

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
      mockProjectServiceGetAll.mockResolvedValue([projectWithoutCustomer]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Marketing Kampagne Q1')).toBeInTheDocument();
      });
    });

    it('sollte Projekte mit leerem Kundennamen korrekt anzeigen', async () => {
      const projectWithEmptyCustomerName = {
        ...mockProject1,
        customer: {
          name: '',
          contactPerson: 'John Doe',
          email: 'john@example.com'
        }
      };
      mockProjectServiceGetAll.mockResolvedValue([projectWithEmptyCustomerName]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Marketing Kampagne Q1')).toBeInTheDocument();
      });
    });
  });

  describe('Projekt-Auswahl', () => {
    it('sollte onProjectSelect mit korrekten Parametern aufrufen bei Projekt-Auswahl', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1, mockProject2]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        fireEvent.change(selectElement, { target: { value: 'project-1' } });
      });

      expect(mockOnProjectSelect).toHaveBeenCalledWith('project-1', mockProject1);
    });

    it('sollte onProjectSelect mit leerem Projekt aufrufen wenn "Kein Projekt" gewählt', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} selectedProjectId="project-1" />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        fireEvent.change(selectElement, { target: { value: '' } });
      });

      expect(mockOnProjectSelect).toHaveBeenCalledWith('', {});
    });

    it('sollte ausgewähltes Projekt korrekt anzeigen', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1, mockProject2]);

      render(<ProjectSelector {...defaultProps} selectedProjectId="project-2" />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox') as HTMLSelectElement;
        expect(selectElement.value).toBe('project-2');
      });
    });

    it('sollte nicht reagieren wenn ungültige Projekt-ID gewählt wird', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        fireEvent.change(selectElement, { target: { value: 'invalid-project-id' } });
      });

      expect(mockOnProjectSelect).not.toHaveBeenCalled();
    });
  });

  describe('Integration-Info Box', () => {
    it('sollte Integration-Info anzeigen wenn Projekt ausgewählt', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} selectedProjectId="project-1" />);

      await waitFor(() => {
        expect(screen.getByText('Projekt-Integration aktiviert')).toBeInTheDocument();
        expect(screen.getByText(/Diese Kampagne wird dem ausgewählten Projekt zugeordnet/)).toBeInTheDocument();
        expect(screen.getByText('Kunde: ACME Corp')).toBeInTheDocument();
      });
    });

    it('sollte Integration-Info verstecken wenn kein Projekt ausgewählt', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Projekt-Integration aktiviert')).not.toBeInTheDocument();
      });
    });

    it('sollte Kunden-Info nicht anzeigen wenn Kunde nicht vorhanden', async () => {
      const projectWithoutCustomer = { ...mockProject1, customer: undefined };
      mockProjectServiceGetAll.mockResolvedValue([projectWithoutCustomer]);

      render(<ProjectSelector {...defaultProps} selectedProjectId="project-1" />);

      await waitFor(() => {
        expect(screen.getByText('Projekt-Integration aktiviert')).toBeInTheDocument();
        expect(screen.queryByText(/Kunde:/)).not.toBeInTheDocument();
      });
    });

    it('sollte korrekten Link-Icon in Integration-Box anzeigen', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} selectedProjectId="project-1" />);

      await waitFor(() => {
        const linkIcons = screen.getAllByTestId('link-icon');
        expect(linkIcons).toHaveLength(2); // Einer im Header, einer in der Integration-Box
      });
    });
  });

  describe('Accessibility', () => {
    it('sollte korrekte ARIA-Labels haben', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        expect(selectElement).toHaveAccessibleName();
      });
    });

    it('sollte mit Tastatur navigierbar sein', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1, mockProject2]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        const selectElement = screen.getByRole('combobox');
        
        // Focus auf Select-Element
        fireEvent.focus(selectElement);
        expect(selectElement).toHaveFocus();
        
        // Keyboard Navigation simulieren
        fireEvent.keyDown(selectElement, { key: 'ArrowDown' });
        fireEvent.keyDown(selectElement, { key: 'Enter' });
      });
    });
  });

  describe('Performance', () => {
    it('sollte nicht unnötig re-rendern wenn Props gleich bleiben', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1]);

      const { rerender } = render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(mockProjectServiceGetAll).toHaveBeenCalledTimes(1);
      });

      // Re-render mit gleichen Props
      rerender(<ProjectSelector {...defaultProps} />);

      // Sollte nicht erneut laden
      expect(mockProjectServiceGetAll).toHaveBeenCalledTimes(1);
    });

    it('sollte mit großer Projekt-Liste umgehen können', async () => {
      const manyProjects = new Array(100).fill(0).map((_, index) => ({
        ...mockProject1,
        id: `project-${index}`,
        title: `Projekt ${index}`,
        customer: { name: `Kunde ${index}`, contactPerson: 'Test', email: 'test@example.com' }
      }));

      mockProjectServiceGetAll.mockResolvedValue(manyProjects);

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
    it('sollte mit null/undefined Projekten umgehen', async () => {
      mockProjectServiceGetAll.mockResolvedValue([null, mockProject1, undefined] as any);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        // Sollte nur das gültige Projekt anzeigen
        expect(screen.getByText('Marketing Kampagne Q1 (ACME Corp)')).toBeInTheDocument();
      });
    });

    it('sollte mit Projekten ohne ID umgehen', async () => {
      const projectWithoutId = { ...mockProject1, id: undefined };
      mockProjectServiceGetAll.mockResolvedValue([projectWithoutId] as any);

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
        customer: { name: 'B'.repeat(100), contactPerson: 'Test', email: 'test@example.com' } // 100 Zeichen langer Kundenname
      };
      mockProjectServiceGetAll.mockResolvedValue([projectWithLongTitle]);

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
        customer: { name: 'Kunde <>&"\'`', contactPerson: 'Test', email: 'test@example.com' }
      };
      mockProjectServiceGetAll.mockResolvedValue([projectWithSpecialChars]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Projekt <>&"\'` (Kunde <>&"\'`)')).toBeInTheDocument();
      });
    });

    it('sollte Memory Leaks bei wiederholten Mounts/Unmounts vermeiden', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1]);

      // Simuliere 50 Mount/Unmount-Zyklen
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(<ProjectSelector {...defaultProps} key={i} />);
        
        await waitFor(() => {
          expect(screen.getByText('Projekt-Verknüpfung (optional)')).toBeInTheDocument();
        });
        
        unmount();
      }

      expect(mockProjectServiceGetAll).toHaveBeenCalledTimes(50);
    });
  });

  describe('Multi-Tenancy', () => {
    it('sollte nur Projekte der aktuellen Organisation laden', async () => {
      mockProjectServiceGetAll.mockResolvedValue([mockProject1]);

      render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(mockProjectServiceGetAll).toHaveBeenCalledWith({
          organizationId: mockOrganizationId,
          filters: {
            currentStage: 'creation'
          }
        });
      });
    });

    it('sollte bei Organisation-Wechsel neue Projekte laden', async () => {
      mockProjectServiceGetAll
        .mockResolvedValueOnce([mockProject1])
        .mockResolvedValueOnce([mockProject2]);

      const { rerender } = render(<ProjectSelector {...defaultProps} />);

      await waitFor(() => {
        expect(mockProjectServiceGetAll).toHaveBeenCalledWith({
          organizationId: mockOrganizationId,
          filters: { currentStage: 'creation' }
        });
      });

      rerender(<ProjectSelector {...defaultProps} organizationId="new-org-789" />);

      await waitFor(() => {
        expect(mockProjectServiceGetAll).toHaveBeenCalledWith({
          organizationId: 'new-org-789',
          filters: { currentStage: 'creation' }
        });
      });

      expect(mockProjectServiceGetAll).toHaveBeenCalledTimes(2);
    });
  });
});