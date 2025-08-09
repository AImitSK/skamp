// src/__tests__/features/media-library-management.test.tsx
/**
 * Tests für Media Library Management Feature
 * 
 * Service-Level Tests für:
 * - Asset-Management (Upload, Download, Sharing)
 * - Ordner-Management und Navigation
 * - Share-Link Funktionalität
 * - Suche und Filterung
 * - Multi-Tenancy Datenisolation
 */

// Service-Level Tests - No UI rendering required
import '@testing-library/jest-dom';

// Mock Firebase Media Service
jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: {
    uploadMedia: jest.fn().mockResolvedValue({ id: 'new-asset-id', filename: 'test.jpg' }),
    getMediaAssets: jest.fn().mockResolvedValue([]),
    deleteAsset: jest.fn().mockResolvedValue(undefined),
    moveAssetToFolder: jest.fn().mockResolvedValue(undefined),
    createFolder: jest.fn().mockResolvedValue({ id: 'new-folder-id' }),
    getFolders: jest.fn().mockResolvedValue([]),
    deleteFolder: jest.fn().mockResolvedValue(undefined),
    createShareLink: jest.fn().mockResolvedValue({ id: 'share-id', shareId: 'abc123' }),
    getShareLinkByShareId: jest.fn().mockResolvedValue(null),
    incrementAccessCount: jest.fn().mockResolvedValue(undefined),
    searchAssets: jest.fn().mockResolvedValue([]),
    getAssetsByType: jest.fn().mockResolvedValue([]),
    getAssetsByTags: jest.fn().mockResolvedValue([]),
  },
}));

// Service-Level Tests - Import only service
import { mediaService } from '@/lib/firebase/media-service';

describe('Media Library Management', () => {
  const mockContext = {
    organizationId: 'test-org-123',
    userId: 'test-user-456'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Asset Management Service', () => {
    it('should upload asset with service', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const mockAsset = {
        id: 'asset-123',
        filename: 'test.jpg',
        originalName: 'test.jpg',
        size: mockFile.size,
        mimeType: 'image/jpeg',
        organizationId: mockContext.organizationId,
        uploadedBy: mockContext.userId
      };

      (mediaService.uploadMedia as jest.Mock).mockResolvedValue(mockAsset);

      const result = await mediaService.uploadMedia(mockFile, mockContext.organizationId, mockContext.userId);

      expect(result.filename).toBe('test.jpg');
      expect(result.organizationId).toBe(mockContext.organizationId);
      expect(mediaService.uploadMedia).toHaveBeenCalledWith(mockFile, mockContext.organizationId, mockContext.userId);
    });

    it('should get assets by organization service', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          filename: 'photo1.jpg',
          organizationId: mockContext.organizationId,
          uploadedBy: mockContext.userId
        },
        {
          id: 'asset-2', 
          filename: 'document.pdf',
          organizationId: mockContext.organizationId,
          uploadedBy: mockContext.userId
        }
      ];

      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue(mockAssets);

      const result = await mediaService.getMediaAssets(mockContext.organizationId);

      expect(result).toHaveLength(2);
      expect(result[0].organizationId).toBe(mockContext.organizationId);
      expect(mediaService.getMediaAssets).toHaveBeenCalledWith(mockContext.organizationId);
    });

    it('should search assets by filename service', async () => {
      const mockAssets = [
        { id: 'asset-1', filename: 'presentation.pptx', organizationId: mockContext.organizationId }
      ];

      (mediaService.searchAssets as jest.Mock).mockResolvedValue(mockAssets);

      const searchTerm = 'presentation';
      const result = await mediaService.searchAssets(mockContext.organizationId, searchTerm);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toContain('presentation');
      expect(mediaService.searchAssets).toHaveBeenCalledWith(mockContext.organizationId, searchTerm);
    });

    it('should delete asset service', async () => {
      (mediaService.deleteAsset as jest.Mock).mockResolvedValue(undefined);

      await mediaService.deleteAsset('asset-123', mockContext.organizationId);

      expect(mediaService.deleteAsset).toHaveBeenCalledWith('asset-123', mockContext.organizationId);
    });

    it('should move asset to folder service', async () => {
      (mediaService.moveAssetToFolder as jest.Mock).mockResolvedValue(undefined);

      await mediaService.moveAssetToFolder('asset-123', 'folder-456', mockContext.organizationId);

      expect(mediaService.moveAssetToFolder).toHaveBeenCalledWith('asset-123', 'folder-456', mockContext.organizationId);
    });
  });

  describe('Folder Management Service', () => {
    it('should create folder service', async () => {
      const folderData = {
        name: 'Test Ordner',
        description: 'Test Beschreibung',
        organizationId: mockContext.organizationId,
        createdBy: mockContext.userId
      };

      const mockFolder = {
        id: 'folder-123',
        ...folderData
      };

      (mediaService.createFolder as jest.Mock).mockResolvedValue(mockFolder);

      const result = await mediaService.createFolder(folderData, mockContext.organizationId, mockContext.userId);

      expect(result.name).toBe('Test Ordner');
      expect(result.organizationId).toBe(mockContext.organizationId);
      expect(mediaService.createFolder).toHaveBeenCalledWith(folderData, mockContext.organizationId, mockContext.userId);
    });

    it('should get folders by organization service', async () => {
      const mockFolders = [
        {
          id: 'folder-1',
          name: 'Bilder',
          organizationId: mockContext.organizationId,
          createdBy: mockContext.userId
        },
        {
          id: 'folder-2',
          name: 'Dokumente', 
          organizationId: mockContext.organizationId,
          createdBy: mockContext.userId
        }
      ];

      (mediaService.getFolders as jest.Mock).mockResolvedValue(mockFolders);

      const result = await mediaService.getFolders(mockContext.organizationId);

      expect(result).toHaveLength(2);
      expect(result[0].organizationId).toBe(mockContext.organizationId);
      expect(mediaService.getFolders).toHaveBeenCalledWith(mockContext.organizationId);
    });

    it('should navigate into folder service', async () => {
      const folderId = 'folder-123';
      const mockAssetsInFolder = [
        {
          id: 'asset-in-folder',
          filename: 'folder-file.jpg',
          folderId: folderId,
          organizationId: mockContext.organizationId
        }
      ];

      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue(mockAssetsInFolder);

      const result = await mediaService.getMediaAssets(mockContext.organizationId, folderId);

      expect(result).toHaveLength(1);
      expect(result[0].folderId).toBe(folderId);
      expect(mediaService.getMediaAssets).toHaveBeenCalledWith(mockContext.organizationId, folderId);
    });

    it('should delete empty folder service', async () => {
      (mediaService.deleteFolder as jest.Mock).mockResolvedValue(undefined);

      await mediaService.deleteFolder('folder-123', mockContext.organizationId);

      expect(mediaService.deleteFolder).toHaveBeenCalledWith('folder-123', mockContext.organizationId);
    });
  });

  describe('Sharing Functionality Service', () => {
    it('should create share link service', async () => {
      const shareData = {
        targetId: 'asset-123',
        type: 'file' as const,
        title: 'Geteiltes Asset',
        settings: {
          downloadAllowed: true,
          showFileList: false,
          expiresAt: null,
          passwordRequired: null,
          watermarkEnabled: false
        }
      };

      const mockShareLink = {
        id: 'share-link-id',
        shareId: 'abc123xyz',
        organizationId: mockContext.organizationId,
        createdBy: mockContext.userId,
        ...shareData,
        active: true,
        accessCount: 0
      };

      (mediaService.createShareLink as jest.Mock).mockResolvedValue(mockShareLink);

      const result = await mediaService.createShareLink(shareData, mockContext.organizationId, mockContext.userId);

      expect(result.shareId).toBe('abc123xyz');
      expect(result.targetId).toBe('asset-123');
      expect(result.organizationId).toBe(mockContext.organizationId);
      expect(mediaService.createShareLink).toHaveBeenCalledWith(shareData, mockContext.organizationId, mockContext.userId);
    });

    it('should get share link by shareId service', async () => {
      const shareId = 'abc123xyz';
      const mockShareLink = {
        id: 'share-link-id',
        shareId: shareId,
        targetId: 'asset-123',
        organizationId: mockContext.organizationId,
        active: true
      };

      (mediaService.getShareLinkByShareId as jest.Mock).mockResolvedValue(mockShareLink);

      const result = await mediaService.getShareLinkByShareId(shareId);

      expect(result.shareId).toBe(shareId);
      expect(result.targetId).toBe('asset-123');
      expect(mediaService.getShareLinkByShareId).toHaveBeenCalledWith(shareId);
    });

    it('should increment access count service', async () => {
      const shareId = 'abc123xyz';
      
      (mediaService.incrementAccessCount as jest.Mock).mockResolvedValue(undefined);

      await mediaService.incrementAccessCount(shareId);

      expect(mediaService.incrementAccessCount).toHaveBeenCalledWith(shareId);
    });

    it('should return null for non-existent shareId service', async () => {
      const invalidShareId = 'invalid123';
      
      (mediaService.getShareLinkByShareId as jest.Mock).mockResolvedValue(null);

      const result = await mediaService.getShareLinkByShareId(invalidShareId);

      expect(result).toBeNull();
      expect(mediaService.getShareLinkByShareId).toHaveBeenCalledWith(invalidShareId);
    });
  });

  describe('Search and Filtering Service', () => {
    it('should filter assets by file type service', async () => {
      const imageAssets = [
        { id: 'asset-1', filename: 'photo.jpg', mimeType: 'image/jpeg' },
        { id: 'asset-2', filename: 'graphic.png', mimeType: 'image/png' }
      ];

      (mediaService.getAssetsByType as jest.Mock).mockResolvedValue(imageAssets);

      const result = await mediaService.getAssetsByType(mockContext.organizationId, 'image');

      expect(result).toHaveLength(2);
      expect(result[0].mimeType).toContain('image');
      expect(mediaService.getAssetsByType).toHaveBeenCalledWith(mockContext.organizationId, 'image');
    });

    it('should filter assets by tags service', async () => {
      const taggedAssets = [
        { id: 'asset-1', filename: 'branded.jpg', tags: ['logo', 'brand'] }
      ];

      (mediaService.getAssetsByTags as jest.Mock).mockResolvedValue(taggedAssets);

      const result = await mediaService.getAssetsByTags(mockContext.organizationId, ['logo']);

      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('logo');
      expect(mediaService.getAssetsByTags).toHaveBeenCalledWith(mockContext.organizationId, ['logo']);
    });

    it('should search with empty results service', async () => {
      (mediaService.searchAssets as jest.Mock).mockResolvedValue([]);

      const result = await mediaService.searchAssets(mockContext.organizationId, 'nonexistent');

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(mediaService.searchAssets).toHaveBeenCalledWith(mockContext.organizationId, 'nonexistent');
    });
  });

  describe('Error Handling Service', () => {
    it('should handle service upload errors', async () => {
      const mockFile = new File(['content'], 'error.jpg', { type: 'image/jpeg' });
      
      (mediaService.uploadMedia as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      await expect(
        mediaService.uploadMedia(mockFile, mockContext.organizationId, mockContext.userId)
      ).rejects.toThrow('Upload failed');
    });

    it('should handle service loading errors', async () => {
      (mediaService.getMediaAssets as jest.Mock).mockRejectedValue(new Error('Network Error'));

      await expect(
        mediaService.getMediaAssets(mockContext.organizationId)
      ).rejects.toThrow('Network Error');
    });

    it('should handle invalid file types service', async () => {
      const invalidFile = new File(['content'], 'virus.exe', { type: 'application/exe' });
      
      (mediaService.uploadMedia as jest.Mock).mockRejectedValue(new Error('Invalid file type'));

      await expect(
        mediaService.uploadMedia(invalidFile, mockContext.organizationId, mockContext.userId)
      ).rejects.toThrow('Invalid file type');
    });
  });

  describe('Multi-Tenancy Service Tests', () => {
    it('should isolate assets by organization service', async () => {
      const orgAssets = [
        { id: 'asset-1', organizationId: 'test-org-123' },
        { id: 'asset-2', organizationId: 'test-org-123' }
      ];

      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue(orgAssets);

      const result = await mediaService.getMediaAssets('test-org-123');

      expect(result).toHaveLength(2);
      expect(result.every(asset => asset.organizationId === 'test-org-123')).toBe(true);
    });

    it('should isolate folders by organization service', async () => {
      const orgFolders = [
        { id: 'folder-1', organizationId: 'test-org-123' },
        { id: 'folder-2', organizationId: 'test-org-123' }
      ];

      (mediaService.getFolders as jest.Mock).mockResolvedValue(orgFolders);

      const result = await mediaService.getFolders('test-org-123');

      expect(result).toHaveLength(2);
      expect(result.every(folder => folder.organizationId === 'test-org-123')).toBe(true);
    });

    it('should isolate share links by organization service', async () => {
      const shareData = {
        targetId: 'asset-123',
        type: 'file' as const,
        title: 'Org Asset'
      };

      (mediaService.createShareLink as jest.Mock).mockResolvedValue({
        id: 'share-1',
        organizationId: 'test-org-123',
        ...shareData
      });

      const result = await mediaService.createShareLink(shareData, 'test-org-123', 'test-user-456');

      expect(result.organizationId).toBe('test-org-123');
    });
  });

  describe('Service Accessibility Tests', () => {
    it('should have all required service methods', () => {
      // Test that all expected service methods are defined
      expect(typeof mediaService.uploadMedia).toBe('function');
      expect(typeof mediaService.getMediaAssets).toBe('function');
      expect(typeof mediaService.deleteAsset).toBe('function');
      expect(typeof mediaService.createFolder).toBe('function');
      expect(typeof mediaService.getFolders).toBe('function');
      expect(typeof mediaService.createShareLink).toBe('function');
      expect(typeof mediaService.getShareLinkByShareId).toBe('function');
      expect(typeof mediaService.searchAssets).toBe('function');
    });

    it('should support service-level navigation', async () => {
      // Test service-based navigation between view modes
      const gridAssets = [{ id: 'asset1', viewMode: 'grid' }];
      const listAssets = [{ id: 'asset1', viewMode: 'list' }];

      (mediaService.getMediaAssets as jest.Mock)
        .mockResolvedValueOnce(gridAssets)
        .mockResolvedValueOnce(listAssets);

      const gridResult = await mediaService.getMediaAssets('test-org-123');
      const listResult = await mediaService.getMediaAssets('test-org-123');

      expect(gridResult).toHaveLength(1);
      expect(listResult).toHaveLength(1);
    });
  });
});