// src/app/dashboard/library/media/__tests__/integration/media-crud-flow.test.tsx
// Phase 4a.2: Integration Tests für Media CRUD-Flows
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useMediaAssets,
  useUploadMediaAsset,
  useDeleteMediaAsset,
  useBulkDeleteAssets,
  useMediaFolders,
  useCreateFolder,
  useDeleteFolder,
  useMoveAsset,
  useMoveFolder,
  useUpdateFolder,
} from '@/lib/hooks/useMediaData';
import { mediaService } from '@/lib/firebase/media-service';
import { MediaAsset, MediaFolder } from '@/types/media';

// Mock Firebase Service
jest.mock('@/lib/firebase/media-service');

// Add uploadMediaWithRetry to mock (doesn't exist in service but used by hook)
beforeAll(() => {
  (mediaService as any).uploadMediaWithRetry = jest.fn();
});

// Test Wrapper mit QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

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

const createMockFolder = (id: string, parentId?: string): MediaFolder => ({
  id,
  name: `Folder ${id}`,
  userId: 'user-1',
  organizationId: 'org-1',
  parentFolderId: parentId || null,
  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
  updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
});

const createMockFile = (name: string): File => {
  const blob = new Blob(['test content'], { type: 'image/jpeg' });
  return new File([blob], name, { type: 'image/jpeg' });
};

describe('Media CRUD Flow Integration Tests - Phase 4a.2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // TEST 1: UPLOAD-FLOW
  // ============================================================================

  describe('Upload-Flow', () => {
    it('sollte kompletten Upload → Read → Delete Flow durchlaufen', async () => {
      const mockAsset = createMockAsset('asset-1');
      const file = createMockFile('test.jpg');

      // 1. Initial: Leere Mediathek laden
      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue([]);

      const { result: assetsResult } = renderHook(
        () => useMediaAssets('org-1', null),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(assetsResult.current.isSuccess).toBe(true));
      expect(assetsResult.current.data).toEqual([]);

      // 2. Upload-Hook initialisieren
      (mediaService.uploadMediaWithRetry as jest.Mock).mockResolvedValue(mockAsset);

      const { result: uploadResult } = renderHook(
        () => useUploadMediaAsset(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(uploadResult.current).toBeDefined());

      // 3. Datei hochladen
      await uploadResult.current.mutateAsync({
        file,
        organizationId: 'org-1',
        folderId: undefined,
      });

      expect(mediaService.uploadMediaWithRetry).toHaveBeenCalledWith(
        file,
        'org-1',
        undefined,
        undefined,
        3,
        undefined
      );

      // 4. Asset in Liste sehen (nach Upload)
      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue([mockAsset]);

      const { result: assetsAfterUpload } = renderHook(
        () => useMediaAssets('org-1', null),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(assetsAfterUpload.current.isSuccess).toBe(true));
      expect(assetsAfterUpload.current.data).toHaveLength(1);
      expect(assetsAfterUpload.current.data![0].id).toBe('asset-1');

      // 5. Asset löschen
      (mediaService.deleteMediaAsset as jest.Mock).mockResolvedValue(undefined);

      const { result: deleteResult } = renderHook(
        () => useDeleteMediaAsset(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(deleteResult.current).toBeDefined());

      await deleteResult.current.mutateAsync({
        asset: mockAsset,
        organizationId: 'org-1',
      });

      expect(mediaService.deleteMediaAsset).toHaveBeenCalledWith(mockAsset);

      // 6. Asset nicht mehr in Liste (nach Delete)
      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue([]);

      const { result: assetsAfterDelete } = renderHook(
        () => useMediaAssets('org-1', null),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(assetsAfterDelete.current.isSuccess).toBe(true));
      expect(assetsAfterDelete.current.data).toEqual([]);
    });
  });

  // ============================================================================
  // TEST 2: FOLDER-FLOW
  // ============================================================================

  describe('Folder-Flow', () => {
    it('sollte kompletten Create Folder → Upload in Folder → Delete Folder Flow durchlaufen', async () => {
      const mockFolder = createMockFolder('folder-1');
      const mockAsset = createMockAsset('asset-1', 'folder-1');
      const file = createMockFile('test.jpg');

      // 1. Folder erstellen
      (mediaService.createFolder as jest.Mock).mockResolvedValue(mockFolder);

      const { result: createFolderResult } = renderHook(
        () => useCreateFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(createFolderResult.current).toBeDefined());

      await createFolderResult.current.mutateAsync({
        folder: {
          name: 'Folder folder-1',
          userId: 'user-1',
          organizationId: 'org-1',
          parentFolderId: null,
        },
        context: {
          organizationId: 'org-1',
          userId: 'user-1',
        },
      });

      expect(mediaService.createFolder).toHaveBeenCalled();

      // 2. Folder in Liste sehen
      (mediaService.getFolders as jest.Mock).mockResolvedValue([mockFolder]);

      const { result: foldersResult } = renderHook(
        () => useMediaFolders('org-1', null),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(foldersResult.current.isSuccess).toBe(true));
      expect(foldersResult.current.data).toHaveLength(1);
      expect(foldersResult.current.data![0].id).toBe('folder-1');

      // 3. Asset in Folder hochladen
      (mediaService.uploadMediaWithRetry as jest.Mock).mockResolvedValue(mockAsset);

      const { result: uploadResult } = renderHook(
        () => useUploadMediaAsset(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(uploadResult.current).toBeDefined());

      await uploadResult.current.mutateAsync({
        file,
        organizationId: 'org-1',
        folderId: 'folder-1',
      });

      expect(mediaService.uploadMediaWithRetry).toHaveBeenCalledWith(
        file,
        'org-1',
        'folder-1',
        undefined,
        3,
        undefined
      );

      // 4. Asset in Folder sehen
      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue([mockAsset]);

      const { result: assetsInFolder } = renderHook(
        () => useMediaAssets('org-1', 'folder-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(assetsInFolder.current.isSuccess).toBe(true));
      expect(assetsInFolder.current.data).toHaveLength(1);
      expect(assetsInFolder.current.data![0].folderId).toBe('folder-1');

      // 5. Folder löschen (sollte Assets beinhalten - könnte Error werfen)
      (mediaService.deleteFolder as jest.Mock).mockResolvedValue(undefined);

      const { result: deleteFolderResult } = renderHook(
        () => useDeleteFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(deleteFolderResult.current).toBeDefined());

      await deleteFolderResult.current.mutateAsync({
        folderId: 'folder-1',
        organizationId: 'org-1',
      });

      expect(mediaService.deleteFolder).toHaveBeenCalledWith('folder-1');
    });
  });

  // ============================================================================
  // TEST 3: MOVE-FLOW
  // ============================================================================

  describe('Move-Flow', () => {
    it('sollte Asset in Folder verschieben', async () => {
      const mockFolder = createMockFolder('folder-1');
      const mockAssetRoot = createMockAsset('asset-1', null);
      const mockAssetInFolder = createMockAsset('asset-1', 'folder-1');

      // 1. Folder erstellen
      (mediaService.createFolder as jest.Mock).mockResolvedValue(mockFolder);
      (mediaService.getFolders as jest.Mock).mockResolvedValue([mockFolder]);

      const { result: createFolderResult } = renderHook(
        () => useCreateFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(createFolderResult.current).toBeDefined());

      await createFolderResult.current.mutateAsync({
        folder: {
          name: 'Folder folder-1',
          userId: 'user-1',
          organizationId: 'org-1',
          parentFolderId: null,
        },
        context: {
          organizationId: 'org-1',
          userId: 'user-1',
        },
      });

      // 2. Asset im Root hochladen
      (mediaService.uploadMediaWithRetry as jest.Mock).mockResolvedValue(mockAssetRoot);
      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue([mockAssetRoot]);

      const { result: uploadResult } = renderHook(
        () => useUploadMediaAsset(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(uploadResult.current).toBeDefined());

      await uploadResult.current.mutateAsync({
        file: createMockFile('test.jpg'),
        organizationId: 'org-1',
      });

      // 3. Asset in Folder verschieben
      (mediaService.moveAssetToFolder as jest.Mock).mockResolvedValue(undefined);

      const { result: moveResult } = renderHook(
        () => useMoveAsset(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(moveResult.current).toBeDefined());

      await moveResult.current.mutateAsync({
        assetId: 'asset-1',
        newFolderId: 'folder-1',
        organizationId: 'org-1',
      });

      expect(mediaService.moveAssetToFolder).toHaveBeenCalledWith('asset-1', 'folder-1', 'org-1');

      // 4. Asset ist jetzt im Folder
      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue([mockAssetInFolder]);

      const { result: assetsInFolder } = renderHook(
        () => useMediaAssets('org-1', 'folder-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(assetsInFolder.current.isSuccess).toBe(true));
      expect(assetsInFolder.current.data).toHaveLength(1);
      expect(assetsInFolder.current.data![0].folderId).toBe('folder-1');

      // 5. Asset ist nicht mehr im Root
      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue([]);

      const { result: assetsInRoot } = renderHook(
        () => useMediaAssets('org-1', null),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(assetsInRoot.current.isSuccess).toBe(true));
      expect(assetsInRoot.current.data).toEqual([]);
    });
  });

  // ============================================================================
  // TEST 4: BULK-OPERATIONS-FLOW
  // ============================================================================

  describe('Bulk-Operations-Flow', () => {
    it('sollte mehrere Assets hochladen und bulk-delete', async () => {
      const mockAsset1 = createMockAsset('asset-1');
      const mockAsset2 = createMockAsset('asset-2');
      const mockAsset3 = createMockAsset('asset-3');
      const allAssets = [mockAsset1, mockAsset2, mockAsset3];

      // 1. Mehrere Assets hochladen
      (mediaService.uploadMediaWithRetry as jest.Mock)
        .mockResolvedValueOnce(mockAsset1)
        .mockResolvedValueOnce(mockAsset2)
        .mockResolvedValueOnce(mockAsset3);

      const { result: uploadResult } = renderHook(
        () => useUploadMediaAsset(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(uploadResult.current).toBeDefined());

      // Upload 3 Assets
      for (let i = 1; i <= 3; i++) {
        await uploadResult.current.mutateAsync({
          file: createMockFile(`test-${i}.jpg`),
          organizationId: 'org-1',
        });
      }

      expect(mediaService.uploadMediaWithRetry).toHaveBeenCalledTimes(3);

      // 2. Alle Assets in Liste sehen
      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue(allAssets);

      const { result: assetsResult } = renderHook(
        () => useMediaAssets('org-1', null),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(assetsResult.current.isSuccess).toBe(true));
      expect(assetsResult.current.data).toHaveLength(3);

      // 3. Bulk-Delete aller Assets
      (mediaService.deleteMediaAsset as jest.Mock).mockResolvedValue(undefined);

      const { result: bulkDeleteResult } = renderHook(
        () => useBulkDeleteAssets(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(bulkDeleteResult.current).toBeDefined());

      await bulkDeleteResult.current.mutateAsync({
        assets: allAssets,
        organizationId: 'org-1',
      });

      // Sollte deleteMediaAsset für jedes Asset aufrufen
      expect(mediaService.deleteMediaAsset).toHaveBeenCalledTimes(3);
      expect(mediaService.deleteMediaAsset).toHaveBeenCalledWith(mockAsset1);
      expect(mediaService.deleteMediaAsset).toHaveBeenCalledWith(mockAsset2);
      expect(mediaService.deleteMediaAsset).toHaveBeenCalledWith(mockAsset3);

      // 4. Liste ist leer
      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue([]);

      const { result: assetsAfterDelete } = renderHook(
        () => useMediaAssets('org-1', null),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(assetsAfterDelete.current.isSuccess).toBe(true));
      expect(assetsAfterDelete.current.data).toEqual([]);
    });
  });

  // ============================================================================
  // TEST 5: FOLDER-HIERARCHY-FLOW
  // ============================================================================

  describe('Folder-Hierarchy-Flow', () => {
    it('sollte verschachtelte Folder-Hierarchie erstellen und verschieben', async () => {
      const parentFolder = createMockFolder('parent', null);
      const childFolder = createMockFolder('child', null);
      const childInParent = createMockFolder('child', 'parent');

      // 1. Parent-Folder erstellen
      (mediaService.createFolder as jest.Mock).mockResolvedValue(parentFolder);

      const { result: createParentResult } = renderHook(
        () => useCreateFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(createParentResult.current).toBeDefined());

      await createParentResult.current.mutateAsync({
        folder: {
          name: 'Folder parent',
          userId: 'user-1',
          organizationId: 'org-1',
          parentFolderId: null,
        },
        context: {
          organizationId: 'org-1',
          userId: 'user-1',
        },
      });

      // 2. Child-Folder erstellen (initial im Root)
      (mediaService.createFolder as jest.Mock).mockResolvedValue(childFolder);

      const { result: createChildResult } = renderHook(
        () => useCreateFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(createChildResult.current).toBeDefined());

      await createChildResult.current.mutateAsync({
        folder: {
          name: 'Folder child',
          userId: 'user-1',
          organizationId: 'org-1',
          parentFolderId: null,
        },
        context: {
          organizationId: 'org-1',
          userId: 'user-1',
        },
      });

      // 3. Child in Parent verschieben
      (mediaService.updateFolder as jest.Mock).mockResolvedValue(undefined);
      (mediaService.updateFolderClientInheritance as jest.Mock).mockResolvedValue(undefined);

      const { result: moveFolderResult } = renderHook(
        () => useMoveFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(moveFolderResult.current).toBeDefined());

      await moveFolderResult.current.mutateAsync({
        folderId: 'child',
        newParentId: 'parent',
        organizationId: 'org-1',
      });

      expect(mediaService.updateFolder).toHaveBeenCalledWith('child', {
        parentFolderId: 'parent',
      });
      expect(mediaService.updateFolderClientInheritance).toHaveBeenCalledWith('child', 'org-1');

      // 4. Child ist jetzt im Parent
      (mediaService.getFolders as jest.Mock).mockResolvedValue([childInParent]);

      const { result: foldersInParent } = renderHook(
        () => useMediaFolders('org-1', 'parent'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(foldersInParent.current.isSuccess).toBe(true));
      expect(foldersInParent.current.data).toHaveLength(1);
      expect(foldersInParent.current.data![0].parentFolderId).toBe('parent');
    });
  });

  // ============================================================================
  // TEST 6: ERROR-RECOVERY-FLOW
  // ============================================================================

  describe('Error-Recovery-Flow', () => {
    it('sollte Delete-Error handhaben und Retry ermöglichen', async () => {
      const mockAsset = createMockAsset('asset-1');

      // 1. Asset hochladen
      (mediaService.uploadMediaWithRetry as jest.Mock).mockResolvedValue(mockAsset);
      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue([mockAsset]);

      const { result: uploadResult } = renderHook(
        () => useUploadMediaAsset(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(uploadResult.current).toBeDefined());

      await uploadResult.current.mutateAsync({
        file: createMockFile('test.jpg'),
        organizationId: 'org-1',
      });

      // 2. Delete schlägt fehl (z.B. Permission Error)
      (mediaService.deleteMediaAsset as jest.Mock).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const { result: deleteResult } = renderHook(
        () => useDeleteMediaAsset(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(deleteResult.current).toBeDefined());

      // Erste Delete-Attempt schlägt fehl
      await expect(
        deleteResult.current.mutateAsync({
          asset: mockAsset,
          organizationId: 'org-1',
        })
      ).rejects.toThrow('Permission denied');

      // 3. Retry mit Erfolg
      (mediaService.deleteMediaAsset as jest.Mock).mockResolvedValueOnce(undefined);

      await deleteResult.current.mutateAsync({
        asset: mockAsset,
        organizationId: 'org-1',
      });

      expect(mediaService.deleteMediaAsset).toHaveBeenCalledTimes(2);

      // 4. Asset ist gelöscht
      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue([]);

      const { result: assetsResult } = renderHook(
        () => useMediaAssets('org-1', null),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(assetsResult.current.isSuccess).toBe(true));
      expect(assetsResult.current.data).toEqual([]);
    });
  });

  // ============================================================================
  // TEST 7: UPDATE-FLOW
  // ============================================================================

  describe('Update-Flow', () => {
    it('sollte Folder umbenennen', async () => {
      const mockFolder = createMockFolder('folder-1');
      const updatedFolder = { ...mockFolder, name: 'Updated Folder Name' };

      // 1. Folder erstellen
      (mediaService.createFolder as jest.Mock).mockResolvedValue(mockFolder);
      (mediaService.getFolders as jest.Mock).mockResolvedValue([mockFolder]);

      const { result: createFolderResult } = renderHook(
        () => useCreateFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(createFolderResult.current).toBeDefined());

      await createFolderResult.current.mutateAsync({
        folder: {
          name: 'Folder folder-1',
          userId: 'user-1',
          organizationId: 'org-1',
          parentFolderId: null,
        },
        context: {
          organizationId: 'org-1',
          userId: 'user-1',
        },
      });

      // 2. Folder umbenennen
      (mediaService.updateFolder as jest.Mock).mockResolvedValue(undefined);

      const { result: updateResult } = renderHook(
        () => useUpdateFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(updateResult.current).toBeDefined());

      await updateResult.current.mutateAsync({
        folderId: 'folder-1',
        updates: { name: 'Updated Folder Name' },
        organizationId: 'org-1',
      });

      expect(mediaService.updateFolder).toHaveBeenCalledWith('folder-1', {
        name: 'Updated Folder Name',
      });

      // 3. Updated Folder in Liste sehen
      (mediaService.getFolders as jest.Mock).mockResolvedValue([updatedFolder]);

      const { result: foldersResult } = renderHook(
        () => useMediaFolders('org-1', null),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(foldersResult.current.isSuccess).toBe(true));
      expect(foldersResult.current.data![0].name).toBe('Updated Folder Name');
    });
  });
});
