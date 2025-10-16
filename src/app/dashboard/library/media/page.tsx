// src/app/dashboard/pr-tools/media-library/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCrmData } from "@/context/CrmDataContext";
import { useOrganization } from "@/context/OrganizationContext";
import { mediaService } from "@/lib/firebase/media-service";
import { smartUploadRouter } from "@/lib/firebase/smart-upload-router";
import { mediaLibraryContextBuilder } from "./utils/context-builder";
import { getMediaLibraryFeatureFlags, shouldUseSmartRouter } from "./config/feature-flags";
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
  const { user } = useAuth();
  const { companies } = useCrmData();
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
  
  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAssetDetailsModal, setShowAssetDetailsModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MediaFolder | undefined>(undefined);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | undefined>(undefined);
  const [sharingTarget, setSharingTarget] = useState<{target: MediaFolder | MediaAsset, type: 'folder' | 'file'} | null>(null);

  // Upload-spezifische States
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>(undefined);
  
  // Smart Router Feature Flag aus Konfiguration
  const [featureFlags] = useState(() => getMediaLibraryFeatureFlags());
  const useSmartRouterEnabled = shouldUseSmartRouter();

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
  const getAssetFolder = (asset: MediaAsset): MediaFolder | undefined => {
    if (!asset.folderId) return undefined;
    return allFolders.find(f => f.id === asset.folderId);
  };

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

  // URL-Parameter Handler
  useEffect(() => {
    const uploadFor = searchParams.get('uploadFor');
    
    if (uploadFor && companies.length > 0) {
      const company = companies.find(c => c.id === uploadFor);
      if (company) {
        setPreselectedClientId(uploadFor);
        setShowUploadModal(true);
        
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('uploadFor');
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
      }
    }
  }, [searchParams, companies, router]);

  // ✅ React Query: No manual loadData() needed - queries auto-fetch and cache

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

  const handleFolderDragStart = (folder: MediaFolder) => {
    setDraggedFolder(folder);
  };

  const handleFolderDragEnd = () => {
    setDraggedFolder(null);
    setDragOverFolder(null);
  };

  // BULK SELECTION HANDLERS
  const toggleAssetSelection = (assetId: string) => {
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
  };

  const selectAllAssets = () => {
    const visibleAssetIds = new Set(paginatedAssets.map(asset => asset.id!));
    setSelectedAssets(visibleAssetIds);
    setIsSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedAssets(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedAssets.size === 0) return;

    const count = selectedAssets.size;

    setConfirmDialog({
      isOpen: true,
      title: `${count} ${count === 1 ? 'Datei' : 'Dateien'} löschen`,
      message: `Möchten Sie wirklich ${count} ${count === 1 ? 'Datei' : 'Dateien'} unwiderruflich löschen?`,
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
  };

  const handleBulkMove = async (targetFolderId?: string) => {
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
  };

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
  const handleAssetDragStart = (e: React.DragEvent, asset: MediaAsset) => {
    if (selectedAssets.has(asset.id!) && selectedAssets.size > 1) {
      setDraggedAsset(null);
    } else {
      setDraggedAsset(asset);
    }
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', asset.id || '');
  };

  const handleAssetDragEnd = () => {
    setDraggedAsset(null);
    setDragOverFolder(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolder(folderId);
  };

  const handleFolderDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleFolderDrop = async (e: React.DragEvent, targetFolder: MediaFolder) => {
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
  };

  // ROOT DROP HANDLER
  const handleRootDrop = async (e: React.DragEvent) => {
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
  };

  // Existing handlers
  const handleCreateFolder = () => {
    setEditingFolder(undefined);
    setShowFolderModal(true);
  };

  const handleEditFolder = (folder: MediaFolder) => {
    setEditingFolder(folder);
    setShowFolderModal(true);
  };

  const handleSaveFolder = async (folderData: Omit<MediaFolder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
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
  };

  const handleDeleteFolder = async (folder: MediaFolder) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Ordner löschen',
      message: `Möchten Sie den Ordner "${folder.name}" wirklich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          // React Query Mutation - auto invalidates queries
          await deleteFolderMutation.mutateAsync({
            folderId: folder.id!,
            organizationId
          });
          toastService.success('Ordner gelöscht');
        } catch (error) {
          toastService.error('Der Ordner konnte nicht gelöscht werden. Stellen Sie sicher, dass er leer ist');
        }
      }
    });
  };

  const handleOpenFolder = (folder: MediaFolder) => {
    setCurrentFolderId(folder.id);
    setCurrentPage(1);
  };

  const handleNavigateToFolder = (folderId?: string) => {
    setCurrentFolderId(folderId);
    setCurrentPage(1);
  };

  const handleShareFolder = (folder: MediaFolder) => {
    setSharingTarget({ target: folder, type: 'folder' });
    setShowShareModal(true);
  };

  const handleShareAsset = (asset: MediaAsset) => {
    setSharingTarget({ target: asset, type: 'file' });
    setShowShareModal(true);
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setSharingTarget(null);
  };

  const handleDeleteAsset = async (asset: MediaAsset) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Datei löschen',
      message: `Möchten Sie die Datei "${asset.fileName}" wirklich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          // React Query Mutation - auto invalidates queries
          await deleteAssetMutation.mutateAsync({
            asset,
            organizationId
          });
          toastService.success('Datei gelöscht');
        } catch(error) {
          toastService.error('Die Datei konnte nicht gelöscht werden');
        }
      }
    });
  };

  // Asset-Details Handlers
  const handleEditAsset = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setShowAssetDetailsModal(true);
  };

  const handleCloseAssetDetailsModal = () => {
    setShowAssetDetailsModal(false);
    setEditingAsset(undefined);
  };

  // Upload Modal Handlers
  const handleUploadModalOpen = () => {
    setPreselectedClientId(undefined);
    setShowUploadModal(true);
  };

  const handleUploadModalClose = () => {
    setShowUploadModal(false);
    setPreselectedClientId(undefined);
  };

  // Filtered assets and folders based on search
  const filteredFolders = useMemo(() => {
    if (!searchTerm) return folders;
    return folders.filter(folder => 
      folder.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [folders, searchTerm]);

  const filteredAssets = useMemo(() => {
    if (!searchTerm) return mediaAssets;
    return mediaAssets.filter(asset => 
      asset.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [mediaAssets, searchTerm]);

  // Paginated Data
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAssets, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Helper Functions
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCurrentFolderName = () => {
    if (!currentFolderId) return undefined;
    if (breadcrumbs.length > 0) {
      return breadcrumbs[breadcrumbs.length - 1]?.name;
    }
    const currentFolder = folders.find(f => f.id === currentFolderId);
    return currentFolder?.name;
  };

  const getAssetTooltip = (asset: MediaAsset) => {
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
    
    const company = asset.clientId ? companies.find(c => c.id === asset.clientId) : null;
    if (company) {
      tooltip += `\nKunde: ${company.name}`;
    }
    
    return tooltip;
  };



  const totalItems = filteredFolders.length + filteredAssets.length;

  if (loading) {
    return <LoadingSpinner message="Lade Mediathek..." />;
  }

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <Text className="text-gray-600">Keine Organisation gefunden</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Moving Indicator */}
      {moving && (
        <div className="fixed top-4 right-4 bg-[#005fab] text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {draggedFolder ? 'Ordner wird' : selectedAssets.size > 1 ? `${selectedAssets.size} Dateien werden` : 'Datei wird'} verschoben...
        </div>
      )}

      {/* Breadcrumb Navigation */}
      {breadcrumbs.length > 0 && (
        <div className="mb-6">
          <BreadcrumbNavigation
            breadcrumbs={breadcrumbs}
            onNavigate={handleNavigateToFolder}
          />
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
                  companies={companies}
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
                  companies={companies}
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

      {/* Smart Router Status Badge (Development) */}
      {process.env.NODE_ENV === 'development' && featureFlags.SMART_ROUTER_LOGGING && (
        <div className="fixed bottom-4 left-4 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              useSmartRouterEnabled ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span>Smart Router: {useSmartRouterEnabled ? 'Aktiv' : 'Deaktiviert'}</span>
          </div>
        </div>
      )}

      {/* Modals - Only render when organizationId is available */}
      {showUploadModal && organizationId && currentUserId && (
        <UploadModal
          onClose={handleUploadModalClose}
          onUploadSuccess={() => {}} // React Query auto-invalidates queries
          currentFolderId={currentFolderId}
          folderName={getCurrentFolderName()}
          preselectedClientId={preselectedClientId}
          organizationId={organizationId}
          userId={currentUserId}
        />
      )}
      
      {showFolderModal && (
        <FolderModal 
          folder={editingFolder}
          parentFolderId={currentFolderId}
          allFolders={allFolders}
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

      {showAssetDetailsModal && editingAsset && (
        <AssetDetailsModal
          asset={editingAsset}
          currentFolder={getAssetFolder(editingAsset)}
          allFolders={allFolders}
          onClose={handleCloseAssetDetailsModal}
          onSave={() => {}} // React Query auto-invalidates queries
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