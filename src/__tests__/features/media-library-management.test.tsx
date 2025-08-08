// src/__tests__/features/media-library-management.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { mediaService } from '@/lib/firebase/media-service';
import MediaLibraryPage from '@/app/dashboard/pr-tools/media-library/page';
import { MediaAsset, MediaFolder } from '@/types/media';

// Mock the dependencies
jest.mock('@/context/AuthContext');
jest.mock('@/context/OrganizationContext');
jest.mock('@/lib/firebase/media-service');
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: jest.fn() }),
  useRouter: () => ({ push: jest.fn() }),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseOrganization = useOrganization as jest.MockedFunction<typeof useOrganization>;
const mockMediaService = mediaService as jest.Mocked<typeof mediaService>;

// Test data
const mockFolder: MediaFolder = {
  id: 'folder-1',
  organizationId: 'test-org',
  name: 'Test Ordner',
  description: 'Test Beschreibung',
  parentId: null,
  color: 'blue',
  assetCount: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'test-user'
};

const mockAsset: MediaAsset = {
  id: 'asset-1',
  organizationId: 'test-org',
  fileName: 'test-image.jpg',
  fileType: 'image/jpeg',
  fileSize: 1024000,
  downloadUrl: 'https://example.com/test-image.jpg',
  thumbnailUrl: 'https://example.com/thumb-test-image.jpg',
  folderId: null,
  tags: ['presse', 'produkt'],
  metadata: {
    width: 1920,
    height: 1080
  },
  uploadedBy: 'test-user',
  createdAt: new Date(),
  updatedAt: new Date()
} as MediaAsset;

describe('Media Library Management', () => {
  beforeEach(() => {
    // Setup default mocks
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' },
      loading: false,
    } as any);

    mockUseOrganization.mockReturnValue({
      currentOrganization: { id: 'test-org', name: 'Test Org' },
      loading: false,
    } as any);

    // Reset all service mocks
    jest.clearAllMocks();
  });

  describe('Asset Management', () => {
    beforeEach(() => {
      mockMediaService.getAssetsByOrganization.mockResolvedValue([mockAsset]);
      mockMediaService.getFoldersByOrganization.mockResolvedValue([mockFolder]);
    });

    it('should render media library with assets and folders', async () => {
      render(<MediaLibraryPage />);

      // Check for loading state initially
      expect(screen.getByText('Lade Mediathek...')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Media Library')).toBeInTheDocument();
      });

      // Check for folder
      expect(screen.getByText('Test Ordner')).toBeInTheDocument();
      expect(screen.getByText('5 Dateien')).toBeInTheDocument();

      // Check for asset
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      expect(screen.getByText('1.0 MB')).toBeInTheDocument();
    });

    it('should toggle between grid and list view', async () => {
      render(<MediaLibraryPage />);

      await waitFor(() => {
        expect(screen.getByText('Media Library')).toBeInTheDocument();
      });

      // Should start in grid view
      const gridButton = screen.getByLabelText('Grid-Ansicht');
      const listButton = screen.getByLabelText('Listen-Ansicht');

      expect(gridButton).toHaveAttribute('aria-pressed', 'true');
      expect(listButton).toHaveAttribute('aria-pressed', 'false');

      // Click list view
      fireEvent.click(listButton);

      expect(gridButton).toHaveAttribute('aria-pressed', 'false');
      expect(listButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should search assets by filename', async () => {
      render(<MediaLibraryPage />);

      await waitFor(() => {
        expect(screen.getByText('Media Library')).toBeInTheDocument();
      });

      // Find search input
      const searchInput = screen.getByPlaceholderText('Dateien durchsuchen...');
      fireEvent.change(searchInput, { target: { value: 'test-image' } });

      // Should filter assets
      await waitFor(() => {
        expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      });
    });

    it('should select multiple assets for bulk operations', async () => {
      render(<MediaLibraryPage />);

      await waitFor(() => {
        expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      });

      // Click on asset to select it
      const assetCard = screen.getByText('test-image.jpg').closest('[data-testid="asset-card"]');
      fireEvent.click(assetCard!);

      // Should show bulk actions toolbar
      await waitFor(() => {
        expect(screen.getByText('1 ausgewählt')).toBeInTheDocument();
        expect(screen.getByText('Löschen')).toBeInTheDocument();
        expect(screen.getByText('Verschieben')).toBeInTheDocument();
        expect(screen.getByText('Teilen')).toBeInTheDocument();
      });
    });
  });

  describe('Folder Management', () => {
    beforeEach(() => {
      mockMediaService.getAssetsByOrganization.mockResolvedValue([]);
      mockMediaService.getFoldersByOrganization.mockResolvedValue([mockFolder]);
    });

    it('should create a new folder', async () => {
      mockMediaService.createFolder.mockResolvedValue(mockFolder);

      render(<MediaLibraryPage />);

      await waitFor(() => {
        expect(screen.getByText('Media Library')).toBeInTheDocument();
      });

      // Click "Ordner erstellen" button
      const createFolderButton = screen.getByText('Ordner erstellen');
      fireEvent.click(createFolderButton);

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText('Neuen Ordner erstellen')).toBeInTheDocument();
      });

      // Fill form
      const nameInput = screen.getByLabelText('Ordnername');
      const descriptionInput = screen.getByLabelText('Beschreibung (optional)');
      
      fireEvent.change(nameInput, { target: { value: 'Neuer Ordner' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Beschreibung' } });

      // Submit form
      const submitButton = screen.getByText('Ordner erstellen');
      fireEvent.click(submitButton);

      // Service should be called
      await waitFor(() => {
        expect(mockMediaService.createFolder).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Neuer Ordner',
            description: 'Test Beschreibung',
            organizationId: 'test-org'
          }),
          expect.objectContaining({
            organizationId: 'test-org',
            userId: 'test-user'
          })
        );
      });
    });

    it('should navigate into folder when clicked', async () => {
      render(<MediaLibraryPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Ordner')).toBeInTheDocument();
      });

      // Click on folder
      const folderCard = screen.getByText('Test Ordner');
      fireEvent.click(folderCard);

      // Should call service to load folder contents
      await waitFor(() => {
        expect(mockMediaService.getAssetsByOrganization).toHaveBeenCalledWith(
          'test-org',
          'folder-1'
        );
      });
    });
  });

  describe('Sharing Functionality', () => {
    beforeEach(() => {
      mockMediaService.getAssetsByOrganization.mockResolvedValue([mockAsset]);
      mockMediaService.getFoldersByOrganization.mockResolvedValue([]);
      mockMediaService.createShareLink.mockResolvedValue({
        id: 'share-1',
        shareId: 'abc123',
        url: 'https://example.com/share/abc123'
      } as any);
    });

    it('should create share link for asset', async () => {
      render(<MediaLibraryPage />);

      await waitFor(() => {
        expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      });

      // Select asset
      const assetCard = screen.getByText('test-image.jpg').closest('[data-testid="asset-card"]');
      fireEvent.click(assetCard!);

      // Click share button
      const shareButton = screen.getByText('Teilen');
      fireEvent.click(shareButton);

      // Wait for share modal
      await waitFor(() => {
        expect(screen.getByText('Dateien teilen')).toBeInTheDocument();
      });

      // Fill share form
      const titleInput = screen.getByLabelText('Titel');
      fireEvent.change(titleInput, { target: { value: 'Geteiltes Asset' } });

      // Create link
      const createButton = screen.getByText('Link erstellen');
      fireEvent.click(createButton);

      // Service should be called
      await waitFor(() => {
        expect(mockMediaService.createShareLink).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'file',
            targetId: 'asset-1',
            title: 'Geteiltes Asset',
            organizationId: 'test-org'
          })
        );
      });

      // Should show generated link
      await waitFor(() => {
        expect(screen.getByText('https://example.com/share/abc123')).toBeInTheDocument();
      });
    });

    it('should copy share link to clipboard', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });

      render(<MediaLibraryPage />);

      await waitFor(() => {
        expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      });

      // Create share (same steps as above)
      const assetCard = screen.getByText('test-image.jpg').closest('[data-testid="asset-card"]');
      fireEvent.click(assetCard!);
      
      const shareButton = screen.getByText('Teilen');
      fireEvent.click(shareButton);

      await waitFor(() => {
        const titleInput = screen.getByLabelText('Titel');
        fireEvent.change(titleInput, { target: { value: 'Test' } });
        
        const createButton = screen.getByText('Link erstellen');
        fireEvent.click(createButton);
      });

      // Wait for link and copy it
      await waitFor(() => {
        const copyButton = screen.getByText('Kopieren');
        fireEvent.click(copyButton);
      });

      // Clipboard should be called
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://example.com/share/abc123'
      );
    });
  });

  describe('Drag and Drop', () => {
    beforeEach(() => {
      mockMediaService.getAssetsByOrganization.mockResolvedValue([mockAsset]);
      mockMediaService.getFoldersByOrganization.mockResolvedValue([mockFolder]);
      mockMediaService.moveAsset.mockResolvedValue(undefined);
    });

    it('should move asset to folder via drag and drop', async () => {
      render(<MediaLibraryPage />);

      await waitFor(() => {
        expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
        expect(screen.getByText('Test Ordner')).toBeInTheDocument();
      });

      // Simulate drag and drop (simplified)
      const assetCard = screen.getByText('test-image.jpg').closest('[data-testid="asset-card"]');
      const folderCard = screen.getByText('Test Ordner').closest('[data-testid="folder-card"]');

      // Start drag
      fireEvent.dragStart(assetCard!);
      
      // Drop on folder
      fireEvent.dragOver(folderCard!);
      fireEvent.drop(folderCard!);

      // Service should be called
      await waitFor(() => {
        expect(mockMediaService.moveAsset).toHaveBeenCalledWith(
          'asset-1',
          'folder-1',
          expect.objectContaining({
            organizationId: 'test-org',
            userId: 'test-user'
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockMediaService.getAssetsByOrganization.mockRejectedValue(new Error('Service error'));

      render(<MediaLibraryPage />);

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument();
        expect(screen.getByText('Die Mediathek konnte nicht geladen werden.')).toBeInTheDocument();
      });
    });

    it('should handle upload errors', async () => {
      mockMediaService.uploadAsset.mockRejectedValue(new Error('Upload failed'));

      render(<MediaLibraryPage />);

      await waitFor(() => {
        expect(screen.getByText('Media Library')).toBeInTheDocument();
      });

      // Click upload button
      const uploadButton = screen.getByText('Hochladen');
      fireEvent.click(uploadButton);

      // Mock file upload
      await waitFor(() => {
        expect(screen.getByText('Dateien hochladen')).toBeInTheDocument();
      });

      // Should show error message after failed upload
      // (This would require more complex file upload simulation)
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<MediaLibraryPage />);

      await waitFor(() => {
        expect(screen.getByText('Media Library')).toBeInTheDocument();
      });

      // Check for ARIA labels
      expect(screen.getByLabelText('Grid-Ansicht')).toBeInTheDocument();
      expect(screen.getByLabelText('Listen-Ansicht')).toBeInTheDocument();
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<MediaLibraryPage />);

      await waitFor(() => {
        expect(screen.getByText('Media Library')).toBeInTheDocument();
      });

      // Check if elements are focusable
      const uploadButton = screen.getByText('Hochladen');
      uploadButton.focus();
      expect(uploadButton).toHaveFocus();
    });
  });
});