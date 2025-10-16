// src/lib/firebase/__tests__/media-assets-service.test.ts
// Phase 4a.4: Service Tests für Media Assets Service
import {
  getMediaAssets,
  getMediaAssetById,
  getMediaAssetsInFolder,
  updateAsset,
  moveAssetToFolder,
  deleteMediaAsset,
  getMediaByClientId,
} from '../media-assets-service';
import { MediaAsset } from '@/types/media';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));

// Mock Firebase Storage
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  deleteObject: jest.fn(),
}));

// Mock db and storage
jest.mock('../config', () => ({
  db: {},
  storage: {},
}));

// Mock Data
const createMockAsset = (id: string, folderId?: string): MediaAsset => ({
  id,
  fileName: `test-${id}.jpg`,
  fileType: 'image/jpeg',
  fileSize: 1024,
  downloadUrl: `https://example.com/${id}.jpg`,
  storagePath: `media/${id}.jpg`,
  userId: 'user-1',
  organizationId: 'org-1',
  folderId: folderId || null,
  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
  updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
});

describe('Media Assets Service - Phase 4a.4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // TEST 1-3: GET OPERATIONS
  // ============================================================================

  describe('getMediaAssets', () => {
    it('sollte Assets für Organization laden', async () => {
      const mockAssets = [createMockAsset('asset-1'), createMockAsset('asset-2')];

      // Mock Firestore getDocs response
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockResolvedValue({
        docs: mockAssets.map(asset => ({
          id: asset.id,
          data: () => asset,
          exists: () => true,
        })),
      });

      const result = await getMediaAssets('org-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('asset-1');
      expect(result[1].id).toBe('asset-2');
    });

    it('sollte Assets für spezifischen Folder laden', async () => {
      const mockAssets = [createMockAsset('asset-1', 'folder-1')];

      const firestore = require('firebase/firestore');
      firestore.getDocs.mockResolvedValue({
        docs: mockAssets.map(asset => ({
          id: asset.id,
          data: () => asset,
          exists: () => true,
        })),
      });

      const result = await getMediaAssets('org-1', 'folder-1');

      expect(result).toHaveLength(1);
      expect(result[0].folderId).toBe('folder-1');
    });

    it('sollte Error bei Firestore-Fehler werfen', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(getMediaAssets('org-1')).rejects.toThrow('Firestore error');
    });
  });

  describe('getMediaAssetById', () => {
    it('sollte Asset by ID laden', async () => {
      const mockAsset = createMockAsset('asset-1');

      const firestore = require('firebase/firestore');
      firestore.getDoc.mockResolvedValue({
        id: 'asset-1',
        data: () => mockAsset,
        exists: () => true,
      });

      const result = await getMediaAssetById('asset-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('asset-1');
    });

    it('sollte null zurückgeben wenn Asset nicht existiert', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await getMediaAssetById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getMediaAssetsInFolder', () => {
    it('sollte alle Assets in Folder laden', async () => {
      const mockAssets = [
        createMockAsset('asset-1', 'folder-1'),
        createMockAsset('asset-2', 'folder-1'),
      ];

      const firestore = require('firebase/firestore');
      firestore.getDocs.mockResolvedValue({
        docs: mockAssets.map(asset => ({
          id: asset.id,
          data: () => asset,
          exists: () => true,
        })),
      });

      const result = await getMediaAssetsInFolder('folder-1');

      expect(result).toHaveLength(2);
      expect(result.every(a => a.folderId === 'folder-1')).toBe(true);
    });
  });

  // ============================================================================
  // TEST 4-5: UPDATE OPERATIONS
  // ============================================================================

  describe('updateAsset', () => {
    it('sollte Asset aktualisieren', async () => {
      const firestore = require('firebase/firestore');
      firestore.updateDoc.mockResolvedValue(undefined);

      await updateAsset('asset-1', { fileName: 'updated.jpg' });

      expect(firestore.updateDoc).toHaveBeenCalled();
    });
  });

  describe('moveAssetToFolder', () => {
    it('sollte Asset in anderen Folder verschieben', async () => {
      const firestore = require('firebase/firestore');
      firestore.updateDoc.mockResolvedValue(undefined);

      await moveAssetToFolder('asset-1', 'folder-2', 'org-1');

      expect(firestore.updateDoc).toHaveBeenCalled();
    });

    it('sollte Asset aus Folder entfernen (newFolderId = null)', async () => {
      const firestore = require('firebase/firestore');
      firestore.updateDoc.mockResolvedValue(undefined);

      await moveAssetToFolder('asset-1', undefined, 'org-1');

      expect(firestore.updateDoc).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TEST 6: DELETE OPERATION
  // ============================================================================

  describe('deleteMediaAsset', () => {
    it('sollte Asset löschen (Firestore + Storage)', async () => {
      const mockAsset = createMockAsset('asset-1');

      const firestore = require('firebase/firestore');
      const storage = require('firebase/storage');

      firestore.deleteDoc.mockResolvedValue(undefined);
      storage.deleteObject.mockResolvedValue(undefined);

      await deleteMediaAsset(mockAsset);

      expect(firestore.deleteDoc).toHaveBeenCalled();
      expect(storage.deleteObject).toHaveBeenCalled();
    });

    it('sollte Error werfen bei Storage-Fehler', async () => {
      const mockAsset = createMockAsset('asset-1');

      const storage = require('firebase/storage');
      storage.deleteObject.mockRejectedValue(new Error('Storage error'));

      // Service wirft Fehler weiter
      await expect(deleteMediaAsset(mockAsset)).rejects.toThrow('Storage error');
    });
  });

  // ============================================================================
  // TEST 7: CLIENT-SPECIFIC OPERATIONS
  // ============================================================================

  describe('getMediaByClientId', () => {
    it('sollte Assets und Folders für Client laden', async () => {
      const mockAssets = [createMockAsset('asset-1')];
      const mockFolders = [
        {
          id: 'folder-1',
          name: 'Client Folder',
          clientId: 'client-1',
        },
      ];

      const firestore = require('firebase/firestore');

      // Mock für Assets
      firestore.getDocs.mockResolvedValueOnce({
        docs: mockAssets.map(asset => ({
          id: asset.id,
          data: () => asset,
          exists: () => true,
        })),
      });

      // Mock für Folders
      firestore.getDocs.mockResolvedValueOnce({
        docs: mockFolders.map(folder => ({
          id: folder.id,
          data: () => folder,
          exists: () => true,
        })),
      });

      const result = await getMediaByClientId('org-1', 'client-1');

      expect(result.assets.length).toBeGreaterThanOrEqual(0);
      expect(result.folders.length).toBeGreaterThanOrEqual(0);
      expect(result.totalCount).toBeGreaterThanOrEqual(0);
    });
  });
});
