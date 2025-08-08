// src/__tests__/features/media-library-service.test.ts
import { mediaService } from '@/lib/firebase/media-service';
import { MediaAsset, MediaFolder, CreateShareLinkData } from '@/types/media';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(),
  })),
  increment: jest.fn(),
  arrayUnion: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {},
  storage: {},
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-nanoid'),
}));

const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>;
const mockUploadBytes = uploadBytes as jest.MockedFunction<typeof uploadBytes>;
const mockUploadBytesResumable = uploadBytesResumable as jest.MockedFunction<typeof uploadBytesResumable>;
const mockGetDownloadURL = getDownloadURL as jest.MockedFunction<typeof getDownloadURL>;
const mockDeleteObject = deleteObject as jest.MockedFunction<typeof deleteObject>;

describe('MediaService', () => {
  const mockContext = {
    organizationId: 'test-org-123',
    userId: 'test-user-456',
  };

  const mockAssetData: Partial<MediaAsset> = {
    fileName: 'test-image.jpg',
    fileType: 'image/jpeg',
    fileSize: 1024000,
    downloadUrl: 'https://example.com/test-image.jpg',
    thumbnailUrl: 'https://example.com/thumb-test-image.jpg',
    folderId: null,
    tags: ['presse', 'produkt'],
    metadata: {
      width: 1920,
      height: 1080,
    },
    uploadedBy: 'test-user-456',
  };

  const mockFolderData: Partial<MediaFolder> = {
    name: 'Test Ordner',
    description: 'Test Beschreibung',
    parentId: null,
    color: 'blue',
    assetCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Asset Operations', () => {
    it('should upload asset with correct metadata', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const mockDocRef = { id: 'new-asset-id' };
      
      mockUploadBytesResumable.mockReturnValue({
        on: jest.fn().mockImplementation((event, progress, error, complete) => {
          // Simulate successful upload
          setTimeout(() => complete(), 10);
        }),
        snapshot: { ref: {} }
      } as any);
      mockGetDownloadURL.mockResolvedValue('https://example.com/uploaded-file.jpg');
      mockAddDoc.mockResolvedValue(mockDocRef as any);

      const result = await mediaService.uploadMedia(
        mockFile,
        mockContext.organizationId,
        null,
        undefined,
        3,
        mockContext
      );

      expect(mockUploadBytes).toHaveBeenCalled();
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fileName: 'test.jpg',
          fileType: 'image/jpeg',
          fileSize: mockFile.size,
          organizationId: mockContext.organizationId,
          uploadedBy: mockContext.userId,
          folderId: null,
          tags: [],
          metadata: {},
        })
      );

      expect(result.id).toBe('new-asset-id');
    });

    it('should get assets by organization', async () => {
      const mockAssetDoc = {
        id: 'asset-1',
        data: () => ({
          ...mockAssetData,
          id: 'asset-1',
          organizationId: mockContext.organizationId,
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockAssetDoc],
        empty: false,
      } as any);

      const result = await mediaService.getMediaAssets(mockContext.organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        where('organizationId', '==', mockContext.organizationId),
        orderBy('createdAt', 'desc')
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'asset-1',
        fileName: 'test-image.jpg',
      }));
    });

    it('should get assets by folder', async () => {
      const folderId = 'folder-123';
      const mockAssetDoc = {
        id: 'asset-1',
        data: () => ({ ...mockAssetData, folderId }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockAssetDoc],
        empty: false,
      } as any);

      await mediaService.getMediaAssets(mockContext.organizationId, folderId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        where('organizationId', '==', mockContext.organizationId),
        where('folderId', '==', folderId),
        orderBy('createdAt', 'desc')
      );
    });

    it('should delete asset and storage file', async () => {
      const assetId = 'asset-123';
      const mockAssetDoc = {
        exists: () => true,
        data: () => ({
          ...mockAssetData,
          downloadUrl: 'https://example.com/test-image.jpg',
        }),
      };

      mockGetDoc.mockResolvedValue(mockAssetDoc as any);
      mockDeleteDoc.mockResolvedValue(undefined);
      mockDeleteObject.mockResolvedValue(undefined);

      await mediaService.deleteMediaAsset({ id: assetId, ...mockAssetData, storagePath: 'test/path' } as MediaAsset);

      expect(mockDeleteDoc).toHaveBeenCalled();
      expect(mockDeleteObject).toHaveBeenCalled();
    });

    it('should move asset to different folder', async () => {
      const assetId = 'asset-123';
      const targetFolderId = 'folder-456';

      mockUpdateDoc.mockResolvedValue(undefined);

      await mediaService.moveAssetToFolder(assetId, targetFolderId, mockContext.organizationId);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          folderId: targetFolderId,
          updatedAt: expect.anything(),
        })
      );
    });
  });

  describe('Folder Operations', () => {
    it('should create folder with correct data structure', async () => {
      const mockDocRef = { id: 'new-folder-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);

      const result = await mediaService.createFolder(mockFolderData as any, mockContext);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...mockFolderData,
          organizationId: mockContext.organizationId,
          createdBy: mockContext.userId,
          assetCount: 0,
          createdAt: expect.anything(),
          updatedAt: expect.anything(),
        })
      );

      expect(result).toBe('new-folder-id');
    });

    it('should get folders by organization', async () => {
      const mockFolderDoc = {
        id: 'folder-1',
        data: () => ({
          ...mockFolderData,
          id: 'folder-1',
          organizationId: mockContext.organizationId,
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockFolderDoc],
        empty: false,
      } as any);

      const result = await mediaService.getFolders(mockContext.organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        where('organizationId', '==', mockContext.organizationId),
        where('organizationId', '==', mockContext.organizationId)
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'folder-1',
        name: 'Test Ordner',
      }));
    });

    it('should delete folder if empty', async () => {
      const folderId = 'folder-123';
      
      // Mock empty folder check
      mockGetDocs.mockResolvedValue({ docs: [], empty: true } as any);
      mockDeleteDoc.mockResolvedValue(undefined);

      await mediaService.deleteFolder(folderId);

      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it('should throw error when deleting non-empty folder', async () => {
      const folderId = 'folder-123';
      
      // Mock non-empty folder check
      mockGetDocs.mockResolvedValue({ 
        docs: [{ id: 'asset-1' }], 
        empty: false 
      } as any);

      await expect(
        mediaService.deleteFolder(folderId)
      ).rejects.toThrow('Ordner kann nicht gelöscht werden');
    });
  });

  describe('Share Link Operations', () => {
    const mockShareData: CreateShareLinkData = {
      targetId: 'asset-123',
      type: 'file',
      title: 'Geteiltes Asset',
      organizationId: mockContext.organizationId,
      createdBy: mockContext.userId,
      isActive: true,
      settings: {
        downloadAllowed: true,
        showFileList: false,
        expiresAt: null,
        passwordRequired: null,
        watermarkEnabled: false,
      },
    };

    it('should create share link with unique shareId', async () => {
      const mockDocRef = { id: 'share-link-id' };
      mockAddDoc.mockResolvedValue(mockDocRef as any);

      const result = await mediaService.createShareLink(mockShareData);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...mockShareData,
          shareId: expect.stringMatching(/^[a-zA-Z0-9_-]{12}$/),
          accessCount: 0,
          createdAt: expect.anything(),
          updatedAt: expect.anything(),
        })
      );

      expect(result).toEqual(expect.objectContaining({
        id: 'share-link-id',
        shareId: expect.any(String),
      }));
    });

    it('should get share link by shareId', async () => {
      const shareId = 'abc123def456';
      const mockShareDoc = {
        exists: () => true,
        id: 'share-link-1',
        data: () => ({
          ...mockShareData,
          shareId,
          id: 'share-link-1',
        }),
      };

      mockGetDocs.mockResolvedValue({
        docs: [mockShareDoc],
        empty: false,
      } as any);

      const result = await mediaService.getShareLinkByShareId(shareId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        where('shareId', '==', shareId),
        where('active', '==', true)
      );

      expect(result).toEqual(expect.objectContaining({
        shareId,
        targetId: 'asset-123',
      }));
    });

    it('should return null for non-existent shareId', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [],
        empty: true,
      } as any);

      const result = await mediaService.getShareLinkByShareId('non-existent');

      expect(result).toBeNull();
    });

    it('should increment access count when link is accessed', async () => {
      const shareId = 'abc123def456';

      mockUpdateDoc.mockResolvedValue(undefined);

      await mediaService.incrementShareAccess('share-link-1');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          accessCount: expect.anything(), // increment function
          lastAccessedAt: expect.anything(),
        })
      );
    });
  });

  describe('Search and Filtering', () => {
    it('should search assets by filename', async () => {
      const searchTerm = 'test-image';
      const mockResults = [
        { id: 'asset-1', data: () => ({ fileName: 'test-image.jpg' }) },
        { id: 'asset-2', data: () => ({ fileName: 'test-image-2.png' }) },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockResults,
        empty: false,
      } as any);

      const result = await mediaService.getMediaAssets(mockContext.organizationId);

      expect(result).toHaveLength(2);
    });

    it('should filter assets by file type', async () => {
      const mockResults = [
        { id: 'asset-1', data: () => ({ fileType: 'image/jpeg' }) },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockResults,
        empty: false,
      } as any);

      await mediaService.getMediaAssets(mockContext.organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        where('organizationId', '==', mockContext.organizationId),
        where('fileType', 'in', ['image/jpeg']),
        orderBy('createdAt', 'desc')
      );
    });

    it('should filter assets by tags', async () => {
      const mockResults = [
        { id: 'asset-1', data: () => ({ tags: ['presse', 'produkt'] }) },
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockResults,
        empty: false,
      } as any);

      await mediaService.getMediaAssets(mockContext.organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        where('organizationId', '==', mockContext.organizationId),
        where('tags', 'array-contains-any', ['presse']),
        orderBy('createdAt', 'desc')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Firestore errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore connection error'));

      await expect(
        mediaService.getMediaAssets(mockContext.organizationId)
      ).rejects.toThrow('Firestore connection error');
    });

    it('should handle Storage upload errors', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockUploadBytesResumable.mockReturnValue({
        on: jest.fn().mockImplementation((event, progress, error, complete) => {
          error(new Error('Storage upload failed'));
        })
      } as any);

      await expect(
        mediaService.uploadMedia(mockFile, mockContext.organizationId, null, undefined, 3, mockContext)
      ).rejects.toThrow('Storage upload failed');
    });

    it('should handle invalid file types', async () => {
      const mockFile = new File(['test'], 'test.exe', { type: 'application/x-executable' });

      await expect(
        mediaService.uploadMedia(mockFile, mockContext.organizationId, null, undefined, 3, mockContext)
      ).rejects.toThrow();
    });
  });

  describe('Data Validation', () => {
    it('should validate asset data before creation', async () => {
      const invalidData = {
        fileName: '',  // Invalid: empty filename
        organizationId: mockContext.organizationId,
      };

      await expect(
        mediaService.uploadMedia(new File([''], ''), mockContext.organizationId, null, undefined, 3, mockContext)
      ).rejects.toThrow();
    });

    it('should validate folder data before creation', async () => {
      const invalidData = {
        name: '',  // Invalid: empty name
        organizationId: mockContext.organizationId,
      };

      await expect(
        mediaService.createFolder(invalidData as any, mockContext)
      ).rejects.toThrow();
    });

    it('should validate shareId format', async () => {
      const invalidShareId = 'invalid-share-id-format';

      await expect(
        Promise.resolve(mediaService.getShareLinkByShareId(invalidShareId))
      ).resolves.toBeNull();
    });
  });
});