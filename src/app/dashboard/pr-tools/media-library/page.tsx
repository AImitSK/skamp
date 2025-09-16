// src/app/dashboard/pr-tools/media-library/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCrmData } from "@/context/CrmDataContext";
import { mediaService } from "@/lib/firebase/media-service";
import { smartUploadRouter } from "@/lib/firebase/smart-upload-router";
import { mediaLibraryContextBuilder } from "./utils/context-builder";
import { getMediaLibraryFeatureFlags, shouldUseSmartRouter } from "./config/feature-flags";
import { MediaAsset, MediaFolder, FolderBreadcrumb } from "@/types/media";
import { teamMemberService } from "@/lib/firebase/organization-service";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { 
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownDivider
} from "@/components/ui/dropdown";
import { 
  PlusIcon, 
  PhotoIcon, 
  Squares2X2Icon,
  ListBulletIcon,
  EyeIcon,
  TrashIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  FolderPlusIcon,
  ShareIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  FolderIcon
} from "@heroicons/react/24/outline";
import Link from 'next/link';
import UploadModal from "./UploadModal";
import FolderCard from "@/components/mediathek/FolderCard";
import BreadcrumbNavigation from "@/components/mediathek/BreadcrumbNavigation";
import FolderModal from "@/components/mediathek/FolderModal";
import ShareModal from "@/components/mediathek/ShareModal";
import AssetDetailsModal from "@/components/mediathek/AssetDetailsModal";

type ViewMode = 'grid' | 'list';

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message, 
  action 
}: { 
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    error: ExclamationTriangleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'info' || type === 'success' ? 'text-blue-400' : type === 'warning' ? 'text-yellow-400' : 'text-red-400'}`} />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>
            {message && <Text className={`mt-2 ${styles[type].split(' ')[1]}`}>{message}</Text>}
          </div>
          {action && (
            <p className="mt-3 text-sm md:mt-0 md:ml-6">
              <button
                onClick={action.onClick}
                className={`font-medium whitespace-nowrap ${styles[type].split(' ')[1]} hover:opacity-80`}
              >
                {action.label}
                <span aria-hidden="true"> →</span>
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MediathekPage() {
  const { user } = useAuth();
  const { companies } = useCrmData();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Multi-Tenancy State
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [allFolders, setAllFolders] = useState<MediaFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderBreadcrumb[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Alert State
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);

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

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  // Get asset's folder
  const getAssetFolder = (asset: MediaAsset): MediaFolder | undefined => {
    if (!asset.folderId) return undefined;
    return allFolders.find(f => f.id === asset.folderId);
  };

  // === MULTI-TENANCY INITIALIZATION ===
  useEffect(() => {
    async function initializeOrganization() {
      if (!user) return;

      try {
        const orgs = await teamMemberService.getUserOrganizations(user.uid);

        if (orgs.length > 0) {
          // ✅ Verwende echte OrganizationId
          setOrganizationId(orgs[0].organization.id);
          setCurrentUserId(user.uid);
          console.log('🏢 Media Library verwendet OrganizationId:', orgs[0].organization.id);
        } else {
          // ⚠️ Fallback für Legacy-User - verwende user.uid als Organization
          setOrganizationId(user.uid);
          setCurrentUserId(user.uid);
          console.log('👤 Media Library Fallback - User als Organization:', user.uid);
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden der Organizations:', error);
        // Fallback
        setOrganizationId(user.uid);
        setCurrentUserId(user.uid);
        console.log('🔧 Media Library Fallback nach Fehler - User als Organization:', user.uid);
      }
    }

    initializeOrganization();
  }, [user]);

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

  useEffect(() => {
    if (organizationId) {
      loadData();
    }
  }, [organizationId, currentFolderId]);

  const loadData = async () => {
    if (!organizationId) {
      return;
    }
    
    setLoading(true);
    
    try {
      const [foldersData, assetsData] = await Promise.all([
        mediaService.getFolders(organizationId, currentFolderId),
        mediaService.getMediaAssets(organizationId, currentFolderId)
      ]);
      
      setFolders(foldersData);
      setMediaAssets(assetsData);
      
      let allFoldersWithParent = foldersData;
      if (currentFolderId) {
        const currentFolder = await mediaService.getFolder(currentFolderId);
        if (currentFolder) {
          allFoldersWithParent = [...foldersData, currentFolder];
        }
      }
      setAllFolders(allFoldersWithParent);
      
      if (currentFolderId) {
        const breadcrumbsData = await mediaService.getBreadcrumbs(currentFolderId);
        setBreadcrumbs(breadcrumbsData);
      } else {
        setBreadcrumbs([]);
      }
    } catch (error) {
      showAlert('error', 'Fehler beim Laden', 'Die Mediathek konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // FOLDER DRAG & DROP HANDLERS
  const handleFolderMove = useCallback(async (folderId: string, targetFolderId: string) => {
    if (!organizationId) return;
    
    try {
      setMoving(true);
      setDragOverFolder(null);
      setDraggedFolder(null);
      
      await mediaService.updateFolder(folderId, {
        parentFolderId: targetFolderId
      });
      
      await mediaService.updateFolderClientInheritance(folderId, organizationId);
      await loadData();
      
      showAlert('success', 'Ordner verschoben');
      
    } catch (error) {
      showAlert('error', 'Fehler beim Verschieben', 'Der Ordner konnte nicht verschoben werden.');
    } finally {
      setMoving(false);
      setDraggedFolder(null);
      setDragOverFolder(null);
    }
  }, [organizationId]);

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
          
          await Promise.all(
            assetsToDelete.map(asset => mediaService.deleteMediaAsset(asset))
          );
          
          clearSelection();
          await loadData();
          showAlert('success', `${count} ${count === 1 ? 'Datei' : 'Dateien'} gelöscht`);
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen', 'Die Dateien konnten nicht gelöscht werden.');
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
      
      await Promise.all(
        Array.from(selectedAssets).map(assetId => 
          mediaService.moveAssetToFolder(assetId, targetFolderId, organizationId)
        )
      );
      
      clearSelection();
      await loadData();
      showAlert('success', 'Dateien verschoben');
    } catch (error) {
      showAlert('error', 'Fehler beim Verschieben', 'Die Dateien konnten nicht verschoben werden.');
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
        await mediaService.moveAssetToFolder(assetsToMove[0], targetFolder.id, organizationId);
        await loadData();
        showAlert('success', 'Datei verschoben');
      }
      
    } catch (error) {
      showAlert('error', 'Fehler beim Verschieben', 'Die Dateien konnten nicht verschoben werden.');
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
        
        await mediaService.updateFolder(folderId, {
          parentFolderId: undefined
        });
        
        if (organizationId) {
          await mediaService.updateFolderClientInheritance(folderId, organizationId);
        }
        await loadData();
        showAlert('success', 'Ordner in Root verschoben');
        
      } catch (error) {
        showAlert('error', 'Fehler beim Verschieben', 'Der Ordner konnte nicht verschoben werden.');
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
      
      if (count > 1) {
        await Promise.all(
          currentAssets.map(asset => 
            mediaService.moveAssetToFolder(asset.id!, undefined, organizationId)
          )
        );
        clearSelection();
      } else {
        await mediaService.moveAssetToFolder(currentAssets[0].id!, undefined, organizationId);
      }
      
      await loadData();
      showAlert('success', `${count} ${count === 1 ? 'Datei' : 'Dateien'} in Root verschoben`);
      
    } catch (error) {
      showAlert('error', 'Fehler beim Verschieben', 'Die Dateien konnten nicht verschoben werden.');
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
        await mediaService.updateFolder(editingFolder.id!, folderData);
      } else {
        await mediaService.createFolder({
          ...folderData,
          userId: organizationId, // For compatibility
          parentFolderId: currentFolderId,
        }, {
          organizationId,
          userId: currentUserId
        });
      }
      await loadData();
      showAlert('success', editingFolder ? 'Ordner aktualisiert' : 'Ordner erstellt');
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
          await mediaService.deleteFolder(folder.id!);
          await loadData();
          showAlert('success', 'Ordner gelöscht');
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen', 'Der Ordner konnte nicht gelöscht werden. Stellen Sie sicher, dass er leer ist.');
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
          await mediaService.deleteMediaAsset(asset);
          await loadData();
          showAlert('success', 'Datei gelöscht');
        } catch(error) {
          showAlert('error', 'Fehler beim Löschen', 'Die Datei konnte nicht gelöscht werden.');
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return PhotoIcon;
    } else if (fileType.startsWith('video/')) {
      return VideoCameraIcon;
    } else if (fileType.includes('pdf') || fileType.includes('document')) {
      return DocumentTextIcon;
    } else {
      return DocumentTextIcon;
    }
  };

  const getAssetTooltip = (asset: MediaAsset) => {
    let tooltip = asset.fileName;
    
    const fileExt = asset.fileType.split('/')[1]?.toUpperCase() || 'Datei';
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

  const renderGridView = () => (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
      onDragOver={(draggedAsset || selectedAssets.size > 0 || draggedFolder) && !currentFolderId ? (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } : undefined}
      onDrop={(draggedAsset || selectedAssets.size > 0 || draggedFolder) && !currentFolderId ? handleRootDrop : undefined}
    >
      {/* Render Folders First */}
      {filteredFolders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          onOpen={handleOpenFolder}
          onEdit={handleEditFolder}
          onDelete={handleDeleteFolder}
          onShare={handleShareFolder}
          fileCount={0}
          isDragOver={dragOverFolder === folder.id}
          onDragOver={(e: React.DragEvent) => handleFolderDragOver(e, folder.id!)}
          onDragLeave={handleFolderDragLeave}
          onDrop={(e: React.DragEvent) => handleFolderDrop(e, folder)}
          onFolderMove={handleFolderMove}
          onFolderDragStart={handleFolderDragStart}
          onFolderDragEnd={handleFolderDragEnd}
        />
      ))}
      
      {/* Render Media Assets */}
      {paginatedAssets.map((asset) => {
        const FileIcon = getFileIcon(asset.fileType);
        const isSelected = selectedAssets.has(asset.id!);
        const isDragging = draggedAsset?.id === asset.id || (selectedAssets.has(asset.id!) && selectedAssets.size > 1);
        
        return (
          <div 
            key={asset.id} 
            className={`group relative bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
              isDragging ? 'opacity-50 scale-95' : ''
            } ${
              isSelected ? 'border-[#005fab] bg-blue-50' : 'border-gray-200'
            }`}
            draggable={true}
            onDragStart={(e: React.DragEvent) => handleAssetDragStart(e, asset)}
            onDragEnd={handleAssetDragEnd}
            onClick={(e: React.MouseEvent) => {
              if (isSelectionMode || e.ctrlKey || e.metaKey) {
                e.preventDefault();
                toggleAssetSelection(asset.id!);
                if (!isSelectionMode) setIsSelectionMode(true);
              }
            }}
            title={getAssetTooltip(asset)}
          >
            {/* Selection Checkbox */}
            <div className={`absolute top-2 left-2 z-10 transition-opacity ${
              isSelectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              <label className="cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    e.stopPropagation();
                    toggleAssetSelection(asset.id!);
                    if (!isSelectionMode) setIsSelectionMode(true);
                  }}
                  className="size-4 text-[#005fab] bg-white border-gray-300 rounded focus:ring-[#005fab] focus:ring-2"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                />
              </label>
            </div>

            {/* Multi-Selection Badge */}
            {selectedAssets.has(asset.id!) && selectedAssets.size > 1 && (
              <div className="absolute top-2 right-2 bg-[#005fab] text-white text-xs px-2 py-1 rounded-full">
                {selectedAssets.size}
              </div>
            )}

            {/* Preview */}
            <div className="aspect-square w-full bg-gray-50 flex items-center justify-center relative overflow-hidden">
              {asset.fileType.startsWith('image/') ? (
                <img 
                  src={asset.downloadUrl} 
                  alt={asset.fileName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <FileIcon className="h-16 w-16 text-gray-400" />
              )}
              
              {/* Hover Actions */}
              {!isSelectionMode && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Link href={asset.downloadUrl} target="_blank">
                      <Button color="zinc" className="shadow-lg bg-white p-2">
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* 3-Punkte-Menü */}
              {!isSelectionMode && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Dropdown>
                    <DropdownButton 
                      plain 
                      className="bg-white/90 shadow-sm hover:bg-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005fab]"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end" className="bg-white shadow-lg rounded-lg">
                      <DropdownItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditAsset(asset); }} className="hover:bg-gray-50">
                        <PencilIcon className="h-4 w-4 text-gray-500" />
                        Details bearbeiten
                      </DropdownItem>
                      <DropdownItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleShareAsset(asset); }} className="hover:bg-gray-50">
                        <ShareIcon className="h-4 w-4 text-gray-500" />
                        Teilen
                      </DropdownItem>
                      <DropdownDivider />
                      <DropdownItem 
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteAsset(asset); }}
                        className="hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">Löschen</span>
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 truncate mb-2" title={asset.fileName}>
                {asset.fileName}
              </h3>
              
              {asset.clientId && (
                <div>
                  <Badge color="blue" className="text-xs">
                    {companies.find(c => c.id === asset.clientId)?.name || 'Unbekannter Kunde'}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>
            <Checkbox
              checked={paginatedAssets.length > 0 && paginatedAssets.every(a => selectedAssets.has(a.id!))}
              indeterminate={paginatedAssets.some(a => selectedAssets.has(a.id!)) && !paginatedAssets.every(a => selectedAssets.has(a.id!))}
              onChange={(checked) => {
                if (checked) {
                  selectAllAssets();
                } else {
                  clearSelection();
                }
              }}
            />
          </TableHeader>
          <TableHeader>Name</TableHeader>
          <TableHeader>Typ</TableHeader>
          <TableHeader>Größe</TableHeader>
          <TableHeader>Kunde</TableHeader>
          <TableHeader>Erstellt am</TableHeader>
          <TableHeader>
            <span className="sr-only">Aktionen</span>
          </TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {/* Render Folders First */}
        {filteredFolders.map((folder) => {
          const associatedCompany = folder.clientId 
            ? companies.find(c => c.id === folder.clientId)
            : null;
            
          return (
            <TableRow key={`folder-${folder.id}`} className="hover:bg-gray-50">
              <TableCell>
                <div className="h-4 w-4" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleOpenFolder(folder)}>
                  <FolderIcon className="h-8 w-8" style={{ color: folder.color }} />
                  <div>
                    <div className="font-medium">{folder.name}</div>
                    {folder.description && (
                      <div className="text-sm text-gray-500">{folder.description}</div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>Ordner</TableCell>
              <TableCell>—</TableCell>
              <TableCell>
                {associatedCompany ? (
                  <Badge color="blue" className="text-xs">
                    {associatedCompany.name}
                  </Badge>
                ) : (
                  <Text>—</Text>
                )}
              </TableCell>
              <TableCell>
                {folder.createdAt ? new Date(folder.createdAt.seconds * 1000).toLocaleDateString('de-DE') : '—'}
              </TableCell>
              <TableCell>
                <Dropdown>
                  <DropdownButton plain className="p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005fab]">
                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-700" />
                  </DropdownButton>
                  <DropdownMenu anchor="bottom end" className="bg-white shadow-lg rounded-lg">
                    <DropdownItem onClick={() => handleEditFolder(folder)} className="hover:bg-gray-50">
                      <PencilIcon className="h-4 w-4 text-gray-500" />
                      Bearbeiten
                    </DropdownItem>
                    <DropdownItem onClick={() => handleShareFolder(folder)} className="hover:bg-gray-50">
                      <ShareIcon className="h-4 w-4 text-gray-500" />
                      Teilen
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem onClick={() => handleDeleteFolder(folder)} className="hover:bg-red-50">
                      <TrashIcon className="h-4 w-4 text-red-500" />
                      <span className="text-red-600">Löschen</span>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </TableCell>
            </TableRow>
          );
        })}
        
        {/* Render Media Assets */}
        {paginatedAssets.map((asset) => {
          const associatedCompany = asset.clientId 
            ? companies.find(c => c.id === asset.clientId)
            : null;
          const FileIcon = getFileIcon(asset.fileType);
            
          return (
            <TableRow key={asset.id} className="hover:bg-gray-50">
              <TableCell>
                <Checkbox
                  checked={selectedAssets.has(asset.id!)}
                  onChange={(checked) => {
                    toggleAssetSelection(asset.id!);
                    if (!isSelectionMode && checked) setIsSelectionMode(true);
                  }}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  {asset.fileType.startsWith('image/') ? (
                    <img src={asset.downloadUrl} alt={asset.fileName} className="h-10 w-10 object-cover rounded" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                      <FileIcon className="h-6 w-6 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{asset.fileName}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Text>{asset.fileType.split('/')[1]?.toUpperCase() || 'Datei'}</Text>
              </TableCell>
              <TableCell>
                <Text>—</Text>
              </TableCell>
              <TableCell>
                {associatedCompany ? (
                  <Badge color="blue" className="text-xs">
                    {associatedCompany.name}
                  </Badge>
                ) : (
                  <Text>—</Text>
                )}
              </TableCell>
              <TableCell>
                {asset.createdAt ? new Date(asset.createdAt.seconds * 1000).toLocaleDateString('de-DE') : '—'}
              </TableCell>
              <TableCell>
                <Dropdown>
                  <DropdownButton plain className="p-2 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005fab]">
                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-700" />
                  </DropdownButton>
                  <DropdownMenu anchor="bottom end" className="bg-white shadow-lg rounded-lg">
                    <DropdownItem href={asset.downloadUrl} target="_blank" className="hover:bg-gray-50">
                      <EyeIcon className="h-4 w-4 text-gray-500" />
                      Ansehen
                    </DropdownItem>
                    <DropdownItem onClick={() => handleEditAsset(asset)} className="hover:bg-gray-50">
                      <PencilIcon className="h-4 w-4 text-gray-500" />
                      Details bearbeiten
                    </DropdownItem>
                    <DropdownItem onClick={() => handleShareAsset(asset)} className="hover:bg-gray-50">
                      <ShareIcon className="h-4 w-4 text-gray-500" />
                      Teilen
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem onClick={() => handleDeleteAsset(asset)} className="hover:bg-red-50">
                      <TrashIcon className="h-4 w-4 text-red-500" />
                      <span className="text-red-600">Löschen</span>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const totalItems = filteredFolders.length + filteredAssets.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Mediathek...</Text>
        </div>
      </div>
    );
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
      {/* Alert */}
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} title={alert.title} message={alert.message} />
        </div>
      )}

      {/* Moving Indicator */}
      {moving && (
        <div className="fixed top-4 right-4 bg-[#005fab] text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {draggedFolder ? 'Ordner wird' : selectedAssets.size > 1 ? `${selectedAssets.size} Dateien werden` : 'Datei wird'} verschoben...
        </div>
      )}

      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <Heading level={1}>Mediathek</Heading>
          {draggedAsset && <Text className="mt-1 text-blue-600 font-medium">Datei per Drag & Drop verschieben!</Text>}
          {draggedFolder && <Text className="mt-1 text-purple-600 font-medium">Ordner wird verschoben!</Text>}
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
          <Button 
            onClick={handleCreateFolder}
            disabled={draggedFolder !== null}
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FolderPlusIcon className="h-4 w-4" />
            Ordner anlegen
          </Button>
          <Button 
            onClick={handleUploadModalOpen}
            disabled={draggedFolder !== null || !organizationId}
            className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Dateien hochladen
          </Button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {breadcrumbs.length > 0 && (
        <div className="mt-6">
          <BreadcrumbNavigation 
            breadcrumbs={breadcrumbs}
            onNavigate={handleNavigateToFolder}
          />
        </div>
      )}

      {/* Search and Controls */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400 z-10" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Dateien und Ordner durchsuchen..."
            className="pl-10"
          />
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <Button
            plain
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' 
              ? 'bg-white shadow-sm text-[#005fab]' 
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Squares2X2Icon className="h-4 w-4" />
          </Button>
          <Button
            plain
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' 
              ? 'bg-white shadow-sm text-[#005fab]' 
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ListBulletIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Info and Bulk Actions */}
      <div className="mt-4 flex items-center justify-between">
        <Text>
          {filteredFolders.length} {filteredFolders.length === 1 ? 'Ordner' : 'Ordner'}, {' '}
          {filteredAssets.length} {filteredAssets.length === 1 ? 'Datei' : 'Dateien'}
        </Text>
        
        <div className="flex min-h-10 items-center gap-4">
          {selectedAssets.size > 0 && (
            <>
              <Text>
                {selectedAssets.size} ausgewählt
              </Text>
              <Button plain onClick={selectAllAssets} className="text-[#005fab]">
                Alle auswählen
              </Button>
              <Button plain onClick={clearSelection}>
                Auswahl aufheben
              </Button>
              <Button color="zinc" onClick={handleBulkDelete}>
                <TrashIcon className="h-4 w-4" />
                Löschen
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        {totalItems === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-white">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <Heading level={3} className="mt-2">
              {currentFolderId ? 'Dieser Ordner ist leer' : 'Ihre Mediathek ist leer'}
            </Heading>
            <Text className="mt-1">
              {currentFolderId 
                ? 'Laden Sie Dateien hoch oder erstellen Sie Unterordner.'
                : 'Erstellen Sie Ihren ersten Ordner oder laden Sie Dateien hoch.'
              }
            </Text>
            <div className="mt-6 flex justify-center gap-3">
              <Button plain onClick={handleCreateFolder}>
                <FolderPlusIcon className="h-4 w-4" />
                Ordner erstellen
              </Button>
              <Button onClick={handleUploadModalOpen} className="bg-primary hover:bg-primary-hover text-white whitespace-nowrap">
                <PlusIcon className="h-4 w-4" />
                Dateien hochladen
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <div className="p-6">
              {viewMode === 'grid' ? renderGridView() : renderListView()}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && viewMode === 'list' && (
        <nav className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 sm:px-0 pt-4">
          <div className="-mt-px flex w-0 flex-1">
            <Button
              plain
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Zurück
            </Button>
          </div>
          <div className="hidden md:-mt-px md:flex">
            {(() => {
              const pages = [];
              const maxVisible = 7;
              let start = Math.max(1, currentPage - 3);
              let end = Math.min(totalPages, start + maxVisible - 1);
              
              if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
              }
              
              for (let i = start; i <= end; i++) {
                pages.push(
                  <Button
                    key={i}
                    plain
                    onClick={() => setCurrentPage(i)}
                    className={currentPage === i ? 'font-semibold text-[#005fab]' : ''}
                  >
                    {i}
                  </Button>
                );
              }
              
              return pages;
            })()}
          </div>
          <div className="-mt-px flex w-0 flex-1 justify-end">
            <Button
              plain
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Weiter
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </nav>
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
          onUploadSuccess={loadData}
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
          onSuccess={loadData}
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
          onSave={loadData}
        />
      )}

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      >
        <div className="p-6">
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
              confirmDialog.type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <ExclamationTriangleIcon className={`h-6 w-6 ${
                confirmDialog.type === 'danger' ? 'text-red-600' : 'text-yellow-600'
              }`} />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogBody className="mt-2">
                <Text>{confirmDialog.message}</Text>
              </DialogBody>
            </div>
          </div>
          <DialogActions className="mt-5 sm:mt-4">
            <Button
              plain
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Abbrechen
            </Button>
            <Button
              color={confirmDialog.type === 'danger' ? 'zinc' : 'zinc'}
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
              }}
            >
              {confirmDialog.type === 'danger' ? 'Löschen' : 'Bestätigen'}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </div>
  );
}