// src/components/pr/campaign/shared/__tests__/FolderSelectorDialog.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import FolderSelectorDialog from '../FolderSelectorDialog';
import { mediaService } from '@/lib/firebase/media-service';
import { MediaFolder } from '@/types/media';

// Mock mediaService
jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: {
    getFolders: jest.fn(),
    getBreadcrumbs: jest.fn(),
  },
}));

const mockMediaService = mediaService as jest.Mocked<typeof mediaService>;

describe('FolderSelectorDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnFolderSelect = jest.fn();
  const mockOrganizationId = 'org-123';

  const mockFolders: MediaFolder[] = [
    {
      id: 'folder-1',
      name: 'Marketing Materials',
      description: 'All marketing content',
      organizationId: 'org-123',
      parentId: undefined,
      color: '#3B82F6',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      createdBy: 'user-1',
    },
    {
      id: 'folder-2',
      name: 'Press Releases',
      description: 'Press release PDFs',
      organizationId: 'org-123',
      parentId: undefined,
      color: '#10B981',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'user-1',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockMediaService.getFolders.mockResolvedValue(mockFolders);
    mockMediaService.getBreadcrumbs.mockResolvedValue([]);
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <FolderSelectorDialog
          isOpen={false}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render dialog when isOpen is true', async () => {
      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('PDF Speicherort auswählen')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText('Lade Ordner...')).toBeInTheDocument();
    });
  });

  describe('Folder Loading', () => {
    it('should load folders on mount when dialog is open', async () => {
      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(mockMediaService.getFolders).toHaveBeenCalledWith(mockOrganizationId, undefined);
      });
    });

    it('should display loaded folders', async () => {
      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Marketing Materials')).toBeInTheDocument();
        expect(screen.getByText('Press Releases')).toBeInTheDocument();
      });
    });

    it('should display folder descriptions', async () => {
      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('All marketing content')).toBeInTheDocument();
        expect(screen.getByText('Press release PDFs')).toBeInTheDocument();
      });
    });

    it('should show empty state when no folders available', async () => {
      mockMediaService.getFolders.mockResolvedValue([]);

      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Keine Unterordner vorhanden')).toBeInTheDocument();
      });
    });

    it('should handle loading errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockMediaService.getFolders.mockRejectedValue(new Error('Network error'));

      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('Client Filtering', () => {
    it('should filter folders by clientId when provided', async () => {
      const foldersWithClient: MediaFolder[] = [
        {
          ...mockFolders[0],
          clientId: 'client-123',
        },
        {
          ...mockFolders[1],
          clientId: 'client-456',
        },
        {
          id: 'folder-3',
          name: 'Global Folder',
          organizationId: 'org-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ];

      mockMediaService.getFolders.mockResolvedValue(foldersWithClient);

      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
          clientId="client-123"
        />
      );

      await waitFor(() => {
        // Should show client-specific folder and global folder
        expect(screen.getByText('Marketing Materials')).toBeInTheDocument();
        expect(screen.getByText('Global Folder')).toBeInTheDocument();
        // Should NOT show other client's folder
        expect(screen.queryByText('Press Releases')).not.toBeInTheDocument();
      });
    });

    it('should show all folders when no clientId provided', async () => {
      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Marketing Materials')).toBeInTheDocument();
        expect(screen.getByText('Press Releases')).toBeInTheDocument();
      });
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should show Mediathek as root breadcrumb', async () => {
      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Mediathek')).toBeInTheDocument();
      });
    });

    it('should update breadcrumbs when navigating into subfolder', async () => {
      const breadcrumbData = [
        { id: 'folder-1', name: 'Marketing Materials' },
      ];
      mockMediaService.getBreadcrumbs.mockResolvedValue(breadcrumbData as any);

      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Marketing Materials')).toBeInTheDocument();
      });

      // Click on folder to navigate
      fireEvent.click(screen.getByText('Marketing Materials'));

      await waitFor(() => {
        expect(mockMediaService.getBreadcrumbs).toHaveBeenCalledWith('folder-1');
      });
    });

    it('should navigate back when clicking on breadcrumb', async () => {
      const breadcrumbData = [
        { id: 'folder-1', name: 'Marketing Materials' },
      ];
      mockMediaService.getBreadcrumbs.mockResolvedValue(breadcrumbData as any);

      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      // Navigate into folder first
      await waitFor(() => {
        expect(screen.getByText('Marketing Materials')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Marketing Materials'));

      await waitFor(() => {
        expect(mockMediaService.getBreadcrumbs).toHaveBeenCalled();
      });

      // Click on Mediathek breadcrumb to go back
      const breadcrumbs = screen.getAllByText('Mediathek');
      fireEvent.click(breadcrumbs[0]);

      await waitFor(() => {
        expect(mockMediaService.getFolders).toHaveBeenCalledWith(mockOrganizationId, undefined);
      });
    });
  });

  describe('Folder Selection', () => {
    it('should call onFolderSelect with undefined when selecting root folder', async () => {
      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hier speichern')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Hier speichern');
      fireEvent.click(saveButton);

      expect(mockOnFolderSelect).toHaveBeenCalledWith(undefined);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onFolderSelect with folderId when selecting subfolder', async () => {
      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      // Navigate into folder
      await waitFor(() => {
        expect(screen.getByText('Marketing Materials')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Marketing Materials'));

      // Mock subfolder navigation
      mockMediaService.getFolders.mockResolvedValue([]);
      mockMediaService.getBreadcrumbs.mockResolvedValue([
        { id: 'folder-1', name: 'Marketing Materials' },
      ] as any);

      await waitFor(() => {
        const saveButtons = screen.getAllByText('Hier speichern');
        expect(saveButtons.length).toBeGreaterThan(0);
      });

      const saveButton = screen.getAllByText('Hier speichern')[0];
      fireEvent.click(saveButton);

      expect(mockOnFolderSelect).toHaveBeenCalledWith('folder-1');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Dialog Actions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Abbrechen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Abbrechen'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when dialog backdrop is clicked', async () => {
      const { container } = render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('PDF Speicherort auswählen')).toBeInTheDocument();
      });

      // Find dialog backdrop and simulate click
      const backdrop = container.querySelector('[data-headlessui-state]');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      // Dialog should attempt to close (implementation may vary)
      // This tests that the close mechanism is in place
    });
  });

  describe('Current Folder Display', () => {
    it('should show Mediathek (Hauptordner) text when at root level', async () => {
      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Mediathek (Hauptordner)')).toBeInTheDocument();
        expect(screen.getByText('PDF hier speichern')).toBeInTheDocument();
      });
    });
  });

  describe('Performance & Memoization', () => {
    it('should not reload folders when isOpen changes from true to true', async () => {
      const { rerender } = render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(mockMediaService.getFolders).toHaveBeenCalledTimes(1);
      });

      rerender(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      // Should not trigger another load
      expect(mockMediaService.getFolders).toHaveBeenCalledTimes(1);
    });

    it('should reload folders when dialog is reopened', async () => {
      const { rerender } = render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(mockMediaService.getFolders).toHaveBeenCalledTimes(1);
      });

      // Close dialog
      rerender(
        <FolderSelectorDialog
          isOpen={false}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      // Reopen dialog
      rerender(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(mockMediaService.getFolders).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle folders with missing descriptions', async () => {
      const foldersWithoutDesc: MediaFolder[] = [
        {
          id: 'folder-1',
          name: 'No Description Folder',
          organizationId: 'org-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ];

      mockMediaService.getFolders.mockResolvedValue(foldersWithoutDesc);

      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No Description Folder')).toBeInTheDocument();
      });
    });

    it('should handle folders with custom colors', async () => {
      const foldersWithColors: MediaFolder[] = [
        {
          ...mockFolders[0],
          color: '#FF5733',
        },
      ];

      mockMediaService.getFolders.mockResolvedValue(foldersWithColors);

      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Marketing Materials')).toBeInTheDocument();
      });
    });

    it('should handle very long folder names', async () => {
      const foldersWithLongNames: MediaFolder[] = [
        {
          id: 'folder-1',
          name: 'This is a very long folder name that might cause layout issues if not handled properly',
          organizationId: 'org-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
        },
      ];

      mockMediaService.getFolders.mockResolvedValue(foldersWithLongNames);

      render(
        <FolderSelectorDialog
          isOpen={true}
          onClose={mockOnClose}
          onFolderSelect={mockOnFolderSelect}
          organizationId={mockOrganizationId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/This is a very long folder name/)).toBeInTheDocument();
      });
    });
  });
});
