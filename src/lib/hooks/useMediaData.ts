// src/lib/hooks/useMediaData.ts
// React Query Hooks für Media-Modul
// Phase 1: React Query Integration

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaService } from '@/lib/firebase/media-service';
import * as sharesService from '@/lib/firebase/media-shares-service';
import { MediaAsset, MediaFolder, ShareLink } from '@/types/media';
import type { UploadContext } from '@/app/dashboard/library/media/utils/context-builder';

// ===================================
// QUERY KEYS
// ===================================

export const mediaQueryKeys = {
  // Assets
  assets: (organizationId?: string, folderId?: string) =>
    ['media', 'assets', organizationId, folderId] as const,
  asset: (id?: string) =>
    ['media', 'asset', id] as const,
  assetsByClient: (organizationId: string, clientId: string) =>
    ['media', 'assets', 'client', organizationId, clientId] as const,

  // Folders
  folders: (organizationId?: string, parentId?: string) =>
    ['media', 'folders', organizationId, parentId] as const,
  folder: (id?: string) =>
    ['media', 'folder', id] as const,
  allFolders: (organizationId: string) =>
    ['media', 'folders', 'all', organizationId] as const,
  breadcrumbs: (folderId?: string) =>
    ['media', 'breadcrumbs', folderId] as const,

  // Shares
  shareLinks: (organizationId?: string) =>
    ['media', 'shares', organizationId] as const,
  shareLink: (shareId?: string) =>
    ['media', 'share', shareId] as const,

  // Campaign
  campaignAssets: (shareLink?: ShareLink) =>
    ['media', 'campaign', shareLink?.id] as const,

  // Pipeline
  pipelineAssets: (organizationId?: string) =>
    ['media', 'pipeline', organizationId] as const,
} as const;

// ===================================
// MEDIA ASSETS HOOKS
// ===================================

/**
 * Hook: Liste aller Media Assets für Organization/Folder
 */
export function useMediaAssets(
  organizationId: string | undefined | null,
  folderId?: string | undefined | null
) {
  return useQuery({
    queryKey: mediaQueryKeys.assets(organizationId || undefined, folderId || undefined),
    queryFn: async () => {
      if (!organizationId) return [];
      return mediaService.getMediaAssets(organizationId, folderId || undefined);
    },
    enabled: !!organizationId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook: Einzelnes Media Asset
 */
export function useMediaAsset(id: string | undefined) {
  return useQuery({
    queryKey: mediaQueryKeys.asset(id),
    queryFn: async () => {
      if (!id) return null;
      // mediaService hat keine getMediaAssetById - nutze getMediaAssets und filtere
      // In Phase 2 sollte getMediaAssetById hinzugefügt werden
      return null; // Placeholder
    },
    enabled: !!id,
  });
}

/**
 * Hook: Media Assets für einen Client
 */
export function useMediaAssetsByClient(
  organizationId: string | undefined,
  clientId: string | undefined
) {
  return useQuery({
    queryKey: mediaQueryKeys.assetsByClient(organizationId || '', clientId || ''),
    queryFn: async () => {
      if (!organizationId || !clientId) return { folders: [], assets: [], totalCount: 0 };
      return mediaService.getMediaByClientId(organizationId, clientId);
    },
    enabled: !!organizationId && !!clientId,
  });
}

/**
 * Mutation: Media Asset hochladen
 */
export function useUploadMediaAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      file: File;
      organizationId: string;
      folderId?: string;
      onProgress?: (progress: number) => void;
      context?: Partial<UploadContext>;
    }) => {
      const { file, organizationId, folderId, onProgress, context } = params;

      // Map UploadContext to uploadMedia context format
      const uploadContext = context ? {
        userId: context.userId || organizationId,
        clientId: context.clientId
      } : undefined;

      return mediaService.uploadMedia(
        file,
        organizationId,
        folderId,
        onProgress,
        3,
        uploadContext
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate assets für den aktuellen Ordner
      queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.assets(variables.organizationId, variables.folderId)
      });
      // Invalidate auch root assets falls kein folder
      if (!variables.folderId) {
        queryClient.invalidateQueries({
          queryKey: mediaQueryKeys.assets(variables.organizationId, undefined)
        });
      }
    },
  });
}

/**
 * Mutation: Media Asset aktualisieren
 */
export function useUpdateMediaAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      assetId: string;
      updates: Partial<MediaAsset>;
      organizationId?: string;
    }) => {
      const { assetId, updates } = params;
      return mediaService.updateAsset(assetId, updates);
    },
    onSuccess: (_, variables) => {
      // Invalidate alle asset queries
      queryClient.invalidateQueries({
        queryKey: ['media', 'assets']
      });
      // Invalidate spezifisches asset
      queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.asset(variables.assetId)
      });
    },
  });
}

/**
 * Mutation: Media Asset löschen
 */
export function useDeleteMediaAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      asset: MediaAsset;
      organizationId?: string;
    }) => {
      const { asset } = params;
      return mediaService.deleteMediaAsset(asset);
    },
    onSuccess: (_, variables) => {
      // Invalidate alle asset queries
      queryClient.invalidateQueries({
        queryKey: ['media', 'assets']
      });
    },
  });
}

/**
 * Mutation: Bulk Delete Assets
 */
export function useBulkDeleteAssets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      assets: MediaAsset[];
      organizationId: string;
    }) => {
      const { assets } = params;
      // Lösche alle Assets parallel
      await Promise.all(
        assets.map(asset => mediaService.deleteMediaAsset(asset))
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate alle asset queries
      queryClient.invalidateQueries({
        queryKey: ['media', 'assets']
      });
    },
  });
}

/**
 * Mutation: Asset in anderen Folder verschieben
 */
export function useMoveAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      assetId: string;
      newFolderId?: string;
      organizationId?: string;
    }) => {
      const { assetId, newFolderId, organizationId } = params;
      return mediaService.moveAssetToFolder(assetId, newFolderId, organizationId);
    },
    onSuccess: () => {
      // Invalidate alle asset queries (da Asset zwischen Foldern bewegt wurde)
      queryClient.invalidateQueries({
        queryKey: ['media', 'assets']
      });
      // Invalidate alle folder queries (file count könnte sich geändert haben)
      queryClient.invalidateQueries({
        queryKey: ['media', 'folders']
      });
    },
  });
}

// ===================================
// MEDIA FOLDERS HOOKS
// ===================================

/**
 * Hook: Liste aller Folders für Organization/Parent
 */
export function useMediaFolders(
  organizationId: string | undefined | null,
  parentId?: string | undefined | null
) {
  return useQuery({
    queryKey: mediaQueryKeys.folders(organizationId || undefined, parentId || undefined),
    queryFn: async () => {
      if (!organizationId) return [];
      return mediaService.getFolders(organizationId, parentId || undefined);
    },
    enabled: !!organizationId,
    staleTime: 60000, // 1 minute (folders ändern sich seltener)
  });
}

/**
 * Hook: Alle Folders für Organization (flache Liste)
 */
export function useAllMediaFolders(organizationId: string | undefined | null) {
  return useQuery({
    queryKey: mediaQueryKeys.allFolders(organizationId || ''),
    queryFn: async () => {
      if (!organizationId) return [];
      return mediaService.getAllFoldersForOrganization(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });
}

/**
 * Hook: Einzelner Folder
 */
export function useMediaFolder(id: string | undefined) {
  return useQuery({
    queryKey: mediaQueryKeys.folder(id),
    queryFn: async () => {
      if (!id) return null;
      return mediaService.getFolder(id);
    },
    enabled: !!id,
    staleTime: 60000,
  });
}

/**
 * Hook: Breadcrumbs für Folder
 */
export function useFolderBreadcrumbs(folderId: string | undefined) {
  return useQuery({
    queryKey: mediaQueryKeys.breadcrumbs(folderId),
    queryFn: async () => {
      if (!folderId) return [];
      return mediaService.getBreadcrumbs(folderId);
    },
    enabled: !!folderId,
    staleTime: 60000,
  });
}

/**
 * Mutation: Folder erstellen
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      folder: Omit<MediaFolder, 'id' | 'createdAt' | 'updatedAt'>;
      context: { organizationId: string; userId: string };
    }) => {
      const { folder, context } = params;
      return mediaService.createFolder(folder, context);
    },
    onSuccess: (_, variables) => {
      // ✅ Invalidate ALLE Folder-Queries für diese Organization (Root + alle Unterordner)
      queryClient.invalidateQueries({
        queryKey: ['media', 'folders', variables.context.organizationId]
      });
      // Invalidate all folders list
      queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.allFolders(variables.context.organizationId)
      });
    },
  });
}

/**
 * Mutation: Folder aktualisieren
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      folderId: string;
      updates: Partial<MediaFolder>;
      organizationId?: string;
    }) => {
      const { folderId, updates } = params;
      return mediaService.updateFolder(folderId, updates);
    },
    onSuccess: (_, variables) => {
      // ✅ Invalidate ALLE Folder-Queries (alle Organizations + alle Unterordner)
      queryClient.invalidateQueries({
        queryKey: ['media', 'folders']
      });
      // Invalidate spezifischen folder
      queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.folder(variables.folderId)
      });
      // Invalidate breadcrumbs (Name könnte sich geändert haben)
      queryClient.invalidateQueries({
        queryKey: ['media', 'breadcrumbs']
      });
      // Invalidate all folders lists (falls organizationId vorhanden)
      if (variables.organizationId) {
        queryClient.invalidateQueries({
          queryKey: mediaQueryKeys.allFolders(variables.organizationId)
        });
      }
    },
  });
}

/**
 * Mutation: Folder löschen
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      folderId: string;
      organizationId?: string;
    }) => {
      const { folderId } = params;
      return mediaService.deleteFolder(folderId);
    },
    onSuccess: (_, variables) => {
      // ✅ Invalidate ALLE Folder-Queries (alle Organizations + alle Unterordner)
      queryClient.invalidateQueries({
        queryKey: ['media', 'folders']
      });
      // Invalidate all folders lists (falls organizationId vorhanden)
      if (variables.organizationId) {
        queryClient.invalidateQueries({
          queryKey: mediaQueryKeys.allFolders(variables.organizationId)
        });
      }
    },
  });
}

/**
 * Mutation: Folder verschieben (Parent ändern)
 */
export function useMoveFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      folderId: string;
      newParentId?: string;
      organizationId: string;
    }) => {
      const { folderId, newParentId, organizationId } = params;
      await mediaService.updateFolder(folderId, {
        parentFolderId: newParentId
      });
      // Update client inheritance
      await mediaService.updateFolderClientInheritance(folderId, organizationId);
    },
    onSuccess: (_, variables) => {
      // ✅ Invalidate ALLE Folder-Queries (alle Organizations + alle Unterordner)
      queryClient.invalidateQueries({
        queryKey: ['media', 'folders']
      });
      // Invalidate breadcrumbs (Pfad hat sich geändert)
      queryClient.invalidateQueries({
        queryKey: ['media', 'breadcrumbs']
      });
      // Invalidate all folders list
      queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.allFolders(variables.organizationId)
      });
    },
  });
}

// ===================================
// SHARE LINKS HOOKS
// ===================================
// Hinweis: Diese werden in Phase 6 zu Admin SDK migriert

/**
 * Hook: Liste aller Share Links für Organization
 */
export function useShareLinks(organizationId: string | undefined) {
  return useQuery({
    queryKey: mediaQueryKeys.shareLinks(organizationId),
    queryFn: async () => {
      if (!organizationId) return [];
      // mediaService hat keine getShareLinks - wird in Phase 6 implementiert
      return [];
    },
    enabled: !!organizationId,
  });
}

/**
 * Hook: Einzelner Share Link
 * Phase 6: Umgestellt auf Admin SDK API-Route
 */
export function useShareLink(shareId: string | undefined) {
  return useQuery({
    queryKey: mediaQueryKeys.shareLink(shareId),
    queryFn: async () => {
      if (!shareId) return null;

      // ✅ Neu: API-Route (Server-Side)
      const response = await fetch(`/api/media/share/${shareId}`);

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to load share');
      }

      return response.json();
    },
    enabled: !!shareId,
    staleTime: 300000, // 5 minutes (share links ändern sich selten)
  });
}

/**
 * Mutation: Share Link erstellen
 * Phase 6: Umgestellt auf Admin SDK API-Route (Server-Side mit bcrypt)
 */
export function useCreateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      shareLink: Omit<ShareLink, 'id' | 'createdAt'>;
      context: { organizationId: string; userId: string };
    }) => {
      const { shareLink, context } = params;

      // ✅ Neu: API-Route (Server-Side mit bcrypt)
      const response = await fetch('/api/media/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...shareLink,
          organizationId: context.organizationId,
          createdBy: context.userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create share');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate share links
      queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.shareLinks(variables.context.organizationId)
      });
    },
  });
}

/**
 * Mutation: Share Link aktualisieren
 */
export function useUpdateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      shareId: string;
      updates: Partial<ShareLink>;
    }) => {
      const { shareId, updates } = params;
      return sharesService.updateShareLink(shareId, updates);
    },
    onSuccess: (_, variables) => {
      // Invalidate alle share queries
      queryClient.invalidateQueries({
        queryKey: ['media', 'shares']
      });
      // Invalidate spezifischen share link
      queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.shareLink(variables.shareId)
      });
    },
  });
}

/**
 * Mutation: Share Link löschen
 */
export function useDeleteShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      shareId: string;
    }) => {
      const { shareId } = params;
      return sharesService.deleteShareLink(shareId);
    },
    onSuccess: () => {
      // Invalidate alle share queries
      queryClient.invalidateQueries({
        queryKey: ['media', 'shares']
      });
    },
  });
}

/**
 * Mutation: Share Link Passwort validieren
 * Phase 6: Umgestellt auf Admin SDK API-Route (Server-Side mit bcrypt)
 */
export function useValidateSharePassword() {
  return useMutation({
    mutationFn: async (params: {
      shareLink: ShareLink;
      password: string;
    }) => {
      const { shareLink, password } = params;

      // ✅ Neu: API-Route (Server-Side mit bcrypt)
      const response = await fetch('/api/media/share/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareId: shareLink.shareId,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid password');
      }

      const data = await response.json();
      return data.valid;
    },
  });
}

// ===================================
// CAMPAIGN MEDIA HOOKS
// ===================================

/**
 * Hook: Media Assets für Campaign (über Share Link)
 */
export function useCampaignMediaAssets(shareLink: ShareLink | undefined | null) {
  return useQuery({
    queryKey: mediaQueryKeys.campaignAssets(shareLink || undefined),
    queryFn: async () => {
      if (!shareLink || shareLink.type !== 'campaign' || !shareLink.context?.campaignId) {
        return [];
      }
      // Pass entire shareLink object to getCampaignMediaAssets
      return sharesService.getCampaignMediaAssets(shareLink);
    },
    enabled: !!shareLink && shareLink.type === 'campaign' && !!shareLink.context?.campaignId,
  });
}

// ===================================
// PIPELINE ASSETS HOOKS
// ===================================

/**
 * Hook: Pipeline Assets für Organization
 */
export function usePipelineAssets(organizationId: string | undefined) {
  return useQuery({
    queryKey: mediaQueryKeys.pipelineAssets(organizationId),
    queryFn: async () => {
      if (!organizationId) return [];
      // mediaService.getPipelineAssets existiert nicht - wird in Phase 2 implementiert
      return [];
    },
    enabled: !!organizationId,
  });
}

/**
 * Mutation: Asset zu Pipeline hinzufügen
 */
export function useAddPipelineAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      assetId: string;
      organizationId: string;
    }) => {
      // mediaService.addPipelineAsset existiert nicht - wird in Phase 2 implementiert
      return Promise.resolve();
    },
    onSuccess: (_, variables) => {
      // Invalidate pipeline assets
      queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.pipelineAssets(variables.organizationId)
      });
    },
  });
}

/**
 * Mutation: Asset aus Pipeline entfernen
 */
export function useRemovePipelineAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      assetId: string;
      organizationId: string;
    }) => {
      // mediaService.removePipelineAsset existiert nicht - wird in Phase 2 implementiert
      return Promise.resolve();
    },
    onSuccess: (_, variables) => {
      // Invalidate pipeline assets
      queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.pipelineAssets(variables.organizationId)
      });
    },
  });
}

// ===================================
// HELPER: Manuelle Cache-Invalidierung
// ===================================

/**
 * Helper Hook: Manuelle Query-Invalidierung
 * Nützlich für externe Trigger (z.B. WebSocket updates)
 */
export function useInvalidateMediaQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAssets: (organizationId?: string, folderId?: string) => {
      queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.assets(organizationId, folderId)
      });
    },
    invalidateFolders: (organizationId?: string) => {
      queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.folders(organizationId)
      });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: ['media']
      });
    },
  };
}
