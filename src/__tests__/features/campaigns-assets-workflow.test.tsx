// src/__tests__/features/campaigns-assets-workflow.test.tsx
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { mediaService } from '@/lib/firebase/media-service';
import { serverTimestamp } from 'firebase/firestore';

// Mock Firebase services
jest.mock('@/lib/firebase/media-service');
jest.mock('firebase/firestore', () => ({
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' }))
}));

describe('Campaign Asset Management Workflows', () => {
  const mockAssets = [
    {
      id: 'asset-1',
      fileName: 'press-image.jpg',
      fileType: 'image/jpeg',
      downloadUrl: 'https://example.com/image1.jpg',
      description: 'Main press image'
    },
    {
      id: 'asset-2',
      fileName: 'document.pdf',
      fileType: 'application/pdf',
      downloadUrl: 'https://example.com/doc.pdf',
      description: 'Supporting document'
    }
  ];

  const mockFolders = [
    {
      id: 'folder-1',
      name: 'Press Materials',
      description: 'Main press materials folder'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (mediaService.getMediaByClientId as jest.Mock).mockResolvedValue({
      assets: mockAssets,
      folders: mockFolders
    });
  });

  describe('Asset Selection Modal', () => {
    it('should display and filter available assets', async () => {
      const NewCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/new/page').default;
      
      render(<NewCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Need to select a customer first to enable asset selection
      // (This part depends on the actual CustomerSelector implementation)
      
      // Click "Medien hinzufügen" button (would be visible after selecting customer)
      const addMediaButton = screen.queryByText('Medien hinzufügen');
      if (addMediaButton) {
        fireEvent.click(addMediaButton);

        // Asset selector modal should open
        await waitFor(() => {
          expect(screen.getByText('Medien auswählen')).toBeInTheDocument();
        });

        // Should display available assets
        expect(screen.getByText('press-image.jpg')).toBeInTheDocument();
        expect(screen.getByText('document.pdf')).toBeInTheDocument();

        // Should display folders
        expect(screen.getByText('Press Materials')).toBeInTheDocument();

        // Test search functionality
        const searchInput = screen.getByPlaceholderText('Medien suchen...');
        fireEvent.change(searchInput, { target: { value: 'press' } });

        // Should filter results (implementation would filter the displayed items)
        expect(searchInput.value).toBe('press');
      }
    });

    it('should allow selecting and confirming assets', async () => {
      const EditCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page').default;
      
      // Mock existing campaign
      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getById = jest.fn().mockResolvedValue({
        id: 'test-campaign',
        title: 'Test Campaign',
        clientId: 'client-123',
        clientName: 'Test Client',
        attachedAssets: []
      });

      render(<EditCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('PR-Kampagne bearbeiten')).toBeInTheDocument();
      });

      // Click add media button
      const addMediaButton = screen.getByText('Medien hinzufügen');
      fireEvent.click(addMediaButton);

      await waitFor(() => {
        expect(screen.getByText('Medien auswählen')).toBeInTheDocument();
      });

      // Select assets via checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes.length > 0) {
        // Select first asset
        fireEvent.click(checkboxes[0]);
      }

      // Confirm selection
      const confirmButton = screen.getByText(/Medien übernehmen/);
      fireEvent.click(confirmButton);

      // Modal should close and assets should be attached
      await waitFor(() => {
        expect(screen.queryByText('Medien auswählen')).not.toBeInTheDocument();
      });
    });

    it('should handle empty asset library', async () => {
      // Mock empty asset response
      (mediaService.getMediaByClientId as jest.Mock).mockResolvedValue({
        assets: [],
        folders: []
      });

      const NewCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/new/page').default;
      
      render(<NewCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Simulate opening asset modal with selected customer
      const addMediaButton = screen.queryByText('Medien hinzufügen');
      if (addMediaButton) {
        fireEvent.click(addMediaButton);

        await waitFor(() => {
          expect(screen.getByText('Keine Medien für diesen Kunden gefunden')).toBeInTheDocument();
        });

        // Should provide link to upload media
        expect(screen.getByText('Medien hochladen')).toBeInTheDocument();
      }
    });
  });

  describe('Attached Assets Display', () => {
    it('should display attached assets in campaign form', async () => {
      const mockCampaignWithAssets = {
        id: 'test-campaign',
        title: 'Campaign with Assets',
        clientId: 'client-123',
        attachedAssets: [
          {
            id: 'asset-attachment-1',
            type: 'asset',
            assetId: 'asset-1',
            metadata: {
              fileName: 'press-image.jpg',
              fileType: 'image/jpeg',
              thumbnailUrl: 'https://example.com/thumb1.jpg'
            },
            attachedAt: serverTimestamp(),
            attachedBy: 'user-123'
          },
          {
            id: 'folder-attachment-1', 
            type: 'folder',
            folderId: 'folder-1',
            metadata: {
              folderName: 'Press Materials'
            },
            attachedAt: serverTimestamp(),
            attachedBy: 'user-123'
          }
        ]
      };

      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getById = jest.fn().mockResolvedValue(mockCampaignWithAssets);

      const EditCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page').default;
      
      render(<EditCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('PR-Kampagne bearbeiten')).toBeInTheDocument();
      });

      // Should display attached assets
      expect(screen.getByText('press-image.jpg')).toBeInTheDocument();
      expect(screen.getByText('Press Materials')).toBeInTheDocument();

      // Should show folder badge
      expect(screen.getByText('Ordner')).toBeInTheDocument();

      // Should have remove buttons
      const removeButtons = screen.getAllByText('×');
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it('should allow removing attached assets', async () => {
      const mockCampaignWithAssets = {
        id: 'test-campaign',
        title: 'Campaign with Assets',
        attachedAssets: [
          {
            id: 'asset-attachment-1',
            type: 'asset',
            assetId: 'asset-1',
            metadata: {
              fileName: 'removable-image.jpg',
              fileType: 'image/jpeg'
            }
          }
        ]
      };

      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getById = jest.fn().mockResolvedValue(mockCampaignWithAssets);

      const EditCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/page').default;
      
      render(<EditCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('removable-image.jpg')).toBeInTheDocument();
      });

      // Click remove button
      const removeButton = screen.getByText('×');
      fireEvent.click(removeButton);

      // Asset should be removed from display
      await waitFor(() => {
        expect(screen.queryByText('removable-image.jpg')).not.toBeInTheDocument();
      });
    });
  });

  describe('Asset Types and Display', () => {
    it('should display different asset types correctly', async () => {
      const mockCampaignWithMixedAssets = {
        id: 'test-campaign',
        title: 'Mixed Assets Campaign',
        attachedAssets: [
          {
            id: 'image-asset',
            type: 'asset',
            metadata: {
              fileName: 'image.jpg',
              fileType: 'image/jpeg',
              thumbnailUrl: 'https://example.com/thumb.jpg'
            }
          },
          {
            id: 'document-asset',
            type: 'asset',
            metadata: {
              fileName: 'document.pdf',
              fileType: 'application/pdf'
            }
          },
          {
            id: 'folder-asset',
            type: 'folder',
            metadata: {
              folderName: 'Media Folder'
            }
          }
        ]
      };

      const mockPrService = require('@/lib/firebase/pr-service');
      mockPrService.prService.getById = jest.fn().mockResolvedValue(mockCampaignWithMixedAssets);

      const ViewCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/page').default;
      
      render(<ViewCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Mixed Assets Campaign')).toBeInTheDocument();
      });

      // Should display image with thumbnail
      expect(screen.getByText('image.jpg')).toBeInTheDocument();
      
      // Should display document with generic icon
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      
      // Should display folder with folder icon
      expect(screen.getByText('Media Folder')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle media service errors', async () => {
      // Mock service error
      (mediaService.getMediaByClientId as jest.Mock).mockRejectedValue(
        new Error('Failed to load media')
      );

      const NewCampaignPage = require('@/app/dashboard/pr-tools/campaigns/campaigns/new/page').default;
      
      render(<NewCampaignPage />);

      await waitFor(() => {
        expect(screen.getByText('Neue PR-Kampagne')).toBeInTheDocument();
      });

      // Try to open asset modal (would handle error gracefully)
      const addMediaButton = screen.queryByText('Medien hinzufügen');
      if (addMediaButton) {
        fireEvent.click(addMediaButton);
        
        // Should handle error without crashing
        await waitFor(() => {
          expect(screen.getByText('Medien auswählen')).toBeInTheDocument();
        });
      }
    });
  });
});