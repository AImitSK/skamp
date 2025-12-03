import React from 'react';
import { render, screen } from '@testing-library/react';
import { DatenTabContent } from '../DatenTabContent';
import ProjectFoldersView from '@/components/projects/ProjectFoldersView';
import type { Project } from '@/types/project';

// Mock der ProjectFoldersView Komponente
jest.mock('@/components/projects/ProjectFoldersView', () => {
  return jest.fn(() => <div data-testid="mock-project-folders-view">ProjectFoldersView Mock</div>);
});

const mockProjectFoldersView = ProjectFoldersView as jest.MockedFunction<typeof ProjectFoldersView>;

describe('DatenTabContent Component', () => {
  const mockProject: Project = {
    id: 'project-123',
    title: 'Test Projekt',
    customer: {
      id: 'customer-123',
      name: 'Test Kunde'
    },
    organizationId: 'org-123'
  } as Project;

  const mockProjectFolders = {
    id: 'folder-root',
    name: 'Root',
    subfolders: [
      { id: 'folder-1', name: 'Medien' },
      { id: 'folder-2', name: 'Dokumente' }
    ],
    assets: []
  };

  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering Tests', () => {
    it('sollte Header mit Titel rendern', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Projektdaten verwalten')).toBeInTheDocument();
    });

    it('sollte Beschreibungstext rendern', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Organisieren Sie alle Projektdateien und Dokumente zentral')).toBeInTheDocument();
    });

    it('sollte ProjectFoldersView rendern wenn projectFolders vorhanden', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByTestId('mock-project-folders-view')).toBeInTheDocument();
    });

    it('sollte ProjectFoldersView NICHT rendern wenn projectFolders null', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={null}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.queryByTestId('mock-project-folders-view')).not.toBeInTheDocument();
    });

    it('sollte ProjectFoldersView NICHT rendern wenn projectFolders undefined', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={undefined}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.queryByTestId('mock-project-folders-view')).not.toBeInTheDocument();
    });

    it('sollte Container mit korrekten Klassen rendern', () => {
      const { container } = render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('space-y-6');
    });
  });

  describe('Props Passing Tests', () => {
    it('sollte projectId korrekt an ProjectFoldersView übergeben', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-123'
        }),
        expect.anything()
      );
    });

    it('sollte organizationId korrekt an ProjectFoldersView übergeben', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-123'
        }),
        expect.anything()
      );
    });

    it('sollte customerId korrekt an ProjectFoldersView übergeben', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-123'
        }),
        expect.anything()
      );
    });

    it('sollte customerName korrekt an ProjectFoldersView übergeben', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'Test Kunde'
        }),
        expect.anything()
      );
    });

    it('sollte projectFolders korrekt an ProjectFoldersView übergeben', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          projectFolders: mockProjectFolders
        }),
        expect.anything()
      );
    });

    it('sollte foldersLoading korrekt an ProjectFoldersView übergeben', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={true}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          foldersLoading: true
        }),
        expect.anything()
      );
    });

    it('sollte onRefresh korrekt an ProjectFoldersView übergeben', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          onRefresh: mockOnRefresh
        }),
        expect.anything()
      );
    });

    it('sollte filterByFolder="all" an ProjectFoldersView übergeben', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          filterByFolder: 'all'
        }),
        expect.anything()
      );
    });

    it('sollte title="Projektdaten" an ProjectFoldersView übergeben', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Projektdaten'
        }),
        expect.anything()
      );
    });

    it('sollte undefined customerId übergeben wenn customer fehlt', () => {
      const projectWithoutCustomer: Project = {
        id: 'project-123',
        title: 'Test Projekt',
        organizationId: 'org-123'
      } as Project;

      render(
        <DatenTabContent
          project={projectWithoutCustomer}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: undefined
        }),
        expect.anything()
      );
    });

    it('sollte undefined customerName übergeben wenn customer fehlt', () => {
      const projectWithoutCustomer: Project = {
        id: 'project-123',
        title: 'Test Projekt',
        organizationId: 'org-123'
      } as Project;

      render(
        <DatenTabContent
          project={projectWithoutCustomer}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: undefined
        }),
        expect.anything()
      );
    });
  });

  describe('React.memo Tests', () => {
    it('sollte NICHT neu rendern wenn Props gleich bleiben', () => {
      const { rerender } = render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledTimes(1);

      // Rerender mit denselben Props
      rerender(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      // React.memo sollte Rerender verhindern
      expect(mockProjectFoldersView).toHaveBeenCalledTimes(1);
    });

    it('sollte neu rendern wenn project sich ändert', () => {
      const { rerender } = render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledTimes(1);

      const newProject: Project = {
        ...mockProject,
        id: 'project-456'
      };

      rerender(
        <DatenTabContent
          project={newProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledTimes(2);
    });

    it('sollte neu rendern wenn foldersLoading sich ändert', () => {
      const { rerender } = render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledTimes(1);

      rerender(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={true}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledTimes(2);
    });

    it('sollte neu rendern wenn projectFolders sich ändert', () => {
      const { rerender } = render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledTimes(1);

      const newFolders = {
        ...mockProjectFolders,
        id: 'folder-root-2'
      };

      rerender(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={newFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledTimes(2);
    });
  });

  describe('Conditional Rendering Tests', () => {
    it('sollte nur Header rendern wenn projectFolders null', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={null}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Projektdaten verwalten')).toBeInTheDocument();
      expect(screen.getByText('Organisieren Sie alle Projektdateien und Dokumente zentral')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-project-folders-view')).not.toBeInTheDocument();
    });

    it('sollte nur Header rendern wenn projectFolders undefined', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={undefined}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Projektdaten verwalten')).toBeInTheDocument();
      expect(screen.getByText('Organisieren Sie alle Projektdateien und Dokumente zentral')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-project-folders-view')).not.toBeInTheDocument();
    });

    it('sollte ProjectFoldersView rendern wenn projectFolders leeres Objekt', () => {
      const emptyFolders = {
        id: 'folder-root',
        name: 'Root',
        subfolders: [],
        assets: []
      };

      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={emptyFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByTestId('mock-project-folders-view')).toBeInTheDocument();
    });

    it('sollte beide Abschnitte rendern wenn projectFolders vorhanden', () => {
      const { container } = render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      // Header-Abschnitt
      expect(screen.getByText('Projektdaten verwalten')).toBeInTheDocument();

      // ProjectFoldersView-Abschnitt
      expect(screen.getByTestId('mock-project-folders-view')).toBeInTheDocument();

      // Container sollte beide Kinder haben
      const children = container.firstChild?.childNodes;
      expect(children?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Edge Cases Tests', () => {
    it('sollte mit Projekt ohne ID umgehen können', () => {
      const projectWithoutId: Project = {
        title: 'Test Projekt',
        organizationId: 'org-123'
      } as Project;

      render(
        <DatenTabContent
          project={projectWithoutId}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: undefined
        }),
        expect.anything()
      );
    });

    it('sollte mit verschiedenen organizationIds umgehen', () => {
      const orgIds = ['org-1', 'org-2', 'org-3'];

      orgIds.forEach(orgId => {
        const { unmount } = render(
          <DatenTabContent
            project={mockProject}
            organizationId={orgId}
            projectFolders={mockProjectFolders}
            foldersLoading={false}
            onRefresh={mockOnRefresh}
          />
        );

        expect(mockProjectFoldersView).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: orgId
          }),
          expect.anything()
        );

        unmount();
        jest.clearAllMocks();
      });
    });

    it('sollte mit komplexen projectFolders Strukturen umgehen', () => {
      const complexFolders = {
        id: 'root',
        name: 'Root',
        subfolders: [
          {
            id: 'folder-1',
            name: 'Level 1',
            subfolders: [
              { id: 'folder-1-1', name: 'Level 2' }
            ]
          }
        ],
        assets: [
          { id: 'asset-1', name: 'file1.pdf' },
          { id: 'asset-2', name: 'file2.pdf' }
        ]
      };

      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={complexFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          projectFolders: complexFolders
        }),
        expect.anything()
      );
    });

    it('sollte mit customer ohne Namen umgehen', () => {
      const projectWithCustomerWithoutName: Project = {
        id: 'project-123',
        title: 'Test Projekt',
        customer: {
          id: 'customer-123'
        } as any,
        organizationId: 'org-123'
      } as Project;

      render(
        <DatenTabContent
          project={projectWithCustomerWithoutName}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer-123',
          customerName: undefined
        }),
        expect.anything()
      );
    });

    it('sollte mit schnell wechselnden foldersLoading States umgehen', () => {
      const { rerender } = render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      // Schneller Wechsel zwischen loading states
      rerender(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={true}
          onRefresh={mockOnRefresh}
        />
      );

      rerender(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={false}
          onRefresh={mockOnRefresh}
        />
      );

      // Komponente sollte stabil bleiben
      expect(screen.getByText('Projektdaten verwalten')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('sollte alle Props korrekt zusammen übergeben', () => {
      render(
        <DatenTabContent
          project={mockProject}
          organizationId="org-123"
          projectFolders={mockProjectFolders}
          foldersLoading={true}
          onRefresh={mockOnRefresh}
        />
      );

      expect(mockProjectFoldersView).toHaveBeenCalledWith(
        {
          projectId: 'project-123',
          organizationId: 'org-123',
          customerId: 'customer-123',
          customerName: 'Test Kunde',
          projectFolders: mockProjectFolders,
          foldersLoading: true,
          onRefresh: mockOnRefresh,
          filterByFolder: 'all',
          title: 'Projektdaten'
        },
        expect.anything()
      );
    });

    it('sollte als memoized Component exportiert sein', () => {
      expect(DatenTabContent).toBeDefined();
      expect(typeof DatenTabContent).toBe('object');
    });
  });
});
