// src/app/dashboard/pr-tools/media-library/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { throttle } from "@/lib/utils/throttle";
import {
  useMediaAssets,
  useMediaFolders,
  useAllMediaFolders,
  useMediaFolder,
  useFolderBreadcrumbs,
  useDeleteMediaAsset,
  useBulkDeleteAssets,
  useMoveAsset,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useMoveFolder,
} from "@/lib/hooks/useMediaData";
import { MediaAsset, MediaFolder, FolderBreadcrumb } from "@/types/media";
import { teamMemberService } from "@/lib/firebase/organization-service";
import { Text } from "@/components/ui/text";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { toastService } from '@/lib/utils/toast';
import UploadModal from "./UploadModal";
import FolderCard from "@/components/mediathek/FolderCard";
import BreadcrumbNavigation from "@/components/mediathek/BreadcrumbNavigation";
import FolderModal from "@/components/mediathek/FolderModal";
import ShareModal from "@/components/mediathek/ShareModal";
import AssetDetailsModal from "@/components/mediathek/AssetDetailsModal";
import MediaGridView from "@/components/mediathek/MediaGridView";
import MediaListView from "@/components/mediathek/MediaListView";
import MediaToolbar from "@/components/mediathek/MediaToolbar";
import EmptyState from "@/components/mediathek/EmptyState";
import Pagination from "@/components/mediathek/Pagination";
import ConfirmDialog from "@/components/mediathek/ConfirmDialog";
import LoadingSpinner from "@/components/mediathek/LoadingSpinner";

type ViewMode = 'grid' | 'list';

export default function MediathekPage() {
  const t = useTranslations('media');
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Multi-Tenancy State
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);

  // React Query Hooks - Replace manual state management
  const { data: folders = [], isLoading: foldersLoading } = useMediaFolders(organizationId, currentFolderId);
  const { data: mediaAssets = [], isLoading: assetsLoading } = useMediaAssets(organizationId, currentFolderId);
  const { data: allFolders = [] } = useAllMediaFolders(organizationId);
  const { data: breadcrumbs = [] } = useFolderBreadcrumbs(currentFolderId);

  // Mutations
  const deleteAssetMutation = useDeleteMediaAsset();
  const bulkDeleteAssetsMutation = useBulkDeleteAssets();
  const moveAssetMutation = useMoveAsset();
  const createFolderMutation = useCreateFolder();
  const updateFolderMutation = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder();
  const moveFolderMutation = useMoveFolder();

  // Loading state (derived from queries)
  const loading = foldersLoading || assetsLoading;
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState("");

  // Debounced search term (300ms delay) - Phase 3.3 Performance Optimization
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAssetDetailsModal, setShowAssetDetailsModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MediaFolder | undefined>(undefined);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | undefined>(undefined);
  const [sharingTarget, setSharingTarget] = useState<{target: MediaFolder | MediaAsset, type: 'folder' | 'file'} | null>(null);


  // Drag & Drop States
  const [draggedAsset, setDraggedAsset] = useState<MediaAsset | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  // Bulk Selection States
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Folder Drag States
  const [draggedFolder, setDraggedFolder] = useState<MediaFolder | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Get asset's folder
  const getAssetFolder = useCallback((asset: MediaAsset): MediaFolder | undefined => {
    if (!asset.folderId) return undefined;
    return allFolders.find(f => f.id === asset.folderId);
  }, [allFolders]);

  // === MULTI-TENANCY INITIALIZATION ===
  useEffect(() => {
    if (!user) {
      setOrganizationId(null);
      setCurrentUserId(null);
      return;
    }

    if (currentOrganization) {
      // ✅ Verwende currentOrganization aus useOrganization Hook
      setOrganizationId(currentOrganization.id);
      setCurrentUserId(user.uid);
    } else {
      // ⚠️ Fallback für Legacy-User - verwende user.uid als Organization
      setOrganizationId(user.uid);
      setCurrentUserId(user.uid);
    }
  }, [user, currentOrganization]);

  // ✅ React Query: No manual loadData() needed - queries auto-fetch and cache

  // Filtered assets and folders based on debounced search - Phase 3.3
  const filteredFolders = useMemo(() => {
    if (!debouncedSearchTerm) return folders;
    return folders.filter(folder =>
      folder.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [folders, debouncedSearchTerm]);

  const filteredAssets = useMemo(() => {
    if (!debouncedSearchTerm) return mediaAssets;
    return mediaAssets.filter(asset =>
      asset.fileName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      asset.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [mediaAssets, debouncedSearchTerm]);

  // Paginated Data
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAssets, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => Math.ceil(filteredAssets.length / itemsPerPage), [filteredAssets.length, itemsPerPage]);

  // FOLDER DRAG & DROP HANDLERS
  const handleFolderMove = useCallback(async (folderId: string, targetFolderId: string) => {
    if (!organizationId) return;

    try {
      setMoving(true);
      setDragOverFolder(null);
      setDraggedFolder(null);

      // React Query Mutation - auto invalidates queries
      await moveFolderMutation.mutateAsync({
        folderId,
        newParentId: targetFolderId,
        organizationId
      });

      toastService.success('Ordner verschoben');

    } catch (error) {
      toastService.error('Der Ordner konnte nicht verschoben werden');
    } finally {
      setMoving(false);
      setDraggedFolder(null);
      setDragOverFolder(null);
    }
  }, [organizationId, moveFolderMutation]);

  const handleFolderDragStart = useCallback((folder: MediaFolder) => {
    setDraggedFolder(folder);
  }, []);

  const handleFolderDragEnd = useCallback(() => {
    setDraggedFolder(null);
    setDragOverFolder(null);
  }, []);

  // BULK SELECTION HANDLERS
  const toggleAssetSelection = useCallback((assetId: string) => {
    const newSelection = new Set(selectedAssets);
    if (newSelection.has(assetId)) {
      newSelection.delete(assetId);
    } else {
      newSelection.add(assetId);
    }
    setSelectedAssets(newSelection);

    if (newSelection.size === 0) {
      setIsSelectionMode(false);
    }
  }, [selectedAssets]);

  const selectAllAssets = useCallback(() => {
    const visibleAssetIds = new Set(paginatedAssets.map(asset => asset.id!));
    setSelectedAssets(visibleAssetIds);
    setIsSelectionMode(true);
  }, [paginatedAssets]);

  const clearSelection = useCallback(() => {
    setSelectedAssets(new Set());
    setIsSelectionMode(false);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedAssets.size === 0) return;

    const count = selectedAssets.size;

    setConfirmDialog({
      isOpen: true,
      title: t('confirmDialog.deleteFiles.title', { count }),
      message: t('confirmDialog.deleteFiles.message', { count }),
      type: 'danger',
      onConfirm: async () => {
        try {
          setMoving(true);
          const assetsToDelete = mediaAssets.filter(asset => selectedAssets.has(asset.id!));

          // React Query Mutation - auto invalidates queries
          await bulkDeleteAssetsMutation.mutateAsync({
            assets: assetsToDelete,
            organizationId: organizationId!
          });

          clearSelection();
          toastService.success(`${count} ${count === 1 ? 'Datei' : 'Dateien'} gelöscht`);
        } catch (error) {
          toastService.error('Die Dateien konnten nicht gelöscht werden');
        } finally {
          setMoving(false);
        }
      }
    });
  }, [selectedAssets, mediaAssets, bulkDeleteAssetsMutation, organizationId, clearSelection, t]);

  const handleBulkMove = useCallback(async (targetFolderId?: string) => {
    if (selectedAssets.size === 0 || !organizationId) return;

    try {
      setMoving(true);

      // React Query Mutations - auto invalidate queries
      await Promise.all(
        Array.from(selectedAssets).map(assetId =>
          moveAssetMutation.mutateAsync({
            assetId,
            newFolderId: targetFolderId,
            organizationId
          })
        )
      );

      clearSelection();
      toastService.success('Dateien verschoben');
    } catch (error) {
      toastService.error('Die Dateien konnten nicht verschoben werden');
    } finally {
      setMoving(false);
    }
  }, [selectedAssets, organizationId, moveAssetMutation, clearSelection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'a' && mediaAssets.length > 0) {
        e.preventDefault();
        selectAllAssets();
      }
      
      if (e.key === 'Escape' && selectedAssets.size > 0) {
        clearSelection();
      }
      
      if (e.key === 'Delete' && selectedAssets.size > 0) {
        e.preventDefault();
        handleBulkDelete();
      }
    };

    const handleGlobalMouseUp = () => {
      if (draggedFolder || dragOverFolder) {
        setDraggedFolder(null);
        setDragOverFolder(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selectedAssets, mediaAssets, draggedFolder, dragOverFolder]);

  // DRAG & DROP HANDLERS
  const handleAssetDragStart = useCallback((e: React.DragEvent, asset: MediaAsset) => {
    if (selectedAssets.has(asset.id!) && selectedAssets.size > 1) {
      setDraggedAsset(null);
    } else {
      setDraggedAsset(asset);
    }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', asset.id || '');
  }, [selectedAssets]);

  const handleAssetDragEnd = useCallback(() => {
    setDraggedAsset(null);
    setDragOverFolder(null);
  }, []);

  // Phase 3.5: Throttled drag-over handler (max 10x per second = 100ms)
  const setDragOverFolderThrottled = useRef(
    throttle((folderId: string) => {
      setDragOverFolder(folderId);
    }, 100)
  ).current;

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderThrottled(folderId);
  }, [setDragOverFolderThrottled]);

  const handleFolderDragLeave = useCallback(() => {
    setDragOverFolder(null);
  }, []);

  const handleFolderDrop = useCallback(async (e: React.DragEvent, targetFolder: MediaFolder) => {
    e.preventDefault();
    setDragOverFolder(null);

    const dragData = e.dataTransfer.getData('text/plain');

    if (dragData.startsWith('folder:')) {
      return;
    }

    let assetsToMove: string[] = [];

    if (selectedAssets.size > 0) {
      assetsToMove = Array.from(selectedAssets);
    } else if (draggedAsset?.id) {
      assetsToMove = [draggedAsset.id];
    }

    if (assetsToMove.length === 0 || !organizationId) return;

    const currentAssets = mediaAssets.filter(asset => assetsToMove.includes(asset.id!));
    const alreadyInFolder = currentAssets.some(asset => asset.folderId === targetFolder.id);

    if (alreadyInFolder && assetsToMove.length === 1) return;

    const count = assetsToMove.length;

    try {
      setMoving(true);

      if (count > 1) {
        await handleBulkMove(targetFolder.id);
      } else {
        // React Query Mutation - auto invalidates queries
        await moveAssetMutation.mutateAsync({
          assetId: assetsToMove[0],
          newFolderId: targetFolder.id,
          organizationId
        });
        toastService.success('Datei verschoben');
      }

    } catch (error) {
      toastService.error('Die Dateien konnten nicht verschoben werden');
    } finally {
      setMoving(false);
      setDraggedAsset(null);
    }
  }, [selectedAssets, draggedAsset, organizationId, mediaAssets, handleBulkMove, moveAssetMutation]);

  // ROOT DROP HANDLER
  const handleRootDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolder(null);

    const dragData = e.dataTransfer.getData('text/plain');

    if (dragData.startsWith('folder:')) {
      const folderId = dragData.replace('folder:', '');

      try {
        setMoving(true);

        // React Query Mutation - auto invalidates queries
        await moveFolderMutation.mutateAsync({
          folderId,
          newParentId: undefined,
          organizationId: organizationId!
        });

        toastService.success('Ordner in Root verschoben');

      } catch (error) {
        toastService.error('Der Ordner konnte nicht verschoben werden');
      } finally {
        setMoving(false);
        setDraggedFolder(null);
      }
      return;
    }

    let assetsToMove: string[] = [];

    if (selectedAssets.size > 0) {
      assetsToMove = Array.from(selectedAssets);
    } else if (draggedAsset?.id) {
      assetsToMove = [draggedAsset.id];
    }

    if (assetsToMove.length === 0 || !organizationId) return;

    const currentAssets = mediaAssets.filter(asset =>
      assetsToMove.includes(asset.id!) && asset.folderId
    );

    if (currentAssets.length === 0) return;

    const count = currentAssets.length;

    try {
      setMoving(true);

      // React Query Mutations - auto invalidate queries
      if (count > 1) {
        await Promise.all(
          currentAssets.map(asset =>
            moveAssetMutation.mutateAsync({
              assetId: asset.id!,
              newFolderId: undefined,
              organizationId
            })
          )
        );
        clearSelection();
      } else {
        await moveAssetMutation.mutateAsync({
          assetId: currentAssets[0].id!,
          newFolderId: undefined,
          organizationId
        });
      }

      toastService.success(`${count} ${count === 1 ? 'Datei' : 'Dateien'} in Root verschoben`);

    } catch (error) {
      toastService.error('Die Dateien konnten nicht verschoben werden');
    } finally {
      setMoving(false);
      setDraggedAsset(null);
    }
  }, [selectedAssets, draggedAsset, organizationId, mediaAssets, moveFolderMutation, moveAssetMutation, clearSelection]);

  // BREADCRUMB DROP HANDLER - für Drag & Drop auf Parent-Ordner
  const handleBreadcrumbDrop = useCallback(async (targetFolderId: string | undefined, e: React.DragEvent) => {
    // Verhindern, dass man auf den aktuellen Ordner droppt
    if (targetFolderId === currentFolderId) return;

    const dragData = e.dataTransfer.getData('text/plain');

    // Ordner verschieben
    if (dragData.startsWith('folder:')) {
      const folderId = dragData.replace('folder:', '');

      try {
        setMoving(true);

        await moveFolderMutation.mutateAsync({
          folderId,
          newParentId: targetFolderId,
          organizationId: organizationId!
        });

        const targetName = targetFolderId
          ? allFolders.find(f => f.id === targetFolderId)?.name || 'Ordner'
          : 'Root';
        toastService.success(`Ordner nach "${targetName}" verschoben`);

      } catch (error) {
        toastService.error('Der Ordner konnte nicht verschoben werden');
      } finally {
        setMoving(false);
        setDraggedFolder(null);
      }
      return;
    }

    // Assets verschieben
    let assetsToMove: string[] = [];

    if (selectedAssets.size > 0) {
      assetsToMove = Array.from(selectedAssets);
    } else if (draggedAsset?.id) {
      assetsToMove = [draggedAsset.id];
    }

    if (assetsToMove.length === 0 || !organizationId) return;

    const count = assetsToMove.length;

    try {
      setMoving(true);

      if (count > 1) {
        await handleBulkMove(targetFolderId);
      } else {
        await moveAssetMutation.mutateAsync({
          assetId: assetsToMove[0],
          newFolderId: targetFolderId,
          organizationId
        });

        const targetName = targetFolderId
          ? allFolders.find(f => f.id === targetFolderId)?.name || 'Ordner'
          : 'Root';
        toastService.success(`Datei nach "${targetName}" verschoben`);
      }

    } catch (error) {
      toastService.error('Die Dateien konnten nicht verschoben werden');
    } finally {
      setMoving(false);
      setDraggedAsset(null);
    }
  }, [currentFolderId, selectedAssets, draggedAsset, organizationId, allFolders, moveFolderMutation, moveAssetMutation, handleBulkMove]);

  // Existing handlers
  const handleCreateFolder = useCallback(() => {
    setEditingFolder(undefined);
    setShowFolderModal(true);
  }, []);

  const handleEditFolder = useCallback((folder: MediaFolder) => {
    setEditingFolder(folder);
    setShowFolderModal(true);
  }, []);

  const handleSaveFolder = useCallback(async (folderData: Omit<MediaFolder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!organizationId || !currentUserId) return;

    try {
      if (editingFolder) {
        // React Query Mutation - auto invalidates queries
        await updateFolderMutation.mutateAsync({
          folderId: editingFolder.id!,
          updates: folderData,
          organizationId
        });
      } else {
        // React Query Mutation - auto invalidates queries
        await createFolderMutation.mutateAsync({
          folder: {
            ...folderData,
            userId: organizationId, // For compatibility
            parentFolderId: currentFolderId,
          },
          context: {
            organizationId,
            userId: currentUserId
          }
        });
      }
      toastService.success(editingFolder ? 'Ordner aktualisiert' : 'Ordner erstellt');
    } catch (error) {
      throw error;
    }
  }, [editingFolder, organizationId, currentUserId, currentFolderId, updateFolderMutation, createFolderMutation]);

  const handleDeleteFolder = useCallback(async (folder: MediaFolder) => {
    setConfirmDialog({
      isOpen: true,
      title: t('confirmDialog.deleteFolder.title'),
      message: t('confirmDialog.deleteFolder.message', { name: folder.name }),
      type: 'danger',
      onConfirm: async () => {
        try {
          // React Query Mutation - auto invalidates queries
          await deleteFolderMutation.mutateAsync({
            folderId: folder.id!,
            organizationId: organizationId ?? undefined
          });
          toastService.success('Ordner gelöscht');
        } catch (error) {
          toastService.error('Der Ordner konnte nicht gelöscht werden. Stellen Sie sicher, dass er leer ist');
        }
      }
    });
  }, [deleteFolderMutation, organizationId, t]);

  const handleOpenFolder = useCallback((folder: MediaFolder) => {
    setCurrentFolderId(folder.id);
    setCurrentPage(1);
  }, []);

  const handleNavigateToFolder = useCallback((folderId?: string) => {
    setCurrentFolderId(folderId);
    setCurrentPage(1);
  }, []);

  const handleShareFolder = useCallback((folder: MediaFolder) => {
    setSharingTarget({ target: folder, type: 'folder' });
    setShowShareModal(true);
  }, []);

  const handleShareAsset = useCallback((asset: MediaAsset) => {
    setSharingTarget({ target: asset, type: 'file' });
    setShowShareModal(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShowShareModal(false);
    setSharingTarget(null);
  }, []);

  const handleDeleteAsset = useCallback(async (asset: MediaAsset) => {
    setConfirmDialog({
      isOpen: true,
      title: t('confirmDialog.deleteFile.title'),
      message: t('confirmDialog.deleteFile.message', { name: asset.fileName }),
      type: 'danger',
      onConfirm: async () => {
        try {
          // React Query Mutation - auto invalidates queries
          await deleteAssetMutation.mutateAsync({
            asset,
            organizationId: organizationId ?? undefined
          });
          toastService.success('Datei gelöscht');
        } catch(error) {
          toastService.error('Die Datei konnte nicht gelöscht werden');
        }
      }
    });
  }, [deleteAssetMutation, organizationId, t]);

  // Asset-Details Handlers
  const handleEditAsset = useCallback((asset: MediaAsset) => {
    setEditingAsset(asset);
    setShowAssetDetailsModal(true);
  }, []);

  const handleCloseAssetDetailsModal = useCallback(() => {
    setShowAssetDetailsModal(false);
    setEditingAsset(undefined);
  }, []);

  // Upload Modal Handlers
  const handleUploadModalOpen = useCallback(() => {
    setShowUploadModal(true);
  }, []);

  const handleUploadModalClose = useCallback(() => {
    setShowUploadModal(false);
  }, []);

  const handleUploadSuccess = useCallback(async () => {
    // ✅ React Query Hook invalidiert automatisch - kein manuelles Refresh nötig
  }, []);

  // Reset page when debounced search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Helper Functions
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCurrentFolderName = useCallback(() => {
    if (!currentFolderId) return undefined;
    if (breadcrumbs.length > 0) {
      return breadcrumbs[breadcrumbs.length - 1]?.name;
    }
    const currentFolder = folders.find(f => f.id === currentFolderId);
    return currentFolder?.name;
  }, [currentFolderId, breadcrumbs, folders]);

  const getAssetTooltip = useCallback((asset: MediaAsset) => {
    let tooltip = asset.fileName;

    const fileExt = asset.fileType?.split('/')[1]?.toUpperCase() || 'Datei';
    tooltip += `\n\nTyp: ${fileExt}`;

    if (asset.createdAt) {
      const date = new Date(asset.createdAt.seconds * 1000).toLocaleDateString('de-DE');
      tooltip += `\nErstellt: ${date}`;
    }

    if (asset.description) {
      tooltip += `\n\nBeschreibung: ${asset.description}`;
    }

    return tooltip;
  }, []);



  const totalItems = useMemo(() => filteredFolders.length + filteredAssets.length, [filteredFolders, filteredAssets]);

  if (loading) {
    return <LoadingSpinner message={t('loading')} />;
  }

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <Text className="text-gray-600">{t('noOrganization')}</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Moving Indicator */}
      {moving && (
        <div className="fixed top-4 right-4 bg-[#005fab] text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {draggedFolder
            ? t('moving.folder')
            : selectedAssets.size > 1
              ? t('moving.files', { count: selectedAssets.size })
              : t('moving.file')
          }
        </div>
      )}

      {/* Toolbar */}
      <MediaToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedAssetsCount={selectedAssets.size}
        foldersCount={filteredFolders.length}
        assetsCount={filteredAssets.length}
        onCreateFolder={handleCreateFolder}
        onUpload={handleUploadModalOpen}
        onSelectAll={selectAllAssets}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        disabled={draggedFolder !== null || !organizationId}
      />

      {/* Breadcrumb Navigation - unter Toolbar, näher an Dateien */}
      {breadcrumbs.length > 0 && (
        <div className="mt-4 mb-4">
          <BreadcrumbNavigation
            breadcrumbs={breadcrumbs}
            onNavigate={handleNavigateToFolder}
            onBreadcrumbDrop={handleBreadcrumbDrop}
          />
        </div>
      )}

      {/* Content */}
      <div className="mt-8">
        {totalItems === 0 ? (
          <EmptyState
            isInFolder={!!currentFolderId}
            onCreateFolder={handleCreateFolder}
            onUpload={handleUploadModalOpen}
          />
        ) : (
          <div className="bg-white rounded-lg border">
            <div className="p-6">
              {viewMode === 'grid' ? (
                <MediaGridView
                  folders={filteredFolders}
                  assets={paginatedAssets}
                  selectedAssets={selectedAssets}
                  isSelectionMode={isSelectionMode}
                  draggedAsset={draggedAsset}
                  draggedFolder={draggedFolder}
                  dragOverFolder={dragOverFolder}
                  currentFolderId={currentFolderId}
                  getAssetTooltip={getAssetTooltip}
                  handleAssetDragStart={handleAssetDragStart}
                  handleAssetDragEnd={handleAssetDragEnd}
                  toggleAssetSelection={toggleAssetSelection}
                  setIsSelectionMode={setIsSelectionMode}
                  handleEditAsset={handleEditAsset}
                  handleShareAsset={handleShareAsset}
                  handleDeleteAsset={handleDeleteAsset}
                  handleOpenFolder={handleOpenFolder}
                  handleEditFolder={handleEditFolder}
                  handleDeleteFolder={handleDeleteFolder}
                  handleShareFolder={handleShareFolder}
                  handleFolderDragOver={handleFolderDragOver}
                  handleFolderDragLeave={handleFolderDragLeave}
                  handleFolderDrop={handleFolderDrop}
                  handleFolderMove={handleFolderMove}
                  handleFolderDragStart={handleFolderDragStart}
                  handleFolderDragEnd={handleFolderDragEnd}
                  handleRootDrop={handleRootDrop}
                />
              ) : (
                <MediaListView
                  folders={filteredFolders}
                  assets={paginatedAssets}
                  selectedAssets={selectedAssets}
                  isSelectionMode={isSelectionMode}
                  toggleAssetSelection={toggleAssetSelection}
                  setIsSelectionMode={setIsSelectionMode}
                  selectAllAssets={selectAllAssets}
                  clearSelection={clearSelection}
                  handleOpenFolder={handleOpenFolder}
                  handleEditFolder={handleEditFolder}
                  handleShareFolder={handleShareFolder}
                  handleDeleteFolder={handleDeleteFolder}
                  handleEditAsset={handleEditAsset}
                  handleShareAsset={handleShareAsset}
                  handleDeleteAsset={handleDeleteAsset}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {viewMode === 'list' && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Modals - Only render when organizationId is available */}
      {showUploadModal && organizationId && currentUserId && (
        <UploadModal
          onClose={handleUploadModalClose}
          onUploadSuccess={handleUploadSuccess}
          currentFolderId={currentFolderId}
          folderName={getCurrentFolderName()}
          organizationId={organizationId}
          userId={currentUserId}
        />
      )}
      
      {showFolderModal && organizationId && (
        <FolderModal
          folder={editingFolder}
          parentFolderId={currentFolderId}
          allFolders={allFolders}
          organizationId={organizationId}
          onClose={() => {
            setShowFolderModal(false);
            setEditingFolder(undefined);
          }}
          onSave={handleSaveFolder}
        />
      )}

      {showShareModal && sharingTarget && organizationId && currentUserId && (
        <ShareModal
          target={sharingTarget.target}
          type={sharingTarget.type}
          onClose={handleCloseShareModal}
          onSuccess={() => {}} // React Query auto-invalidates queries
          organizationId={organizationId}
          userId={currentUserId}
        />
      )}

      {showAssetDetailsModal && editingAsset && organizationId && (
        <AssetDetailsModal
          asset={editingAsset}
          currentFolder={getAssetFolder(editingAsset)}
          allFolders={allFolders}
          organizationId={organizationId}
          onClose={handleCloseAssetDetailsModal}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}