// src/lib/firebase/__tests__/media-folders-service.test.ts
// Phase 4a.4: Service Tests für Media Folders Service
import {
  createFolder,
  getFolders,
  getFolder,
  getAllFoldersForOrganization,
  updateFolder,
  deleteFolder,
  hasFilesInFolder,
  hasSubfolders,
  getBreadcrumbs,
  getFolderFileCount,
  moveFolderToParent,
} from '../media-folders-service';
import { MediaFolder } from '@/types/media';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
}));

// Mock db
jest.mock('../config', () => ({
  db: {},
}));

// Mock folder-utils
jest.mock('@/lib/utils/folder-utils', () => ({
  getRootFolderClientId: jest.fn().mockResolvedValue('client-1'),
}));

// Mock media-assets-service
jest.mock('../media-assets-service', () => ({
  getMediaAssetsInFolder: jest.fn().mockResolvedValue([]),
  updateAsset: jest.fn().mockResolvedValue(undefined),
}));

// Mock Data
const createMockFolder = (id: string, overrides?: Partial<MediaFolder>): MediaFolder => ({
  id,
  name: `Test Folder ${id}`,
  userId: 'user-1',
  organizationId: 'org-1',
  parentFolderId: null,
  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
  updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
  ...overrides,
});

describe('Media Folders Service - Phase 4a.4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // TEST 1: CREATE OPERATION
  // ============================================================================

  describe('createFolder', () => {
    it('sollte Folder erstellen und ID zurückgeben', async () => {
      const firestore = require('firebase/firestore');
      firestore.addDoc.mockResolvedValue({ id: 'folder-1' });

      const result = await createFolder(
        {
          name: 'New Folder',
          userId: 'user-1',
          organizationId: 'org-1',
          parentFolderId: null,
        },
        {
          organizationId: 'org-1',
          userId: 'user-1',
        }
      );

      expect(result).toBe('folder-1');
      expect(firestore.addDoc).toHaveBeenCalled();
    });

    it('sollte Folder mit optionalen Feldern erstellen', async () => {
      const firestore = require('firebase/firestore');
      firestore.addDoc.mockResolvedValue({ id: 'folder-2' });

      const result = await createFolder(
        {
          name: 'New Folder',
          description: 'Test description',
          color: '#ff0000',
          clientId: 'client-1',
          userId: 'user-1',
          organizationId: 'org-1',
          parentFolderId: 'parent-1',
        },
        {
          organizationId: 'org-1',
          userId: 'user-1',
        }
      );

      expect(result).toBe('folder-2');
      expect(firestore.addDoc).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TEST 2-4: READ OPERATIONS
  // ============================================================================

  describe('getFolders', () => {
    it('sollte Root-Folders für Organization laden', async () => {
      const mockFolders = [createMockFolder('folder-1'), createMockFolder('folder-2')];

      const firestore = require('firebase/firestore');
      firestore.getDocs.mockResolvedValue({
        docs: mockFolders.map(folder => ({
          id: folder.id,
          data: () => folder,
          exists: () => true,
        })),
      });

      const result = await getFolders('org-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('folder-1');
      expect(result[1].id).toBe('folder-2');
    });

    it('sollte Subfolders für Parent laden', async () => {
      const mockFolders = [createMockFolder('folder-1', { parentFolderId: 'parent-1' })];

      const firestore = require('firebase/firestore');
      firestore.getDocs.mockResolvedValue({
        docs: mockFolders.map(folder => ({
          id: folder.id,
          data: () => folder,
          exists: () => true,
        })),
      });

      const result = await getFolders('org-1', 'parent-1');

      expect(result).toHaveLength(1);
      expect(result[0].parentFolderId).toBe('parent-1');
    });

    it('sollte Error bei Firestore-Fehler werfen', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(getFolders('org-1')).rejects.toThrow('Firestore error');
    });
  });

  describe('getFolder', () => {
    it('sollte Folder by ID laden', async () => {
      const mockFolder = createMockFolder('folder-1');

      const firestore = require('firebase/firestore');
      firestore.getDoc.mockResolvedValue({
        id: 'folder-1',
        data: () => mockFolder,
        exists: () => true,
      });

      const result = await getFolder('folder-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('folder-1');
    });

    it('sollte null zurückgeben wenn Folder nicht existiert', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await getFolder('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAllFoldersForOrganization', () => {
    it('sollte alle Folders für Organization laden', async () => {
      const mockFolders = [
        createMockFolder('folder-1'),
        createMockFolder('folder-2', { parentFolderId: 'folder-1' }),
      ];

      const firestore = require('firebase/firestore');
      firestore.getDocs.mockResolvedValue({
        docs: mockFolders.map(folder => ({
          id: folder.id,
          data: () => folder,
          exists: () => true,
        })),
      });

      const result = await getAllFoldersForOrganization('org-1');

      expect(result).toHaveLength(2);
    });
  });

  // ============================================================================
  // TEST 5-6: UPDATE OPERATIONS
  // ============================================================================

  describe('updateFolder', () => {
    it('sollte Folder aktualisieren', async () => {
      const firestore = require('firebase/firestore');
      firestore.updateDoc.mockResolvedValue(undefined);

      await updateFolder('folder-1', { name: 'Updated Folder' });

      expect(firestore.updateDoc).toHaveBeenCalled();
    });
  });

  describe('moveFolderToParent', () => {
    it('sollte Folder zu neuem Parent verschieben', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDoc.mockResolvedValue({
        id: 'parent-1',
        data: () => createMockFolder('parent-1'),
        exists: () => true,
      });
      firestore.getDocs.mockResolvedValue({
        docs: [],
      });
      firestore.updateDoc.mockResolvedValue(undefined);

      await moveFolderToParent('folder-1', 'parent-1', 'org-1');

      expect(firestore.updateDoc).toHaveBeenCalled();
    });

    it('sollte Error werfen bei zirkulärer Referenz', async () => {
      const firestore = require('firebase/firestore');
      // Mock getFolder für Circular Reference Check
      firestore.getDoc.mockResolvedValue({
        id: 'folder-1',
        data: () => createMockFolder('folder-1', { parentFolderId: 'folder-2' }),
        exists: () => true,
      });

      await expect(
        moveFolderToParent('folder-1', 'folder-1', 'org-1')
      ).rejects.toThrow('zirkuläre Referenz');
    });
  });

  // ============================================================================
  // TEST 7-8: DELETE OPERATIONS
  // ============================================================================

  describe('deleteFolder', () => {
    it('sollte leeren Folder löschen', async () => {
      const firestore = require('firebase/firestore');

      // Mock hasFilesInFolder -> false
      firestore.getDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      // Mock hasSubfolders -> false
      firestore.getDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      firestore.deleteDoc.mockResolvedValue(undefined);

      await deleteFolder('folder-1');

      expect(firestore.deleteDoc).toHaveBeenCalled();
    });

    it('sollte Error werfen wenn Folder nicht leer', async () => {
      const firestore = require('firebase/firestore');

      // Mock hasFilesInFolder -> true (hat Files)
      firestore.getDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'asset-1' }],
      });

      await expect(deleteFolder('folder-1')).rejects.toThrow('Enthält noch Dateien oder Unterordner');
    });
  });

  // ============================================================================
  // TEST 9-10: UTILITY OPERATIONS
  // ============================================================================

  describe('hasFilesInFolder', () => {
    it('sollte true zurückgeben wenn Files existieren', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'asset-1' }],
      });

      const result = await hasFilesInFolder('folder-1');

      expect(result).toBe(true);
    });

    it('sollte false zurückgeben wenn keine Files existieren', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await hasFilesInFolder('folder-1');

      expect(result).toBe(false);
    });
  });

  describe('hasSubfolders', () => {
    it('sollte true zurückgeben wenn Subfolders existieren', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'subfolder-1' }],
      });

      const result = await hasSubfolders('folder-1');

      expect(result).toBe(true);
    });

    it('sollte false zurückgeben wenn keine Subfolders existieren', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await hasSubfolders('folder-1');

      expect(result).toBe(false);
    });
  });

  describe('getBreadcrumbs', () => {
    it('sollte Breadcrumbs für Folder-Pfad zurückgeben', async () => {
      const firestore = require('firebase/firestore');

      // Mock getFolder für folder-1 (parent: folder-2)
      firestore.getDoc
        .mockResolvedValueOnce({
          id: 'folder-1',
          data: () => createMockFolder('folder-1', { name: 'Child', parentFolderId: 'folder-2' }),
          exists: () => true,
        })
        // Mock getFolder für folder-2 (parent: null)
        .mockResolvedValueOnce({
          id: 'folder-2',
          data: () => createMockFolder('folder-2', { name: 'Parent', parentFolderId: null }),
          exists: () => true,
        });

      const result = await getBreadcrumbs('folder-1');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[result.length - 1].id).toBe('folder-1');
    });

    it('sollte leeres Array bei Error zurückgeben', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await getBreadcrumbs('folder-1');

      expect(result).toEqual([]);
    });
  });

  describe('getFolderFileCount', () => {
    it('sollte Anzahl der Files in Folder zurückgeben', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockResolvedValue({
        size: 5,
        docs: [{}, {}, {}, {}, {}],
      });

      const result = await getFolderFileCount('folder-1');

      expect(result).toBe(5);
    });

    it('sollte 0 bei Error zurückgeben', async () => {
      const firestore = require('firebase/firestore');
      firestore.getDocs.mockRejectedValue(new Error('Firestore error'));

      const result = await getFolderFileCount('folder-1');

      expect(result).toBe(0);
    });
  });
});
