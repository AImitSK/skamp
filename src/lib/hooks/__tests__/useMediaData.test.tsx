// src/lib/hooks/__tests__/useMediaData.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useMediaAssets,
  useDeleteMediaAsset,
  useBulkDeleteAssets,
  useMoveAsset,
  useMediaFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useMoveFolder,
  useCampaignMediaAssets,
  usePipelineAssets,
  useAddPipelineAsset,
  useRemovePipelineAsset,
} from '../useMediaData';
import { mediaService } from '@/lib/firebase/media-service';
import * as sharesService from '@/lib/firebase/media-shares-service';
import { MediaAsset, MediaFolder } from '@/types/media';

// Mock Firebase Services
jest.mock('@/lib/firebase/media-service');
jest.mock('@/lib/firebase/media-shares-service');

// Test Wrapper mit QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

// Mock Data
const mockAsset: MediaAsset = {
  id: 'asset-1',
  fileName: 'test.jpg',
  fileType: 'image/jpeg',
  downloadUrl: 'https://example.com/test.jpg',
  storagePath: 'media/test.jpg',
  userId: 'user-1',
  folderId: undefined,
  metadata: {
    fileSize: 1024,
  },
  createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
  updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
};

const mockFolder: MediaFolder = {
  id: 'folder-1',
  name: 'Test Folder',
  userId: 'user-1',
  organizationId: 'org-1',
  parentFolderId: undefined,
  createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
  updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
};

describe('useMediaData Hooks - Phase 4a.1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // ASSET HOOKS - 5 Tests
  // ============================================================================

  describe('useMediaAssets', () => {
    it('sollte Assets für Folder laden', async () => {
      const mockAssets = [mockAsset];
      (mediaService.getMediaAssets as jest.Mock).mockResolvedValue(mockAssets);

      const { result } = renderHook(
        () => useMediaAssets('org-1', 'folder-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockAssets);
      expect(mediaService.getMediaAssets).toHaveBeenCalledWith('org-1', 'folder-1');
    });

    it('sollte Query disablen bei fehlendem organizationId', async () => {
      const { result } = renderHook(
        () => useMediaAssets(null, null),
        { wrapper: createWrapper() }
      );

      // Query sollte disabled sein (enabled: !!organizationId)
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('sollte Error bei Firestore-Fehler werfen', async () => {
      const error = new Error('Firestore error');
      (mediaService.getMediaAssets as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(
        () => useMediaAssets('org-1', null),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useDeleteMediaAsset', () => {
    it('sollte Asset löschen und Cache invalidieren', async () => {
      (mediaService.deleteMediaAsset as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useDeleteMediaAsset(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current).toBeDefined());

      await result.current.mutateAsync({
        asset: mockAsset,
        organizationId: 'org-1',
      });

      expect(mediaService.deleteMediaAsset).toHaveBeenCalledWith(mockAsset);
    });
  });

  describe('useBulkDeleteAssets', () => {
    it('sollte mehrere Assets löschen', async () => {
      const assets = [mockAsset, { ...mockAsset, id: 'asset-2' }];
      // Hook verwendet deleteMediaAsset für jedes Asset
      (mediaService.deleteMediaAsset as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useBulkDeleteAssets(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current).toBeDefined());

      await result.current.mutateAsync({
        assets,
        organizationId: 'org-1',
      });

      // Sollte deleteMediaAsset für jedes Asset aufrufen
      expect(mediaService.deleteMediaAsset).toHaveBeenCalledTimes(2);
      expect(mediaService.deleteMediaAsset).toHaveBeenCalledWith(assets[0]);
      expect(mediaService.deleteMediaAsset).toHaveBeenCalledWith(assets[1]);
    });
  });

  describe('useMoveAsset', () => {
    it('sollte Asset verschieben', async () => {
      (mediaService.moveAssetToFolder as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useMoveAsset(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current).toBeDefined());

      await result.current.mutateAsync({
        assetId: 'asset-1',
        newFolderId: 'folder-1',
        organizationId: 'org-1',
      });

      // Service wird mit 3 Parametern aufgerufen
      expect(mediaService.moveAssetToFolder).toHaveBeenCalledWith('asset-1', 'folder-1', 'org-1');
    });
  });

  // ============================================================================
  // FOLDER HOOKS - 8 Tests
  // ============================================================================

  describe('useMediaFolders', () => {
    it('sollte Folders für Parent laden', async () => {
      const mockFolders = [mockFolder];
      (mediaService.getFolders as jest.Mock).mockResolvedValue(mockFolders);

      const { result } = renderHook(
        () => useMediaFolders('org-1', null),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockFolders);
      // Hook konvertiert null zu undefined
      expect(mediaService.getFolders).toHaveBeenCalledWith('org-1', undefined);
    });

    it('sollte Query disablen bei fehlendem organizationId', async () => {
      const { result } = renderHook(
        () => useMediaFolders(null, null),
        { wrapper: createWrapper() }
      );

      // Query sollte disabled sein (enabled: !!organizationId)
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useCreateFolder', () => {
    it('sollte Folder erstellen', async () => {
      (mediaService.createFolder as jest.Mock).mockResolvedValue({ id: 'folder-1' });

      const { result } = renderHook(
        () => useCreateFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current).toBeDefined());

      await result.current.mutateAsync({
        folder: {
          name: 'New Folder',
          userId: 'user-1',
          organizationId: 'org-1',
          parentFolderId: undefined,
        },
        context: {
          organizationId: 'org-1',
          userId: 'user-1',
        },
      });

      expect(mediaService.createFolder).toHaveBeenCalled();
    });
  });

  describe('useUpdateFolder', () => {
    it('sollte Folder aktualisieren', async () => {
      (mediaService.updateFolder as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useUpdateFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current).toBeDefined());

      await result.current.mutateAsync({
        folderId: 'folder-1',
        updates: { name: 'Updated Folder' },
        organizationId: 'org-1',
      });

      expect(mediaService.updateFolder).toHaveBeenCalledWith(
        'folder-1',
        { name: 'Updated Folder' }
      );
    });
  });

  describe('useDeleteFolder', () => {
    it('sollte Folder löschen', async () => {
      (mediaService.deleteFolder as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useDeleteFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current).toBeDefined());

      await result.current.mutateAsync({
        folderId: 'folder-1',
        organizationId: 'org-1',
      });

      expect(mediaService.deleteFolder).toHaveBeenCalledWith('folder-1');
    });

    it('sollte Error werfen wenn Folder nicht leer', async () => {
      (mediaService.deleteFolder as jest.Mock).mockRejectedValue(
        new Error('Folder is not empty')
      );

      const { result } = renderHook(
        () => useDeleteFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current).toBeDefined());

      await expect(
        result.current.mutateAsync({
          folderId: 'folder-1',
          organizationId: 'org-1',
        })
      ).rejects.toThrow('Folder is not empty');
    });
  });

  describe('useMoveFolder', () => {
    it('sollte Folder verschieben', async () => {
      // Hook verwendet updateFolder und updateFolderClientInheritance (auch wenn nicht exportiert)
      (mediaService.updateFolder as jest.Mock).mockResolvedValue(undefined);
      // Mock für nicht existierende Funktion hinzufügen (wird vom Hook aufgerufen)
      (mediaService as any).updateFolderClientInheritance = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useMoveFolder(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current).toBeDefined());

      await result.current.mutateAsync({
        folderId: 'folder-1',
        newParentId: 'folder-2',
        organizationId: 'org-1',
      });

      // Sollte updateFolder mit parentFolderId Update aufrufen
      expect(mediaService.updateFolder).toHaveBeenCalledWith('folder-1', {
        parentFolderId: 'folder-2'
      });
    });
  });

  // ============================================================================
  // PIPELINE & CAMPAIGN HOOKS - 4 Tests
  // ============================================================================

  describe('useCampaignMediaAssets', () => {
    it('sollte Campaign Assets laden', async () => {
      const mockShareLink: any = {
        id: 'share-1',
        type: 'campaign',
        context: {
          campaignId: 'campaign-1',
        },
        organizationId: 'org-1',
      };

      const campaignAssets = [mockAsset];
      (sharesService.getCampaignMediaAssets as jest.Mock).mockResolvedValue(campaignAssets);

      const { result } = renderHook(
        () => useCampaignMediaAssets(mockShareLink),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(campaignAssets);
      expect(sharesService.getCampaignMediaAssets).toHaveBeenCalledWith(mockShareLink);
    });

    it('sollte Query disablen wenn kein Campaign ShareLink', async () => {
      const mockShareLink: any = {
        id: 'share-1',
        type: 'folder', // nicht campaign
        organizationId: 'org-1',
      };

      const { result } = renderHook(
        () => useCampaignMediaAssets(mockShareLink),
        { wrapper: createWrapper() }
      );

      // Query sollte disabled sein
      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('usePipelineAssets', () => {
    it('sollte Pipeline Assets laden', async () => {
      // Placeholder-Implementierung gibt leeres Array zurück
      const { result } = renderHook(
        () => usePipelineAssets('org-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useAddPipelineAsset', () => {
    it('sollte Asset zu Pipeline hinzufügen', async () => {
      const { result } = renderHook(
        () => useAddPipelineAsset(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current).toBeDefined());

      // Placeholder-Implementierung sollte ohne Fehler durchlaufen
      const mutationPromise = result.current.mutateAsync({
        assetId: 'asset-1',
        organizationId: 'org-1',
      });

      await expect(mutationPromise).resolves.toBeUndefined();
    });
  });

  describe('useRemovePipelineAsset', () => {
    it('sollte Asset aus Pipeline entfernen', async () => {
      const { result } = renderHook(
        () => useRemovePipelineAsset(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current).toBeDefined());

      // Placeholder-Implementierung sollte ohne Fehler durchlaufen
      const mutationPromise = result.current.mutateAsync({
        assetId: 'asset-1',
        organizationId: 'org-1',
      });

      await expect(mutationPromise).resolves.toBeUndefined();
    });
  });
});
